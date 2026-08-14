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

export function activityReducer(
  state: ActivityState,
  action: ActivityAction,
): ActivityState {
  switch (action.type) {
    case "choose-prediction":
      return changed({
        ...state,
        prediction: action.prediction,
        predictionCorrect: false,
      });
    case "check-prediction": {
      if (!state.prediction) return state;
      const correct = state.prediction === "price-down-quantity-up";
      return changed({
        ...state,
        firstPrediction: state.firstPrediction ?? state.prediction,
        predictionAttempts: state.predictionAttempts + 1,
        predictionCorrect: correct,
      });
    }
    case "set-supply-shift":
      return changed({
        ...state,
        supplyShift: action.shift,
        shiftCorrect: false,
      });
    case "check-shift":
      return changed({
        ...state,
        firstCheckedShift: state.firstCheckedShift ?? state.supplyShift,
        shiftAttempts: state.shiftAttempts + 1,
        shiftCorrect: state.supplyShift === 1,
      });
    case "set-explanation":
      return changed({
        ...state,
        explanation: action.explanation,
        submitted: false,
      });
    case "toggle-self-check": {
      const selfCheck = [...state.selfCheck] as ActivityState["selfCheck"];
      selfCheck[action.index] = !selfCheck[action.index];
      return changed({ ...state, selfCheck });
    }
    case "set-confidence":
      return changed({ ...state, confidence: action.confidence });
    case "submit":
      if (!canSubmit(state)) return state;
      return changed({ ...state, submitted: true, reviewStatus: "awaiting" });
    case "toggle-rubric": {
      const teacherRubric = [
        ...state.teacherRubric,
      ] as ActivityState["teacherRubric"];
      teacherRubric[action.index] = !teacherRubric[action.index];
      return changed({ ...state, teacherRubric });
    }
    case "set-teacher-feedback":
      return changed({ ...state, teacherFeedback: action.feedback });
    case "save-review":
      return changed({ ...state, reviewStatus: "reviewed" });
    case "return-for-retry":
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
  if (shift === 1) return { price: 4, quantity: 80 };
  if (shift === -1) return { price: 8, quantity: 40 };
  return { price: 6, quantity: 60 };
}

export const STORAGE_KEY = "learning-loop:economics-demo:v1";

export function loadActivityState(
  storage: Pick<Storage, "getItem">,
): ActivityState {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return initialActivityState;
    return {
      ...initialActivityState,
      ...(JSON.parse(raw) as Partial<ActivityState>),
    };
  } catch {
    return initialActivityState;
  }
}
