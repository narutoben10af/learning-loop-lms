export type PreviewMode = "student" | "teacher";
export type Prediction =
  | "price-down-quantity-up"
  | "price-up-quantity-down"
  | "both-up"
  | "both-down";
export type Shift = -1 | 0 | 1;
export type Confidence = "not-yet" | "nearly" | "can-explain";

export interface ActivityState {
  prediction: Prediction | null;
  firstPrediction: Prediction | null;
  predictionAttempts: number;
  predictionCorrect: boolean;
  supplyShift: Shift;
  demandShift: Shift;
  firstCheckedCurve: "supply" | "demand" | null;
  firstCheckedShift: Shift | null;
  shiftAttempts: number;
  shiftCorrect: boolean;
  explanation: string;
  selfCheck: [boolean, boolean, boolean];
  confidence: Confidence | null;
  submitted: boolean;
  teacherRubric: [boolean, boolean, boolean];
  teacherFeedback: string;
  reviewStatus: "awaiting" | "reviewed" | "returned";
  updatedAt: string;
}

export const initialActivityState: ActivityState = {
  prediction: null,
  firstPrediction: null,
  predictionAttempts: 0,
  predictionCorrect: false,
  supplyShift: 0,
  demandShift: 0,
  firstCheckedCurve: null,
  firstCheckedShift: null,
  shiftAttempts: 0,
  shiftCorrect: false,
  explanation: "",
  selfCheck: [false, false, false],
  confidence: null,
  submitted: false,
  teacherRubric: [false, false, false],
  teacherFeedback: "",
  reviewStatus: "awaiting",
  updatedAt: new Date(0).toISOString(),
};

export type ActivityAction =
  | { type: "choose-prediction"; prediction: Prediction }
  | { type: "check-prediction" }
  | { type: "set-supply-shift"; shift: Shift }
  | {
      type: "set-curve-shift";
      curveId: "supply" | "demand";
      shift: Shift;
    }
  | { type: "check-shift" }
  | { type: "set-explanation"; explanation: string }
  | { type: "toggle-self-check"; index: 0 | 1 | 2 }
  | { type: "set-confidence"; confidence: Confidence }
  | { type: "submit" }
  | { type: "toggle-rubric"; index: 0 | 1 | 2 }
  | { type: "set-teacher-feedback"; feedback: string }
  | { type: "save-review" }
  | { type: "return-for-retry" }
  | { type: "reset" };

function changed(state: ActivityState): ActivityState {
  return { ...state, updatedAt: new Date().toISOString() };
}

function invalidateSubmission(state: ActivityState): ActivityState {
  if (!state.submitted && state.reviewStatus === "awaiting") return state;
  return {
    ...state,
    submitted: false,
    reviewStatus: "awaiting",
    teacherRubric: [false, false, false],
    teacherFeedback: "",
  };
}

export function activityReducer(
  state: ActivityState,
  action: ActivityAction,
): ActivityState {
  switch (action.type) {
    case "choose-prediction":
      return changed({
        ...invalidateSubmission(state),
        prediction: action.prediction,
        predictionCorrect: false,
      });
    case "check-prediction": {
      if (!state.prediction) return state;
      const correct = state.prediction === "price-down-quantity-up";
      return changed({
        ...invalidateSubmission(state),
        firstPrediction: state.firstPrediction ?? state.prediction,
        predictionAttempts: state.predictionAttempts + 1,
        predictionCorrect: correct,
      });
    }
    case "set-supply-shift":
      return changed({
        ...invalidateSubmission(state),
        supplyShift: action.shift,
        shiftCorrect: false,
      });
    case "set-curve-shift":
      return changed({
        ...invalidateSubmission(state),
        [action.curveId === "supply" ? "supplyShift" : "demandShift"]:
          action.shift,
        shiftCorrect: false,
      });
    case "check-shift": {
      const checkedCurve = state.demandShift !== 0 ? "demand" : "supply";
      const checkedShift =
        checkedCurve === "demand" ? state.demandShift : state.supplyShift;
      return changed({
        ...invalidateSubmission(state),
        firstCheckedCurve: state.firstCheckedCurve ?? checkedCurve,
        firstCheckedShift: state.firstCheckedShift ?? checkedShift,
        shiftAttempts: state.shiftAttempts + 1,
        shiftCorrect: state.supplyShift === 1 && state.demandShift === 0,
      });
    }
    case "set-explanation":
      return changed({
        ...invalidateSubmission(state),
        explanation: action.explanation,
      });
    case "toggle-self-check": {
      const selfCheck = [...state.selfCheck] as ActivityState["selfCheck"];
      selfCheck[action.index] = !selfCheck[action.index];
      return changed({ ...invalidateSubmission(state), selfCheck });
    }
    case "set-confidence":
      return changed({
        ...invalidateSubmission(state),
        confidence: action.confidence,
      });
    case "submit":
      if (!canSubmit(state)) return state;
      return changed({
        ...state,
        submitted: true,
        reviewStatus: "awaiting",
        teacherRubric: [false, false, false],
        teacherFeedback: "",
      });
    case "toggle-rubric": {
      if (!state.submitted) return state;
      const teacherRubric = [
        ...state.teacherRubric,
      ] as ActivityState["teacherRubric"];
      teacherRubric[action.index] = !teacherRubric[action.index];
      return changed({ ...state, teacherRubric });
    }
    case "set-teacher-feedback":
      if (!state.submitted) return state;
      return changed({ ...state, teacherFeedback: action.feedback });
    case "save-review":
      if (!state.submitted) return state;
      return changed({ ...state, reviewStatus: "reviewed" });
    case "return-for-retry":
      if (!state.submitted) return state;
      return changed({ ...state, reviewStatus: "returned", submitted: false });
    case "reset":
      return changed(initialActivityState);
  }
}

