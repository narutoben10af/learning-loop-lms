import {
  useEffect,
  useReducer,
  useState,
  type CSSProperties,
  type Dispatch,
} from "react";
import {
  activityReducer,
  canSubmit,
  equilibriumForShift,
  evidenceProgress,
  initialActivityState,
  loadActivityState,
  saveActivityState,
  type ActivityAction,
  type ActivityState,
  type Confidence,
  type Prediction,
  type PreviewMode,
  type Shift,
} from "./domain/activity";

const predictionOptions: Array<{ value: Prediction; label: string }> = [
  { value: "price-down-quantity-up", label: "Price falls and quantity rises" },
  { value: "price-up-quantity-down", label: "Price rises and quantity falls" },
  { value: "both-up", label: "Both price and quantity rise" },
  { value: "both-down", label: "Both price and quantity fall" },
];

const confidenceOptions: Array<{ value: Confidence; label: string }> = [
  { value: "not-yet", label: "Not yet" },
  { value: "nearly", label: "Nearly" },
  { value: "can-explain", label: "I can explain it" },
];

const rubricLabels = [
  "I linked lower production costs to an increase in supply.",
  "I said supply shifted right, not demand.",
  "I compared price ($6 to $4) and quantity (60 to 80).",
] as const;

const demoStudents = [
  ["Maya Chen", "Live evidence", "Ready to review", "From activity"],
  ["Alex Morgan", "Submitted", "Demand moved", "Nearly"],
  ["Jordan Lee", "Submitted", "Ready to review", "I can explain it"],
  ["Sam Rivera", "In progress", "Wrong direction", "Not yet"],
  ["Taylor Kim", "Not started", "No evidence yet", "—"],
] as const;

type ActivityProps = {
  state: ActivityState;
  dispatch: Dispatch<ActivityAction>;
};

function PreviewHeader({
  mode,
  setMode,
}: {
  mode: PreviewMode;
  setMode: (mode: PreviewMode) => void;
}) {
  return (
    <header className="app-header">
      <a className="brand" href="#main-content" aria-label="Learning Loop home">
        <span className="brand-mark" aria-hidden="true">
          LL
        </span>
        <span>
          <strong>Learning Loop</strong>
          <small>Economics pilot</small>
        </span>
      </a>
      <div className="preview-wrap">
        <div className="preview-label">
          <strong>Preview as</strong>
          <span>Demo and author review only</span>
        </div>
        <div
          className="segmented"
          role="group"
          aria-label="Preview the demo experience as"
        >
          <button
            type="button"
            aria-pressed={mode === "student"}
            onClick={() => setMode("student")}
          >
            Student activity
          </button>
          <button
            type="button"
            aria-pressed={mode === "teacher"}
            onClick={() => setMode("teacher")}
          >
            Teacher evidence
          </button>
        </div>
        <p className="preview-note">
          Student completes the activity · Teacher reviews evidence and marks
          it. Production accounts never show this switch.
        </p>
      </div>
    </header>
  );
}

function StepProgress({ state }: { state: ActivityState }) {
  const statuses = [
    true,
    state.predictionAttempts > 0,
    state.shiftAttempts > 0,
    state.explanation.trim().length >= 20,
    Boolean(state.confidence),
  ];
  const labels = ["Notice", "Predict", "Test", "Explain", "Reflect"];
  const firstIncomplete = statuses.findIndex((status) => !status);
  const current = firstIncomplete === -1 ? 4 : firstIncomplete;
  return (
    <ol className="step-progress" aria-label="Activity progress">
      {labels.map((label, index) => (
        <li
          key={label}
          aria-current={
            index === current && !statuses[index] ? "step" : undefined
          }
          className={
            statuses[index] ? "complete" : index === current ? "current" : ""
          }
        >
          <span aria-hidden="true">{statuses[index] ? "✓" : index + 1}</span>
          <small>{label}</small>
          <em className="sr-only">
            {statuses[index]
              ? ", complete"
              : index === current
                ? ", current step"
                : ", not started"}
          </em>
        </li>
      ))}
    </ol>
  );
}

