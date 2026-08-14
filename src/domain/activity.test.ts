import { describe, expect, it } from "vitest";
import {
  activityReducer,
  canSubmit,
  equilibriumForShift,
  initialActivityState,
  loadActivityState,
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

  it("falls back safely when stored state is invalid", () => {
    const storage = {
      getItem: (key: string) => (key === STORAGE_KEY ? "not-json" : null),
    };
    expect(loadActivityState(storage)).toEqual(initialActivityState);
  });
});
