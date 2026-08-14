import {
  useEffect,
  useReducer,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  activityReducer,
  canSubmit,
  equilibriumForShifts,
  evidenceProgress,
  initialActivityState,
  loadActivityState,
  saveActivityState,
  type ActivityAction,
  type ActivityState,
  type Confidence,
  type Prediction,
  type Shift,
} from "./domain/activity";
import {
  assertValidCourseModel,
  createCourse,
  createModule,
  createModuleItem,
  moveModule,
  moveModuleItem,
  projectCourse,
  reviseModuleItem,
  transitionReleaseState,
  type CourseModel,
  type DomainRole,
  type Module,
  type ModuleItem,
  type ModuleItemType,
  type ReleaseState,
} from "./domain/course";
import { EconomicsGraph } from "./graph/EconomicsGraph";
import { ebikeMarketScenario } from "./graph/scenarios";

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

const DEMO_NOW = "2026-08-15T09:00:00.000Z";
const COURSE_STORAGE_KEY = "learning-loop-course-model-v1";

function buildPilotCourseModel(): CourseModel {
  const course = createCourse({
    id: "econ-10a",
    title: "Economics 10A",
    subject: "Economics",
    actorId: "teacher-1",
    now: DEMO_NOW,
  });
  const modules: Module[] = [
    createModule({
      id: "market-signals",
      courseId: course.id,
      title: "Week 1 · Market signals",
      position: 0,
      state: "published",
      actorId: "teacher-1",
      now: DEMO_NOW,
    }),
    createModule({
      id: "policy-choices",
      courseId: course.id,
      title: "Week 2 · Policy choices",
      position: 1,
      state: "published",
      actorId: "teacher-1",
      now: DEMO_NOW,
    }),
    createModule({
      id: "data-response",
      courseId: course.id,
      title: "Week 3 · Data response",
      position: 2,
      state: "hidden",
      actorId: "teacher-1",
      now: DEMO_NOW,
    }),
  ];
  const items: ModuleItem[] = [
    createModuleItem({
      id: "welcome",
      courseId: course.id,
      moduleId: modules[0].id,
      type: "page",
      title: "Start here: reading a market graph",
      position: 0,
      state: "published",
      completion: { type: "view" },
      actorId: "teacher-1",
      now: DEMO_NOW,
    }),
    createModuleItem({
      id: "supply-shock-activity",
      courseId: course.id,
      moduleId: modules[0].id,
      type: "learning-block",
      title: "How a supply shock changes equilibrium",
      position: 1,
      state: "published",
      prerequisiteItemIds: ["welcome"],
      completion: { type: "submit" },
      actorId: "teacher-1",
      now: DEMO_NOW,
    }),
    createModuleItem({
      id: "price-controls-resource",
      courseId: course.id,
      moduleId: modules[1].id,
      type: "resource",
      title: "Price controls: a guided data reading",
      position: 0,
      state: "published",
      availability: {
        startsAt: "2026-08-22T09:00:00.000Z",
        endsAt: null,
      },
      completion: { type: "view" },
      actorId: "teacher-1",
      now: DEMO_NOW,
    }),
    createModuleItem({
      id: "policy-quiz",
      courseId: course.id,
      moduleId: modules[1].id,
      type: "quiz",
      title: "Policy choices: quick check",
      position: 1,
      state: "published",
      availability: {
        startsAt: "2026-08-22T09:00:00.000Z",
        endsAt: null,
      },
      completion: { type: "submit" },
      actorId: "teacher-1",
      now: DEMO_NOW,
    }),
    createModuleItem({
      id: "data-response",
      courseId: course.id,
      moduleId: modules[2].id,
      type: "assignment",
      title: "Data response: household budgets",
      position: 0,
      state: "hidden",
      completion: { type: "submit" },
      actorId: "teacher-1",
      now: DEMO_NOW,
    }),
  ];
  return { course: { ...course, status: "active" }, modules, items };
}