function PredictionCard({ state, dispatch }: ActivityProps) {
  return (
    <section className="lesson-card" aria-labelledby="predict-title">
      <div className="card-kicker">02 · Predict</div>
      <h2 id="predict-title">What will happen to equilibrium?</h2>
      <p>When battery-assembly costs fall, what is most likely to happen?</p>
      <fieldset className="choice-list">
        <legend className="sr-only">Choose an equilibrium prediction</legend>
        {predictionOptions.map((option) => (
          <label
            key={option.value}
            className={
              state.prediction === option.value ? "choice selected" : "choice"
            }
          >
            <input
              type="radio"
              name="prediction"
              value={option.value}
              checked={state.prediction === option.value}
              onChange={() =>
                dispatch({
                  type: "choose-prediction",
                  prediction: option.value,
                })
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="action-row">
        <button
          className="button primary"
          type="button"
          disabled={!state.prediction}
          onClick={() => dispatch({ type: "check-prediction" })}
        >
          Check prediction
        </button>
        {state.predictionAttempts > 0 && (
          <span className="attempts">Attempts: {state.predictionAttempts}</span>
        )}
      </div>
      {state.predictionAttempts > 0 && (
        <div
          className={
            state.predictionCorrect ? "feedback correct" : "feedback hint"
          }
          role="status"
        >
          <strong>
            {state.predictionCorrect
              ? "That direction is right."
              : "Think about which side changes first."}
          </strong>
          <p>
            {state.predictionCorrect
              ? "Now test it by shifting the curve that changes when producers face lower costs."
              : state.predictionAttempts === 1
                ? "Lower production costs change what sellers are willing to supply at each price."
                : "Supply shifts right, so equilibrium price falls while equilibrium quantity rises."}
          </p>
        </div>
      )}
    </section>
  );
}

function ShiftCard({ state, dispatch }: ActivityProps) {
  const equilibrium = equilibriumForShift(state.supplyShift);
  const shiftLabel =
    state.supplyShift === 1
      ? "right"
      : state.supplyShift === -1
        ? "left"
        : "unchanged";
  const quantities =
    state.supplyShift === 1
      ? [60, 80, 100, 120, 140]
      : state.supplyShift === -1
        ? [0, 0, 20, 40, 60]
        : [20, 40, 60, 80, 100];
  return (
    <section className="lesson-card feature-card" aria-labelledby="test-title">
      <div className="card-kicker">03 · Test</div>
      <div className="card-heading-row">
        <div>
          <h2 id="test-title">Shift supply to test your prediction</h2>
          <p>
            Choose one constrained position. The visual graph will use this same
            saved state.
          </p>
        </div>
        <button
          className="button quiet"
          type="button"
          onClick={() => dispatch({ type: "set-supply-shift", shift: 0 })}
        >
          Reset
        </button>
      </div>
      <div className="shift-layout">
        <div>
          <fieldset>
            <legend>Supply position</legend>
            <div className="shift-controls">
              {([-1, 0, 1] as Shift[]).map((shift) => (
                <button
                  key={shift}
                  type="button"
                  className={
                    state.supplyShift === shift
                      ? "shift-button active"
                      : "shift-button"
                  }
                  aria-pressed={state.supplyShift === shift}
                  onClick={() => dispatch({ type: "set-supply-shift", shift })}
                >
                  {shift === -1
                    ? "← Shift left"
                    : shift === 0
                      ? "Unchanged"
                      : "Shift right →"}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="equilibrium-callout" aria-live="polite">
            <span>Supply {shiftLabel}</span>
            <strong>
              Price ${equilibrium.price} · Quantity {equilibrium.quantity}
            </strong>
            <small>Before: price $6 · quantity 60 rentals</small>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => dispatch({ type: "check-shift" })}
          >
            Check this shift
          </button>
          {state.shiftAttempts > 0 && (
            <div
              className={
                state.shiftCorrect ? "feedback correct" : "feedback hint"
              }
              role="status"
            >
              <strong>
                {state.shiftCorrect
                  ? "Supply shifted right."
                  : "Revisit the producer clue."}
              </strong>
              <p>
                {state.shiftCorrect
                  ? "Lower costs increase supply. Equilibrium moves from $6 and 60 rentals to $4 and 80 rentals."
                  : state.supplyShift === -1
                    ? "Lower costs make supplying each quantity easier. Would sellers offer less or more?"
                    : "A lower cost changes the whole supply relationship, so unchanged is not the final model."}
              </p>
            </div>
          )}
        </div>
        <div
          className="table-wrap"
          tabIndex={0}
          role="region"
          aria-label="Market schedule after the selected supply shift"
        >
          <table>
            <caption>Active weekly market schedule</caption>
            <thead>
              <tr>
                <th>Price ($)</th>
                <th>Demand</th>
                <th>Supply</th>
              </tr>
            </thead>
            <tbody>
              {[2, 4, 6, 8, 10].map((price, index) => (
                <tr
                  key={price}
                  className={
                    price === equilibrium.price ? "equilibrium-row" : ""
                  }
                >
                  <th scope="row">{price}</th>
                  <td>{100 - index * 20}</td>
                  <td>{quantities[index]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ExplanationCard({ state, dispatch }: ActivityProps) {
  return (
    <section className="lesson-card" aria-labelledby="explain-title">
      <div className="card-kicker">04 · Explain</div>
      <h2 id="explain-title">Make the causal chain visible</h2>
      <label className="field-label" htmlFor="explanation">
        Explain why lower battery-assembly costs shift supply and how this
        changes equilibrium. Use the before-and-after values.
      </label>
      <textarea
        id="explanation"
        value={state.explanation}
        onChange={(event) =>
          dispatch({ type: "set-explanation", explanation: event.target.value })
        }
        rows={5}
        placeholder="Lower production costs mean…"
      />
      <p className="field-note">
        Saved on this device · {state.explanation.trim().length} characters
      </p>
      <fieldset className="self-check">
        <legend>Self-check before review</legend>
        {rubricLabels.map((label, index) => (
          <label key={label}>
            <input
              type="checkbox"
              checked={state.selfCheck[index]}
              onChange={() =>
                dispatch({
                  type: "toggle-self-check",
                  index: index as 0 | 1 | 2,
                })
              }
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}

function ReflectionCard({ state, dispatch }: ActivityProps) {
  const progress = evidenceProgress(state);
  return (
    <section className="lesson-card" aria-labelledby="reflect-title">
      <div className="card-kicker">05 · Reflect</div>
      <h2 id="reflect-title">How confident are you now?</h2>
      <div className="confidence-options" role="group" aria-label="Confidence">
        {confidenceOptions.map((option) => (
          <button
            type="button"
            key={option.value}
            aria-pressed={state.confidence === option.value}
            onClick={() =>
              dispatch({ type: "set-confidence", confidence: option.value })
            }
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mastery-panel">
        <div>
          <span>Private mastery evidence</span>
          <strong>Market shifts · {progress} of 5 evidence steps</strong>
          <small>Based on demonstrated work, not time spent or streaks.</small>
        </div>
        <div
          className="progress-ring"
          aria-label={`${progress} of 5 evidence steps complete`}
          style={{ "--progress": `${progress * 20}%` } as CSSProperties}
        >
          {progress}/5
        </div>
      </div>
      <button
        className="button primary submit-button"
        type="button"
        disabled={!canSubmit(state)}
        onClick={() => dispatch({ type: "submit" })}
      >
        {state.submitted ? "Submitted for review" : "Submit for teacher review"}
      </button>
      {!canSubmit(state) && (
        <p className="field-note">
          Complete the correct prediction and shift, write at least 20
          characters, and select confidence.
        </p>
      )}
      {state.submitted && (
        <div className="feedback correct" role="status">
          <strong>Your evidence is ready for human review.</strong>
          <p>You can still update your response in this prototype.</p>
        </div>
      )}
    </section>
  );
}

function StudentActivity(props: ActivityProps) {
  return (
    <main id="main-content" className="page-shell">
      <section className="hero student-hero">
        <div>
          <p className="eyebrow">Microeconomics · Market equilibrium</p>
          <h1>How a supply shock changes equilibrium</h1>
          <p className="hero-copy">
            Shift a market curve and use the new equilibrium to explain how
            changing costs affects price and quantity.
          </p>
        </div>
        <div className="hero-meta">
          <span>8 min</span>
          <span>Original practice</span>
          <span>Saved locally</span>
        </div>
      </section>
      <StepProgress state={props.state} />
      <section
        className="lesson-card notice-card"
        aria-labelledby="notice-title"
      >
        <div className="card-kicker">01 · Notice</div>
        <h2 id="notice-title">A cheaper way to assemble e-bike batteries</h2>
        <p>
          A new process lowers the cost of supplying shared e-bikes. Before the
          change, the market equilibrium is price $6 and 60 rentals per week.
        </p>
        <div className="learning-clue">
          <span aria-hidden="true">↘</span>
          <p>
            <strong>Producer clue</strong> Costs change what sellers are willing
            and able to supply at every price.
          </p>
        </div>
      </section>
      <PredictionCard {...props} />
      <ShiftCard {...props} />
      <ExplanationCard {...props} />
      <ReflectionCard {...props} />
    </main>
  );
}

function TeacherEvidence({ state, dispatch }: ActivityProps) {
  const [filter, setFilter] = useState<
    "all" | "attention" | "review" | "not-started"
  >("all");
  const firstPrediction =
    predictionOptions.find((option) => option.value === state.firstPrediction)
      ?.label ?? "No checked prediction";
  const equilibrium = equilibriumForShift(state.supplyShift);
  const filteredStudents = demoStudents.filter(
    ([, status, signal], index) =>
      filter === "all" ||
      (filter === "attention" &&
        (index === 0
          ? state.shiftAttempts > 0 && !state.shiftCorrect
          : signal === "Demand moved" || signal === "Wrong direction")) ||
      (filter === "review" &&
        (index === 0
          ? state.submitted && state.reviewStatus === "awaiting"
          : signal === "Ready to review")) ||
      (filter === "not-started" && status === "Not started"),
  );
  const reviewLabel =
    state.reviewStatus === "returned"
      ? "Returned"
      : !state.submitted
        ? "Not submitted"
        : state.reviewStatus === "awaiting"
          ? "Awaiting review"
          : "Reviewed";
  const firstShiftLabel =
    state.firstCheckedShift === null
      ? "No checked graph state"
      : `Supply ${state.firstCheckedShift === 1 ? "right" : state.firstCheckedShift === -1 ? "left" : "unchanged"}`;
  return (
    <main id="main-content" className="page-shell teacher-shell">
      <section className="hero teacher-hero">
        <div>
          <p className="eyebrow">Teacher evidence · Economics 10A</p>
          <h1>Supply shifts — learning evidence</h1>
          <p className="hero-copy">
            Review the same activity through attempts, misconception signals,
            explanations, and the next teaching move.
          </p>
        </div>
        <div className="teacher-actions">
          <a className="button primary" href="#review-title">
            Open Maya’s review
          </a>
        </div>
      </section>
      <section className="evidence-grid" aria-label="Class evidence overview">
        <article>
          <span>Progress</span>
          <strong>{state.submitted ? 9 : 8} / 12</strong>
          <small>submitted</small>
        </article>
        <article>
          <span>Prediction</span>
          <strong>7</strong>
          <small>correct first try</small>
        </article>
        <article>
          <span>Graph action</span>
          <strong>{state.shiftCorrect ? 8 : 7}</strong>
          <small>shifted supply right</small>
        </article>
        <article className="accent">
          <span>Explanations</span>
          <strong>
            {state.submitted && state.reviewStatus === "awaiting" ? 4 : 3}
          </strong>
          <small>awaiting human review</small>
        </article>
      </section>
      <section className="insight-card">
        <div className="insight-icon" aria-hidden="true">
          !
        </div>
        <div>
          <span>Most useful misconception</span>
          <h2>3 students moved demand when producers’ costs changed.</h2>
          <p>
            <strong>Suggested teaching move:</strong> re-model how a non-price
            supply determinant shifts the whole curve.
          </p>
        </div>
      </section>
      <div className="teacher-layout">
        <section className="roster-panel" aria-labelledby="evidence-list-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Activity evidence</p>
              <h2 id="evidence-list-title">12 students</h2>
            </div>
            <label>
              Filter
              <select
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value as
                      | "all"
                      | "attention"
                      | "review"
                      | "not-started",
                  )
                }
              >
                <option value="all">All evidence</option>
                <option value="attention">Needs attention</option>
                <option value="review">Ready to review</option>
                <option value="not-started">Not started</option>
              </select>
            </label>
          </div>
          <p className="helper-copy">
            “Needs attention” describes an activity signal, not the learner.
          </p>
          <div className="student-list">
            {filteredStudents.map(([name, status, signal, confidence]) => {
              const index = demoStudents.findIndex(
                ([studentName]) => studentName === name,
              );
              return (
                <article
                  className={
                    index === 0 ? "student-row selected" : "student-row"
                  }
                  key={name}
                >
                  <span className="avatar" aria-hidden="true">
                    {name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <span>
                    <strong>{name}</strong>
                    <small>
                      {index === 0
                        ? state.submitted
                          ? "Submitted"
                          : "In progress"
                        : status}
                    </small>
                  </span>
                  <span>
                    <strong>
                      {index === 0
                        ? state.shiftCorrect
                          ? "Supply right"
                          : "Current local state"
                        : signal}
                    </strong>
                    <small>
                      {index === 0
                        ? (state.confidence ?? "No reflection yet")
                        : confidence}
                    </small>
                  </span>
                </article>
              );
            })}
            {filteredStudents.length === 0 && (
              <p className="helper-copy">
                No students match this evidence filter.
              </p>
            )}
          </div>
        </section>
        <section className="review-panel" aria-labelledby="review-title">
          <div className="review-heading">
            <div>
              <p className="eyebrow">Selected evidence</p>
              <h2 id="review-title">Maya Chen</h2>
            </div>
            <span className={`status-pill ${state.reviewStatus}`}>
              {reviewLabel}
            </span>
          </div>
          <dl className="evidence-details">
            <div>
              <dt>First prediction</dt>
              <dd>
                {firstPrediction} · {state.predictionAttempts} attempt
                {state.predictionAttempts === 1 ? "" : "s"}
              </dd>
            </div>
            <div>
              <dt>First checked graph</dt>
              <dd>{firstShiftLabel}</dd>
            </div>
            <div>
              <dt>Final graph action</dt>
              <dd>
                Supply{" "}
                {state.supplyShift === 1
                  ? "right"
                  : state.supplyShift === -1
                    ? "left"
                    : "unchanged"}{" "}
                · ${equilibrium.price}, {equilibrium.quantity} rentals
              </dd>
            </div>
            <div>
              <dt>Confidence</dt>
              <dd>
                {confidenceOptions.find(
                  (option) => option.value === state.confidence,
                )?.label ?? "Not selected"}
              </dd>
            </div>
          </dl>
          <div className="student-writing">
            <span>Student explanation</span>
            <blockquote>
              {state.explanation || "No explanation saved yet."}
            </blockquote>
          </div>
          <fieldset className="rubric">
            <legend>Human marking rubric</legend>
            {rubricLabels.map((label, index) => (
              <label key={label}>
                <input
                  type="checkbox"
                  disabled={!state.submitted}
                  checked={state.teacherRubric[index]}
                  onChange={() =>
                    dispatch({
                      type: "toggle-rubric",
                      index: index as 0 | 1 | 2,
                    })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <label className="field-label" htmlFor="teacher-feedback">
            Feedback to Maya
          </label>
          <textarea
            id="teacher-feedback"
            disabled={!state.submitted}
            rows={4}
            value={state.teacherFeedback}
            onChange={(event) =>
              dispatch({
                type: "set-teacher-feedback",
                feedback: event.target.value,
              })
            }
            placeholder="Name the reasoning that worked and one next step…"
          />
          <div className="review-actions">
            <button
              className="button quiet"
              type="button"
              disabled={!state.submitted}
              onClick={() => dispatch({ type: "return-for-retry" })}
            >
              Return for another try
            </button>
            <button
              className="button primary"
              type="button"
              disabled={!state.submitted}
              onClick={() => dispatch({ type: "save-review" })}
            >
              Save reviewed
            </button>
          </div>
          <p className="field-note">
            Prototype saves locally. Feedback is human-authored and is not
            automatically released or notified.
          </p>
        </section>
      </div>
    </main>
  );
}

export function App() {
  const [mode, setMode] = useState<PreviewMode>("student");
  const [state, dispatch] = useReducer(
    activityReducer,
    initialActivityState,
    () => loadActivityState(window.localStorage),
  );
  useEffect(() => {
    saveActivityState(window.localStorage, state);
  }, [state]);
  return (
    <>
      <PreviewHeader mode={mode} setMode={setMode} />
      {mode === "student" ? (
        <StudentActivity state={state} dispatch={dispatch} />
      ) : (
        <TeacherEvidence state={state} dispatch={dispatch} />
      )}
      <footer>
        <p>Learning Loop LMS · Public pilot prototype · Synthetic data only</p>
        <button type="button" onClick={() => dispatch({ type: "reset" })}>
          Reset local demo
        </button>
      </footer>
    </>
  );
}