export function canSubmit(state: ActivityState): boolean {
  return Boolean(
    state.predictionCorrect &&
      state.shiftCorrect &&
      state.explanation.trim().length >= 20 &&
      state.confidence,
  );
}

export function evidenceProgress(state: ActivityState): number {
  return [
    true,
    state.predictionCorrect,
    state.shiftCorrect,
    state.explanation.trim().length >= 20,
    Boolean(state.confidence),
  ].filter(Boolean).length;
}

export function equilibriumForShift(shift: Shift) {
  return equilibriumForShifts(shift, 0);
}

export function equilibriumForShifts(supplyShift: Shift, demandShift: Shift) {
  const quantity = 60 + 20 * supplyShift + 20 * demandShift;
  const price = 6 - 2 * supplyShift + 2 * demandShift;
  return { price, quantity };
}

export const STORAGE_KEY = "learning-loop:economics-demo:v2";
export const LEGACY_STORAGE_KEY = "learning-loop:economics-demo:v1";

const predictionValues: Prediction[] = [
  "price-down-quantity-up",
  "price-up-quantity-down",
  "both-up",
  "both-down",
];
const confidenceValues: Confidence[] = ["not-yet", "nearly", "can-explain"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBooleanTuple(value: unknown): value is [boolean, boolean, boolean] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((item) => typeof item === "boolean")
  );
}

function parseActivityState(value: unknown): ActivityState | null {
  if (!isRecord(value)) return null;
  const nonNegativeInteger = (candidate: unknown) =>
    typeof candidate === "number" &&
    Number.isInteger(candidate) &&
    candidate >= 0;

  if (
    !(
      value.prediction === null ||
      predictionValues.includes(value.prediction as Prediction)
    ) ||
    !(
      value.firstPrediction === null ||
      predictionValues.includes(value.firstPrediction as Prediction)
    ) ||
    !nonNegativeInteger(value.predictionAttempts) ||
    typeof value.predictionCorrect !== "boolean" ||
    !([-1, 0, 1] as unknown[]).includes(value.supplyShift) ||
    !([-1, 0, 1] as unknown[]).includes(value.demandShift) ||
    !([null, "supply", "demand"] as unknown[]).includes(
      value.firstCheckedCurve,
    ) ||
    !(
      value.firstCheckedShift === null ||
      ([-1, 0, 1] as unknown[]).includes(value.firstCheckedShift)
    ) ||
    !nonNegativeInteger(value.shiftAttempts) ||
    typeof value.shiftCorrect !== "boolean" ||
    typeof value.explanation !== "string" ||
    !isBooleanTuple(value.selfCheck) ||
    !(
      value.confidence === null ||
      confidenceValues.includes(value.confidence as Confidence)
    ) ||
    typeof value.submitted !== "boolean" ||
    !isBooleanTuple(value.teacherRubric) ||
    typeof value.teacherFeedback !== "string" ||
    !(["awaiting", "reviewed", "returned"] as unknown[]).includes(
      value.reviewStatus,
    ) ||
    typeof value.updatedAt !== "string" ||
    Number.isNaN(Date.parse(value.updatedAt))
  ) {
    return null;
  }

  return value as unknown as ActivityState;
}

export function loadActivityState(
  storage: Pick<Storage, "getItem">,
): ActivityState {
  try {
    const currentRaw = storage.getItem(STORAGE_KEY);
    const raw = currentRaw ?? storage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return initialActivityState;
    const envelope: unknown = JSON.parse(raw);
    if (!isRecord(envelope)) {
      return initialActivityState;
    }
    if (!currentRaw && envelope.version === 1 && isRecord(envelope.state)) {
      return (
        parseActivityState({
          ...envelope.state,
          demandShift: 0,
          firstCheckedCurve:
            envelope.state.firstCheckedShift === null ? null : "supply",
        }) ?? initialActivityState
      );
    }
    if (envelope.version !== 2) return initialActivityState;
    return parseActivityState(envelope.state) ?? initialActivityState;
  } catch {
    return initialActivityState;
  }
}

export function saveActivityState(
  storage: Pick<Storage, "setItem">,
  state: ActivityState,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, state }));
}