const pilotCourseModel = buildPilotCourseModel();

function loadCourseModel(storage: Storage): CourseModel {
  const serialized = storage.getItem(COURSE_STORAGE_KEY);
  if (!serialized) return structuredClone(pilotCourseModel);
  try {
    const parsed = JSON.parse(serialized) as CourseModel;
    assertValidCourseModel(parsed);
    return parsed;
  } catch {
    return structuredClone(pilotCourseModel);
  }
}

function saveCourseModel(storage: Storage, course: CourseModel): void {
  storage.setItem(COURSE_STORAGE_KEY, JSON.stringify(course));
}

type DemoScreen =
  | "student-course"
  | "student-activity"
  | "teacher-composer"
  | "teacher-evidence";

type ActivityProps = {
  state: ActivityState;
  dispatch: Dispatch<ActivityAction>;
};

function PreviewHeader({
  screen,
  setScreen,
}: {
  screen: DemoScreen;
  setScreen: (screen: DemoScreen) => void;
}) {
  const role: DomainRole = screen.startsWith("teacher") ? "teacher" : "student";
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
          <strong>Demo entry</strong>
          <span>Author / QA only · {role} view</span>
        </div>
        <div
          className="segmented"
          role="group"
          aria-label="Demo entry point for author and QA review"
        >
          <button
            type="button"
            aria-pressed={role === "student"}
            onClick={() => setScreen("student-course")}
          >
            Student course
          </button>
          <button
            type="button"
            aria-pressed={role === "teacher"}
            onClick={() => setScreen("teacher-composer")}
          >
            Teacher workspace
          </button>
        </div>
        <p className="preview-note">
          Student opens course modules and completes work · Teacher authors,
          previews, and reviews evidence. Production accounts never show this
          demo entry.
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

function CurvePositionControl({
  label,
  shift,
  onChange,
}: {
  label: "Demand" | "Supply";
  shift: Shift;
  onChange: (shift: Shift) => void;
}) {
  return (
    <fieldset>
      <legend>{label} position</legend>
      <div className="shift-controls">
        {([-1, 0, 1] as Shift[]).map((option) => (
          <button
            key={option}
            type="button"
            className={
              shift === option ? "shift-button active" : "shift-button"
            }
            aria-pressed={shift === option}
            onClick={() => onChange(option)}
          >
            {option === -1 ? "← Left" : option === 0 ? "Unchanged" : "Right →"}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ShiftCard({ state, dispatch }: ActivityProps) {
  const equilibrium = equilibriumForShifts(
    state.supplyShift,
    state.demandShift,
  );
  const shiftWord = (shift: Shift) =>
    shift === 1 ? "right" : shift === -1 ? "left" : "unchanged";
  const demandQuantities = [100, 80, 60, 40, 20].map((value) =>
    Math.max(0, value + state.demandShift * 40),
  );
  const supplyQuantities = [20, 40, 60, 80, 100].map((value) =>
    Math.max(0, value + state.supplyShift * 40),
  );
  return (
    <section className="lesson-card feature-card" aria-labelledby="test-title">
      <div className="card-kicker">03 · Test</div>
      <div className="card-heading-row">
        <div>
          <h2 id="test-title">Move a whole curve to test your prediction</h2>
          <p>
            Drag either curve left or right. It snaps to one constrained step,
            recalculates equilibrium, and updates the same controls and table.
          </p>
        </div>
        <button
          className="button quiet"
          type="button"
          onClick={() => {
            dispatch({ type: "set-curve-shift", curveId: "demand", shift: 0 });
            dispatch({ type: "set-curve-shift", curveId: "supply", shift: 0 });
          }}
        >
          Reset graph
        </button>
      </div>
      <EconomicsGraph
        scenario={ebikeMarketScenario}
        state={{
          shifts: { demand: state.demandShift, supply: state.supplyShift },
        }}
        onShift={(curveId, shift) =>
          dispatch({
            type: "set-curve-shift",
            curveId: curveId as "demand" | "supply",
            shift,
          })
        }
        onCheck={() => dispatch({ type: "check-shift" })}
      />
      <div className="shift-layout">
        <div>
          <div className="curve-control-grid">
            <CurvePositionControl
              label="Demand"
              shift={state.demandShift}
              onChange={(shift) =>
                dispatch({
                  type: "set-curve-shift",
                  curveId: "demand",
                  shift,
                })
              }
            />
            <CurvePositionControl
              label="Supply"
              shift={state.supplyShift}
              onChange={(shift) =>
                dispatch({
                  type: "set-curve-shift",
                  curveId: "supply",
                  shift,
                })
              }
            />
          </div>
          <div className="equilibrium-callout" aria-live="polite">
            <span>
              Demand {shiftWord(state.demandShift)} · Supply{" "}
              {shiftWord(state.supplyShift)}
            </span>
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
                  : state.demandShift !== 0
                    ? "The event changes producers’ costs. Which side of the market does that affect first?"
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
          aria-label="Market schedule after the selected curve shifts"
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
                  <td>{demandQuantities[index]}</td>
                  <td>{supplyQuantities[index]}</td>
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

function StudentCourseHome({
  course,
  state,
  onOpenActivity,
}: {
  course: CourseModel;
  state: ActivityState;
  onOpenActivity: () => void;
}) {
  const progress = evidenceProgress(state);
  const projection = projectCourse(course, "student", {
    now: DEMO_NOW,
    completedItemIds: new Set(
      state.submitted ? ["welcome", "supply-shock-activity"] : ["welcome"],
    ),
  });
  const visibleModules = projection.modules;
  const lockedItemCount = visibleModules.reduce(
    (total, module) => total + module.lockedItemCount,
    0,
  );
  const nextRelease = visibleModules
    .map((module) => module.nextAvailableAt)
    .filter((value): value is string => value !== null)
    .sort()[0];
  const nextReleaseLabel = nextRelease
    ? new Date(nextRelease).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      })
    : "No scheduled release";
  return (
    <main id="main-content" className="page-shell course-home-shell">
      <nav className="course-nav" aria-label="Student course navigation">
        <span className="course-nav-title">Economics 10A</span>
        <span className="course-nav-links">
          <span className="course-nav-current" aria-current="page">
            Course home
          </span>
          <button type="button" onClick={onOpenActivity}>
            Open activity
          </button>
        </span>
      </nav>
      <section className="course-hero">
        <div>
          <p className="eyebrow">Student course · Microeconomics</p>
          <h1>Economics 10A</h1>
          <p className="hero-copy">
            A clear path through market signals, policy choices, and data
            response. Your next step is ready when you are.
          </p>
        </div>
        <aside
          className="course-progress-card"
          aria-label="Private course progress"
        >
          <span>Private mastery progress</span>
          <strong>{state.submitted ? "1 of 3" : "In progress"}</strong>
          <div className="progress-track" aria-hidden="true">
            <span style={{ width: `${Math.max(20, progress * 20)}%` }} />
          </div>
          <small>Evidence, not time spent or a public ranking.</small>
        </aside>
      </section>
      <section className="course-overview" aria-label="Course overview">
        <div>
          <span>Current focus</span>
          <strong>Market equilibrium</strong>
          <small>1 learning activity · 8 minutes</small>
        </div>
        <div>
          <span>Course rhythm</span>
          <strong>{visibleModules.length} modules available</strong>
          <small>Ordered by your teacher</small>
        </div>
        <div>
          <span>Release status</span>
          <strong>
            {lockedItemCount === 0
              ? "All current work open"
              : `${lockedItemCount} item${lockedItemCount === 1 ? "" : "s"} scheduled`}
          </strong>
          <small>Next release {nextReleaseLabel}</small>
        </div>
      </section>
      <section className="module-list" aria-labelledby="modules-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Course map</p>
            <h2 id="modules-title">Modules</h2>
          </div>
          <span className="section-note">Your teacher controls release</span>
        </div>
        <div className="module-stack">
          {visibleModules.map((module, moduleIndex) => {
            const lockedDescription =
              module.lockedReason === "prerequisite"
                ? "Complete the earlier activity to unlock this work."
                : module.lockedReason === "mixed"
                  ? `Some work opens ${module.nextAvailableAt ? new Date(module.nextAvailableAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "later"}; some follows an earlier activity.`
                  : module.nextAvailableAt
                    ? `Available from ${new Date(module.nextAvailableAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · Your teacher sets release`
                    : "Your teacher sets the release";
            return (
              <article className="module-card" key={module.id}>
                <div className="module-card-heading">
                  <div className="module-number" aria-hidden="true">
                    {String(moduleIndex + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <div className="module-title-row">
                      <h3>{module.title}</h3>
                      <span className="state-pill published">Available</span>
                    </div>
                    <p>
                      {moduleIndex === 0
                        ? "Build the graph language you will use in every later activity."
                        : "Teacher-prepared work will appear here when released."}
                    </p>
                  </div>
                </div>
                <ol className="module-item-list">
                  {module.items.map((item, itemIndex) => {
                    const complete =
                      item.id === "welcome" ||
                      (item.id === "supply-shock-activity" && state.submitted);
                    const current =
                      item.id === "supply-shock-activity" && !state.submitted;
                    return (
                      <li
                        className={
                          current ? "module-item current" : "module-item"
                        }
                        key={item.id}
                      >
                        <span className="item-index" aria-hidden="true">
                          {complete ? "✓" : itemIndex + 1}
                        </span>
                        <span className="module-item-copy">
                          <strong>{item.title}</strong>
                          <small>
                            {item.type === "learning-block"
                              ? "Interactive activity"
                              : "Reading page"}
                          </small>
                        </span>
                        <span
                          className={
                            complete ? "item-status complete" : "item-status"
                          }
                        >
                          {complete
                            ? "Complete"
                            : current
                              ? "In progress"
                              : "Ready"}
                        </span>
                        {(current || complete) && (
                          <button
                            className="button primary item-action"
                            type="button"
                            onClick={onOpenActivity}
                          >
                            {complete ? "Review" : "Continue"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                  {module.lockedItemCount > 0 && (
                    <li className="module-item locked">
                      <span className="item-index" aria-hidden="true">
                        ···
                      </span>
                      <span className="module-item-copy">
                        <strong>
                          {module.lockedItemCount} item
                          {module.lockedItemCount === 1 ? "" : "s"} locked
                        </strong>
                        <small>{lockedDescription}</small>
                      </span>
                      <span className="item-status">
                        {module.lockedReason === "prerequisite"
                          ? "Locked"
                          : "Scheduled"}
                      </span>
                    </li>
                  )}
                </ol>
              </article>
            );
          })}
        </div>
      </section>
      <p className="privacy-note">
        <strong>Private progress.</strong> This pilot stores synthetic demo
        state on this device only. It is learning evidence, not attention
        tracking.
      </p>
    </main>
  );
}

function StudentActivity({
  state,
  dispatch,
  onBack,
}: ActivityProps & { onBack: () => void }) {
  return (
    <main id="main-content" className="page-shell">
      <nav className="course-nav" aria-label="Student course navigation">
        <button type="button" onClick={onBack}>
          ← Economics 10A
        </button>
        <span>Module 1 · Market signals</span>
      </nav>
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
      <StepProgress state={state} />
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
      <PredictionCard state={state} dispatch={dispatch} />
      <ShiftCard state={state} dispatch={dispatch} />
      <ExplanationCard state={state} dispatch={dispatch} />
      <ReflectionCard state={state} dispatch={dispatch} />
    </main>
  );
}

const composerTypes: Array<{ type: ModuleItemType; label: string }> = [
  { type: "learning-block", label: "Learning block" },
  { type: "page", label: "Page" },
  { type: "resource", label: "Resource" },
  { type: "video", label: "Video" },
  { type: "assignment", label: "Assignment" },
  { type: "quiz", label: "Quiz" },
  { type: "discussion", label: "Discussion" },
];

function releaseLabel(state: ReleaseState): string {
  return state === "scheduled"
    ? "Scheduled"
    : state.charAt(0).toUpperCase() + state.slice(1);
}

function TeacherComposer({
  course,
  setCourse,
  setScreen,
}: {
  course: CourseModel;
  setCourse: Dispatch<SetStateAction<CourseModel>>;
  setScreen: (screen: DemoScreen) => void;
}) {
  const [selectedModuleId, setSelectedModuleId] = useState(
    pilotCourseModel.modules[0].id,
  );
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [titleErrors, setTitleErrors] = useState<Record<string, string>>({});
  const [orderNotice, setOrderNotice] = useState("");
  const selectedModule =
    course.modules.find((module) => module.id === selectedModuleId) ??
    course.modules[0];
  const selectedItems = course.items
    .filter((item) => item.moduleId === selectedModule.id)
    .sort((a, b) => a.position - b.position);

  const replaceItems = (nextItems: ModuleItem[]) => {
    setCourse((current) => ({
      ...current,
      items: [
        ...current.items.filter((item) => item.moduleId !== selectedModule.id),
        ...nextItems,
      ],
    }));
  };
  const addItem = (type: ModuleItemType) => {
    const label =
      composerTypes.find((entry) => entry.type === type)?.label ??
      "Learning block";
    let nextItemNumber = 1;
    while (
      course.items.some((item) => item.id === `composer-item-${nextItemNumber}`)
    ) {
      nextItemNumber += 1;
    }
    const item = createModuleItem({
      id: `composer-item-${nextItemNumber}`,
      courseId: course.course.id,
      moduleId: selectedModule.id,
      type,
      title: `New ${label.toLowerCase()}`,
      position: selectedItems.length,
      state: "draft",
      actorId: "teacher-1",
      now: DEMO_NOW,
    });
    replaceItems([...selectedItems, item]);
  };
  const updateItem = (nextItem: ModuleItem) => {
    replaceItems(
      selectedItems.map((item) => (item.id === nextItem.id ? nextItem : item)),
    );
  };
  const commitItemTitle = (item: ModuleItem) => {
    const draft = titleDrafts[item.id];
    if (draft === undefined) return;
    if (!draft.trim()) {
      setTitleErrors((current) => ({
        ...current,
        [item.id]: "A module item needs a title before it can be saved.",
      }));
      return;
    }
    setTitleDrafts((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setTitleErrors((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    if (draft.trim() === item.title) return;
    updateItem(
      reviseModuleItem(
        item,
        {
          title: draft.trim(),
          type: item.type,
          completion: item.completion,
          availability: item.availability,
          prerequisiteItemIds: item.prerequisiteItemIds,
        },
        "teacher-1",
        DEMO_NOW,
      ),
    );
  };
  const moveItem = (itemId: string, targetPosition: number) => {
    const item = selectedItems.find((entry) => entry.id === itemId);
    replaceItems(
      moveModuleItem(
        selectedItems,
        itemId,
        targetPosition,
        "teacher-1",
        DEMO_NOW,
      ),
    );
    if (item) {
      setOrderNotice(`${item.title} moved to position ${targetPosition + 1}.`);
    }
  };
  const moveModuleInCourse = (moduleId: string, targetPosition: number) => {
    const module = course.modules.find((entry) => entry.id === moduleId);
    setCourse((current) => ({
      ...current,
      modules: moveModule(
        current.modules,
        moduleId,
        targetPosition,
        "teacher-1",
        DEMO_NOW,
      ),
    }));
    if (module) {
      setOrderNotice(
        `${module.title} moved to position ${targetPosition + 1}.`,
      );
    }
  };
  const setItemState = (item: ModuleItem, nextState: ReleaseState) => {
    updateItem(transitionReleaseState(item, nextState, "teacher-1", DEMO_NOW));
  };
  const setModuleState = (nextState: ReleaseState) => {
    setCourse((current) => ({
      ...current,
      modules: current.modules.map((module) =>
        module.id === selectedModule.id
          ? transitionReleaseState(module, nextState, "teacher-1", DEMO_NOW)
          : module,
      ),
    }));
  };
  const addModule = () => {
    const module = createModule({
      id: `composer-module-${course.modules.length + 1}`,
      courseId: course.course.id,
      title: `New module ${course.modules.length + 1}`,
      position: course.modules.length,
      state: "draft",
      actorId: "teacher-1",
      now: DEMO_NOW,
    });
    setCourse((current) => ({
      ...current,
      modules: [...current.modules, module],
    }));
    setSelectedModuleId(module.id);
  };

  return (
    <main id="main-content" className="page-shell composer-shell">
      <nav
        className="course-nav teacher-nav"
        aria-label="Teacher course navigation"
      >
        <span className="course-nav-title">
          Teacher workspace · Economics 10A
        </span>
        <span className="course-nav-links">
          <span className="course-nav-current" aria-current="page">
            Module Composer
          </span>
          <button type="button" onClick={() => setScreen("teacher-evidence")}>
            Evidence &amp; marking
          </button>
        </span>
      </nav>
      <section className="composer-hero">
        <div>
          <p className="eyebrow">Teacher controls · Course authoring</p>
          <h1>Build the learning path, in context.</h1>
          <p className="hero-copy">
            Add a learning block, resource, or assessment directly inside a
            module. Keep release state and the student preview close to the
            learning evidence.
          </p>
        </div>
        <div className="composer-hero-actions">
          <button
            className="button primary"
            type="button"
            onClick={() => setScreen("student-course")}
          >
            Preview as student
          </button>
          <span className="demo-boundary">
            Demo data · teacher-only controls
          </span>
        </div>
      </section>
      <div className="composer-layout">
        <p className="sr-only" aria-live="polite">
          {orderNotice}
        </p>
        <aside className="composer-sidebar" aria-labelledby="module-list-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Course structure</p>
              <h2 id="module-list-title">Modules</h2>
            </div>
            <button
              className="button quiet compact-button"
              type="button"
              onClick={addModule}
            >
              + Add module
            </button>
          </div>
          <p className="helper-copy">
            Drag-free ordering is available through Move to, too.
          </p>
          <div className="composer-module-list">
            {course.modules.map((module, index) => (
              <div className="composer-module-row" key={module.id}>
                <button
                  className={
                    module.id === selectedModule.id
                      ? "composer-module selected"
                      : "composer-module"
                  }
                  type="button"
                  aria-pressed={module.id === selectedModule.id}
                  onClick={() => setSelectedModuleId(module.id)}
                >
                  <span className="composer-module-number">{index + 1}</span>
                  <span>
                    <strong>{module.title}</strong>
                    <small>{releaseLabel(module.state)}</small>
                  </span>
                </button>
                <div
                  className="composer-module-order"
                  aria-label={`Order controls for ${module.title}`}
                >
                  <button
                    type="button"
                    aria-label={`Move ${module.title} up`}
                    disabled={index === 0}
                    onClick={() => moveModuleInCourse(module.id, index - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${module.title} down`}
                    disabled={index === course.modules.length - 1}
                    onClick={() => moveModuleInCourse(module.id, index + 1)}
                  >
                    ↓
                  </button>
                  <label>
                    <span className="sr-only">
                      Move {module.title} to position
                    </span>
                    <select
                      aria-label={`Move ${module.title} to position`}
                      value={index}
                      onChange={(event) =>
                        moveModuleInCourse(
                          module.id,
                          Number(event.target.value),
                        )
                      }
                    >
                      {course.modules.map((_, position) => (
                        <option key={position} value={position}>
                          Move to {position + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </aside>
        <section className="composer-editor" aria-labelledby="composer-title">
          <div className="composer-editor-heading">
            <div>
              <p className="eyebrow">
                Module {selectedModule.position + 1} · Inline essentials
              </p>
              <h2 id="composer-title">{selectedModule.title}</h2>
              <p className="helper-copy">
                {selectedItems.length} item
                {selectedItems.length === 1 ? "" : "s"} · prerequisites and
                availability stay attached to the item.
              </p>
            </div>
            <div className="composer-editor-actions">
              <span className={`state-pill ${selectedModule.state}`}>
                {releaseLabel(selectedModule.state)}
              </span>
              {selectedModule.state === "published" ? (
                <button
                  className="button quiet compact-button"
                  type="button"
                  onClick={() => setModuleState("hidden")}
                >
                  Hide module
                </button>
              ) : (
                <button
                  className="button primary compact-button"
                  type="button"
                  onClick={() => setModuleState("published")}
                >
                  Publish module
                </button>
              )}
            </div>
          </div>
          <div className="quick-add" aria-label="Add content to this module">
            <span className="quick-add-label">Quick add</span>
            {composerTypes.map((entry) => (
              <button
                className="quick-add-button"
                key={entry.type}
                type="button"
                onClick={() => addItem(entry.type)}
              >
                + {entry.label}
              </button>
            ))}
          </div>
          <ol className="composer-item-list">
            {selectedItems.map((item, index) => (
              <li className="composer-item" key={item.id}>
                <div
                  className="composer-item-order"
                  aria-label={`Order controls for ${item.title}`}
                >
                  <button
                    type="button"
                    aria-label={`Move ${item.title} up`}
                    disabled={index === 0}
                    onClick={() => moveItem(item.id, index - 1)}
                  >
                    ↑
                  </button>
                  <span>{index + 1}</span>
                  <button
                    type="button"
                    aria-label={`Move ${item.title} down`}
                    disabled={index === selectedItems.length - 1}
                    onClick={() => moveItem(item.id, index + 1)}
                  >
                    ↓
                  </button>
                </div>
                <div className="composer-item-main">
                  <div className="composer-item-heading">
                    <span className="item-type-label">
                      {item.type.replace("-", " ")}
                    </span>
                    <span className={`state-pill ${item.state}`}>
                      {releaseLabel(item.state)}
                    </span>
                  </div>
                  <label className="sr-only" htmlFor={`item-title-${item.id}`}>
                    Title for {item.title}
                  </label>
                  <input
                    id={`item-title-${item.id}`}
                    className="composer-title-input"
                    value={titleDrafts[item.id] ?? item.title}
                    aria-invalid={Boolean(titleErrors[item.id])}
                    onChange={(event) =>
                      setTitleDrafts((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                    onBlur={() => commitItemTitle(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitItemTitle(item);
                      }
                    }}
                  />
                  {titleErrors[item.id] && (
                    <span className="field-note composer-error" role="alert">
                      {titleErrors[item.id]}
                    </span>
                  )}
                  <details>
                    <summary>Availability &amp; prerequisites</summary>
                    <p>
                      {item.availability.startsAt
                        ? `Opens ${new Date(item.availability.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                        : "Available immediately"}
                      {item.prerequisiteItemIds.length > 0
                        ? ` · Requires ${item.prerequisiteItemIds.length} earlier item`
                        : " · No prerequisite"}
                    </p>
                  </details>
                </div>
                <div className="composer-item-actions">
                  <label>
                    <span className="sr-only">
                      Move {item.title} to position
                    </span>
                    <select
                      aria-label={`Move ${item.title} to position`}
                      value={index}
                      onChange={(event) =>
                        moveItem(item.id, Number(event.target.value))
                      }
                    >
                      {selectedItems.map((_, position) => (
                        <option key={position} value={position}>
                          Move to {position + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  {item.state === "published" ? (
                    <button
                      className="button quiet compact-button"
                      type="button"
                      onClick={() => setItemState(item, "hidden")}
                    >
                      Hide
                    </button>
                  ) : (
                    <button
                      className="button primary compact-button"
                      type="button"
                      onClick={() => setItemState(item, "published")}
                    >
                      Publish
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <div className="composer-release-checklist">
            <strong>Release checklist</strong>
            <span>○ Preview this module as a student</span>
            <span>○ Confirm availability and prerequisites</span>
            <span>✓ One canonical item identity per block</span>
          </div>
          <p className="privacy-note">
            Teacher controls are shown only in this author/QA demo. Production
            permissions will be enforced by backend role and course scope.
          </p>
        </section>
      </div>
    </main>
  );
}

function TeacherEvidence({
  state,
  dispatch,
  setScreen,
}: ActivityProps & { setScreen: (screen: DemoScreen) => void }) {
  const [filter, setFilter] = useState<
    "all" | "attention" | "review" | "not-started"
  >("all");
  const firstPrediction =
    predictionOptions.find((option) => option.value === state.firstPrediction)
      ?.label ?? "No checked prediction";
  const equilibrium = equilibriumForShifts(
    state.supplyShift,
    state.demandShift,
  );
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
    state.firstCheckedShift === null || state.firstCheckedCurve === null
      ? "No checked graph state"
      : `${state.firstCheckedCurve === "demand" ? "Demand" : "Supply"} ${state.firstCheckedShift === 1 ? "right" : state.firstCheckedShift === -1 ? "left" : "unchanged"}`;
  return (
    <main id="main-content" className="page-shell teacher-shell">
      <nav
        className="course-nav teacher-nav"
        aria-label="Teacher course navigation"
      >
        <span className="course-nav-title">
          Teacher workspace · Economics 10A
        </span>
        <span className="course-nav-links">
          <button type="button" onClick={() => setScreen("teacher-composer")}>
            Module Composer
          </button>
          <span className="course-nav-current" aria-current="page">
            Evidence &amp; marking
          </span>
        </span>
      </nav>
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
                Demand{" "}
                {state.demandShift === 1
                  ? "right"
                  : state.demandShift === -1
                    ? "left"
                    : "unchanged"}{" "}
                · Supply{" "}
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
  const [screen, setScreen] = useState<DemoScreen>("student-course");
  const [course, setCourse] = useState<CourseModel>(() =>
    loadCourseModel(window.localStorage),
  );
  const [state, dispatch] = useReducer(
    activityReducer,
    initialActivityState,
    () => loadActivityState(window.localStorage),
  );
  useEffect(() => {
    saveActivityState(window.localStorage, state);
  }, [state]);
  useEffect(() => {
    saveCourseModel(window.localStorage, course);
  }, [course]);
  return (
    <>
      <PreviewHeader screen={screen} setScreen={setScreen} />
      {screen === "student-course" && (
        <StudentCourseHome
          course={course}
          state={state}
          onOpenActivity={() => setScreen("student-activity")}
        />
      )}
      {screen === "student-activity" && (
        <StudentActivity
          state={state}
          dispatch={dispatch}
          onBack={() => setScreen("student-course")}
        />
      )}
      {screen === "teacher-composer" && (
        <TeacherComposer
          course={course}
          setCourse={setCourse}
          setScreen={setScreen}
        />
      )}
      {screen === "teacher-evidence" && (
        <TeacherEvidence
          state={state}
          dispatch={dispatch}
          setScreen={setScreen}
        />
      )}
      <footer>
        <p>Learning Loop LMS · Public pilot prototype · Synthetic data only</p>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "reset" });
            setCourse(structuredClone(pilotCourseModel));
          }}
        >
          Reset local demo
        </button>
      </footer>
    </>
  );
}
