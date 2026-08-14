import { describe, expect, it } from "vitest";
import {
  activityReducer,
  canSubmit,
  equilibriumForShift,
  equilibriumForShifts,
  initialActivityState,
  LEGACY_STORAGE_KEY,
  loadActivityState,
  saveActivityState,
  STORAGE_KEY,
} from "./activity";

describe("activity domain", () => {
  it("preserves first prediction evidence across retries", () => {
    let state = activityReducer(initialActivityState, {
      type: "choose-prediction",
      prediction: "both-up",
    });
    state = activityReducer(state, { type: "check-prediction" });
    state = activityReducer(state, {
      type: "choose-prediction",
      prediction: "price-down-quantity-up",
    });
    state = activityReducer(state, { type: "check-prediction" });
    expect(state.firstPrediction).toBe("both-up");
    expect(state.predictionAttempts).toBe(2);
    expect(state.predictionCorrect).toBe(true);
  });

  it("derives equilibrium from the constrained state", () => {
    expect(equilibriumForShift(-1)).toEqual({ price: 8, quantity: 40 });
    expect(equilibriumForShift(0)).toEqual({ price: 6, quantity: 60 });
    expect(equilibriumForShift(1)).toEqual({ price: 4, quantity: 80 });
    expect(equilibriumForShifts(0, 1)).toEqual({ price: 8, quantity: 80 });
  });

  it("requires demonstrated evidence before submission", () => {
    const state = {
      ...initialActivityState,
      predictionCorrect: true,
      shiftCorrect: true,
      explanation: "A sufficiently detailed causal explanation.",
      confidence: "can-explain" as const,
    };
    expect(canSubmit(state)).toBe(true);
    expect(canSubmit({ ...state, shiftCorrect: false })).toBe(false);
  });

  it("invalidates stale submission and review state when an answer changes", () => {
    const reviewed = {
      ...initialActivityState,
      submitted: true,
      reviewStatus: "reviewed" as const,
      teacherRubric: [true, true, true] as [boolean, boolean, boolean],
      teacherFeedback: "Strong causal chain.",
    };
    const changed = activityReducer(reviewed, {
      type: "set-supply-shift",
      shift: -1,
    });
    expect(changed.submitted).toBe(false);
    expect(changed.reviewStatus).toBe("awaiting");
    expect(changed.teacherRubric).toEqual([false, false, false]);
    expect(changed.teacherFeedback).toBe("");
  });

  it("does not allow teacher review actions before submission", () => {
    expect(activityReducer(initialActivityState, { type: "save-review" })).toBe(
      initialActivityState,
    );
  });

  it("falls back safely when stored state is invalid", () => {
    const storage = {
      getItem: (key: string) => (key === STORAGE_KEY ? "not-json" : null),
    };
    expect(loadActivityState(storage)).toEqual(initialActivityState);
  });

  it("round-trips only the current versioned persisted schema", () => {
    let raw = "";
    saveActivityState(
      {
        setItem: (_key: string, value: string) => {
          raw = value;
        },
      },
      initialActivityState,
    );
    expect(loadActivityState({ getItem: () => raw })).toEqual(
      initialActivityState,
    );
  });

  it("migrates the prior supply-only local demo without losing evidence", () => {
    const legacyState: Record<string, unknown> = {
      ...initialActivityState,
      supplyShift: 1 as const,
      firstCheckedShift: 1 as const,
      shiftAttempts: 1,
      shiftCorrect: true,
    };
    delete legacyState.demandShift;
    delete legacyState.firstCheckedCurve;
    const migrated = loadActivityState({
      getItem: (key: string) =>
        key === LEGACY_STORAGE_KEY
          ? JSON.stringify({ version: 1, state: legacyState })
          : null,
    });

    expect(migrated.supplyShift).toBe(1);
    expect(migrated.demandShift).toBe(0);
    expect(migrated.firstCheckedCurve).toBe("supply");
    expect(migrated.shiftCorrect).toBe(true);
  });

  it("rejects valid JSON with malformed fields or a future version", () => {
    const malformed = JSON.stringify({
      version: 2,
      state: { ...initialActivityState, explanation: null },
    });
    const future = JSON.stringify({
      version: 3,
      state: initialActivityState,
    });
    expect(loadActivityState({ getItem: () => malformed })).toEqual(
      initialActivityState,
    );
    expect(loadActivityState({ getItem: () => future })).toEqual(
      initialActivityState,
    );
  });
});
