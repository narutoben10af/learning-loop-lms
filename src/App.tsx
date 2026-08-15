import {
  useEffect,
  useReducer,
  useRef,
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
  createCourse,
  createModule,
  createModuleItem,
  defaultModuleItemContent,
  moveModule,
  moveModuleItem,
  projectCourse,
  reviseModuleItem,
  transitionReleaseState,
  type CourseModel,
  type CourseProjection,
  type DomainRole,
  type LocalAttachmentMetadata,
  type Module,
  type ModuleItem,
  type ModuleItemContent,
  type ModuleItemType,
  type ReleaseState,
} from "./domain/course";
import {
  WORKSPACE_STORAGE_KEY,
  addWorkspaceMembership,
  assertValidWorkspaceSnapshot,
  createCourseInWorkspace,
  createWorkspace,
  createWorkspaceSnapshot,
  loadWorkspaceSnapshot,
  projectWorkspace,
  saveWorkspaceSnapshot,
  transitionWorkspaceCourse,
  type WorkspaceActor,
  type WorkspaceMembership,
  type WorkspaceSnapshot,
} from "./domain/workspace";
import { EconomicsGraph } from "./graph/EconomicsGraph";
import { ebikeMarketScenario } from "./graph/scenarios";
import {
  WorkspaceDashboard,
  type CreateCourseDraft,
  type WorkspaceCourseSummary,
} from "./WorkspaceDashboard";

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
const DEMO_ORGANIZATION_ID = "learning-loop-demo-school";
const teacherActor: WorkspaceActor = {
  principalId: "teacher-1",
  organizationId: DEMO_ORGANIZATION_ID,
};
const studentActor: WorkspaceActor = {
  principalId: "student-1",
  organizationId: DEMO_ORGANIZATION_ID,
};
const ownerActor: WorkspaceActor = {
  principalId: "owner-1",
  organizationId: DEMO_ORGANIZATION_ID,
};

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
      content: {
        kind: "text",
        body: "Use the axes and equilibrium marker as your starting point.",
      },
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
      content: {
        kind: "text",
        body: "Adjust one curve, observe the new equilibrium, and explain the cause.",
      },
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
      content: {
        kind: "resource",
        description: "A guided reading on how price controls change a market.",
        resourceType: "article",
        url: "https://example.edu/economics/price-controls",
        localAttachment: null,
      },
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
      state: "scheduled",
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

function demoMembership(
  id: string,
  principalId: string,
  role: WorkspaceMembership["role"],
  courseId: string | null,
): WorkspaceMembership {
  return {
    id,
    organizationId: DEMO_ORGANIZATION_ID,
    courseId,
    principalId,
    role,
    status: "active",
    revision: 1,
    audit: {
      createdBy: ownerActor.principalId,
      createdAt: DEMO_NOW,
      updatedBy: ownerActor.principalId,
      updatedAt: DEMO_NOW,
    },
  };
}

function buildPilotWorkspaceSnapshot(): WorkspaceSnapshot {
  let snapshot = createWorkspaceSnapshot(
    createWorkspace({
      organizationId: DEMO_ORGANIZATION_ID,
      organizationName: "Learning Loop Demo School",
      actorId: ownerActor.principalId,
      actorRole: "platform-owner",
      actorMembershipId: "membership-owner-1",
      now: DEMO_NOW,
    }),
  );
  snapshot = addWorkspaceMembership(
    snapshot,
    ownerActor,
    demoMembership(
      "membership-org-teacher-1",
      teacherActor.principalId,
      "teacher",
      null,
    ),
    DEMO_NOW,
  );
  const draftPilot = structuredClone(pilotCourseModel);
  draftPilot.course.status = "draft";
  snapshot = createCourseInWorkspace(snapshot, teacherActor, draftPilot, {
    code: "ECON-10A",
    term: "Term 1 · 2026",
    section: "10A",
    visibility: "enrolled-members",
    creatorMembershipId: "membership-econ-10a-teacher-1",
    now: DEMO_NOW,
  });
  snapshot = transitionWorkspaceCourse(
    snapshot,
    teacherActor,
    draftPilot.course.id,
    "active",
    DEMO_NOW,
  );
  snapshot = addWorkspaceMembership(
    snapshot,
    ownerActor,
    demoMembership(
      "membership-econ-10a-student-1",
      studentActor.principalId,
      "student",
      draftPilot.course.id,
    ),
    DEMO_NOW,
  );
  return snapshot;
}

const pilotWorkspaceSnapshot = buildPilotWorkspaceSnapshot();

function loadAppWorkspace(storage: Storage): WorkspaceSnapshot {
  const loaded = loadWorkspaceSnapshot(storage, {
    fallback: pilotWorkspaceSnapshot,
    legacyCourseKey: COURSE_STORAGE_KEY,
    legacyMigration: {
      organizationId: DEMO_ORGANIZATION_ID,
      organizationName: "Learning Loop Demo School",
      actorId: teacherActor.principalId,
      actorMembershipId: "membership-org-teacher-1",
      courseMembershipId: "membership-econ-10a-teacher-1",
      code: "ECON-10A",
      term: "Term 1 · 2026",
      section: "10A",
      visibility: "enrolled-members",
      now: DEMO_NOW,
    },
  });
  const hasPilot = loaded.workspace.courses.some(
    (course) => course.id === pilotCourseModel.course.id,
  );
  const hasStudent = loaded.workspace.memberships.some(
    (membership) =>
      membership.courseId === pilotCourseModel.course.id &&
      membership.principalId === studentActor.principalId &&
      membership.role === "student" &&
      membership.status === "active",
  );
  if (!hasPilot || hasStudent) return loaded;
  const migrated = structuredClone(loaded);
  const migrationAt = new Date(
    Math.max(
      Date.parse(migrated.workspace.audit.updatedAt),
      Date.parse(DEMO_NOW),
    ),
  ).toISOString();
  migrated.workspace.memberships.push({
    ...demoMembership(
      "membership-econ-10a-student-1",
      studentActor.principalId,
      "student",
      pilotCourseModel.course.id,
    ),
    audit: {
      createdBy: teacherActor.principalId,
      createdAt: migrationAt,
      updatedBy: teacherActor.principalId,
      updatedAt: migrationAt,
    },
  });
  migrated.workspace.revision += 1;
  migrated.workspace.audit = {
    ...migrated.workspace.audit,
    updatedBy: teacherActor.principalId,
    updatedAt: migrationAt,
  };
  assertValidWorkspaceSnapshot(migrated);
  return migrated;
}

type DemoScreen =
  | "teacher-dashboard"
  | "student-dashboard"
  | "student-course"
  | "student-activity"
  | "teacher-student-preview"
  | "teacher-student-preview-activity"
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
  if (role === "student") {
    return (
      <header className="app-header student-app-header">
        <button
          className="brand brand-button"
          type="button"
          onClick={() => setScreen("student-dashboard")}
          aria-label="Learning Loop student courses"
        >
          <span className="brand-mark" aria-hidden="true">
            LL
          </span>
          <span>
            <strong>Learning Loop</strong>
            <small>Student workspace</small>
          </span>
        </button>
        <span className="student-account-badge">Maya · My courses</span>
      </header>
    );
  }
  return (
    <header className="app-header">
      <button
        className="brand brand-button"
        type="button"
        onClick={() => setScreen("teacher-dashboard")}
        aria-label="Learning Loop teacher workspace"
      >
        <span className="brand-mark" aria-hidden="true">
          LL
        </span>
        <span>
          <strong>Learning Loop</strong>
          <small>Economics pilot</small>
        </span>
      </button>
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
            aria-pressed={false}
            onClick={() => setScreen("student-dashboard")}
          >
            Student courses
          </button>
          <button
            type="button"
            aria-pressed
            onClick={() => setScreen("teacher-dashboard")}
          >
            Teacher workspace
          </button>
        </div>
        <p className="preview-note">
          Use this author/QA entry before opening a production-separated view.
          Student screens never show this switch; browser Back returns from a
          teacher preview.
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
  projection,
  state,
  onOpenActivity,
}: {
  projection: CourseProjection;
  state: ActivityState;
  onOpenActivity: () => void;
}) {
  const progress = evidenceProgress(state);
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
  const isEconomicsPilot = projection.course.id === pilotCourseModel.course.id;
  return (
    <main id="main-content" className="page-shell course-home-shell">
      <nav className="course-nav" aria-label="Student course navigation">
        <span className="course-nav-title">{projection.course.title}</span>
        <span className="course-nav-links">
          <span className="course-nav-current" aria-current="page">
            Course home
          </span>
          {isEconomicsPilot && (
            <button type="button" onClick={onOpenActivity}>
              Open activity
            </button>
          )}
        </span>
      </nav>
      <section className="course-hero">
        <div>
          <p className="eyebrow">
            Student course · {projection.course.subject}
          </p>
          <h1>{projection.course.title}</h1>
          <p className="hero-copy">
            {isEconomicsPilot
              ? "A clear path through market signals, policy choices, and data response. Your next step is ready when you are."
              : projection.course.status === "draft"
                ? "Student preview is empty until this private draft is deliberately activated and its first module is published."
                : "Your teacher has arranged the available learning in one clear path."}
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
          <strong>
            {isEconomicsPilot
              ? "Market equilibrium"
              : projection.course.subject}
          </strong>
          <small>
            {isEconomicsPilot
              ? "1 learning activity · 8 minutes"
              : `${visibleModules.length} released modules`}
          </small>
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
                    const contentDetail = item.content
                      ? item.content.kind === "text"
                        ? item.content.body
                        : item.content.kind === "resource"
                          ? `${item.content.description} · ${item.content.resourceType}`
                          : item.content.kind === "video"
                            ? item.content.description
                            : item.content.instructions
                      : item.state === "published"
                        ? "Original pilot content"
                        : "Content is ready when your teacher releases it.";
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
                          <small>{itemTypeLabel(item.type)}</small>
                          <span className="module-item-detail">
                            {contentDetail}
                          </span>
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

type ItemDraft = {
  title: string;
  content: ModuleItemContent;
};

function draftForItem(item: ModuleItem): ItemDraft {
  return {
    title: item.title,
    content: item.content
      ? structuredClone(item.content)
      : defaultModuleItemContent(item.type),
  };
}

function itemTypeLabel(type: ModuleItemType): string {
  return type === "learning-block"
    ? "Learning block"
    : type.charAt(0).toUpperCase() + type.slice(1);
}

function itemContentSummary(item: ModuleItem): string {
  if (!item.content) {
    return item.state === "published"
      ? "Existing learner item · edit to add content details"
      : "Needs authoring before student release";
  }
  if (item.content.kind === "text") return item.content.body;
  if (item.content.kind === "resource") {
    return item.content.description || "Resource details needed";
  }
  if (item.content.kind === "video") {
    return item.content.description || "Video details needed";
  }
  return item.content.instructions || "Assessment instructions needed";
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function formatAttachmentSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ItemEditor({
  item,
  draft,
  error,
  onChange,
  onSave,
  onCancel,
}: {
  item: ModuleItem;
  draft: ItemDraft;
  error?: string;
  onChange: (draft: ItemDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const updateContent = (content: ModuleItemContent) =>
    onChange({ ...draft, content });
  const content = draft.content;
  return (
    <section
      className="composer-inline-editor"
      id={`editor-for-${item.id}`}
      aria-labelledby={`edit-item-heading-${item.id}`}
    >
      <div className="composer-inline-editor-heading">
        <div>
          <p className="eyebrow">Edit {itemTypeLabel(item.type)}</p>
          <h3 id={`edit-item-heading-${item.id}`}>Learner-facing content</h3>
        </div>
        <span className={`state-pill ${item.state}`}>
          {item.state === "published" ? "Published → draft on save" : "Draft"}
        </span>
      </div>
      <label className="field-label" htmlFor={`edit-item-title-${item.id}`}>
        Title
      </label>
      <input
        id={`edit-item-title-${item.id}`}
        className="composer-editor-input"
        value={draft.title}
        onChange={(event) => onChange({ ...draft, title: event.target.value })}
        autoFocus
      />
      {(content.kind === "text" ||
        content.kind === "resource" ||
        content.kind === "video") && (
        <label
          className="field-label"
          htmlFor={`edit-item-description-${item.id}`}
        >
          {content.kind === "text" ? "Body" : "Description"}
        </label>
      )}
      {content.kind === "text" && (
        <textarea
          id={`edit-item-description-${item.id}`}
          rows={5}
          value={content.body}
          onChange={(event) =>
            updateContent({ ...content, body: event.target.value })
          }
          placeholder="Write what the learner should read, notice, or do."
        />
      )}
      {content.kind === "resource" && (
        <>
          <textarea
            id={`edit-item-description-${item.id}`}
            rows={3}
            value={content.description}
            onChange={(event) =>
              updateContent({ ...content, description: event.target.value })
            }
            placeholder="Explain why this resource matters for the lesson."
          />
          <label
            className="field-label"
            htmlFor={`edit-resource-type-${item.id}`}
          >
            Resource type
          </label>
          <select
            id={`edit-resource-type-${item.id}`}
            value={content.resourceType}
            onChange={(event) => {
              const resourceType = event.target.value as
                | "article"
                | "link"
                | "file";
              updateContent({
                ...content,
                resourceType,
                url: resourceType === "file" ? null : content.url,
                localAttachment:
                  resourceType === "file" ? content.localAttachment : null,
              });
            }}
          >
            <option value="article">Article</option>
            <option value="link">Learning link</option>
            <option value="file">Local demo file metadata</option>
          </select>
          {content.resourceType !== "file" ? (
            <>
              <label
                className="field-label"
                htmlFor={`edit-resource-url-${item.id}`}
              >
                Link URL
              </label>
              <input
                id={`edit-resource-url-${item.id}`}
                type="url"
                value={content.url ?? ""}
                onChange={(event) =>
                  updateContent({ ...content, url: event.target.value })
                }
                placeholder="https://example.edu/learning-resource"
              />
            </>
          ) : (
            <label className="file-picker">
              <span>Select a local file (metadata only)</span>
              <input
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const attachment: LocalAttachmentMetadata = {
                    name: file.name,
                    sizeBytes: file.size,
                    mimeType: file.type || "application/octet-stream",
                    lastModifiedAt: new Date(
                      file.lastModified || Date.now(),
                    ).toISOString(),
                    storage: "browser-demo",
                  };
                  updateContent({
                    ...content,
                    url: null,
                    localAttachment: attachment,
                  });
                  event.currentTarget.value = "";
                }}
              />
            </label>
          )}
          {content.localAttachment && (
            <div className="attachment-note">
              <strong>{content.localAttachment.name}</strong>
              <span>
                {formatAttachmentSize(content.localAttachment.sizeBytes)} ·
                local metadata only
              </span>
            </div>
          )}
          <p className="field-note">
            This prototype never uploads file bytes. A future backend will
            provide durable, permissioned storage.
          </p>
        </>
      )}
      {content.kind === "video" && (
        <>
          <textarea
            id={`edit-item-description-${item.id}`}
            rows={3}
            value={content.description}
            onChange={(event) =>
              updateContent({ ...content, description: event.target.value })
            }
            placeholder="Explain what students should notice while watching."
          />
          <label className="field-label" htmlFor={`edit-video-url-${item.id}`}>
            Video URL
          </label>
          <input
            id={`edit-video-url-${item.id}`}
            type="url"
            value={content.url}
            onChange={(event) =>
              updateContent({ ...content, url: event.target.value })
            }
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="field-note">
            Engagement telemetry is not active in this prototype; no browsing
            outside the LMS is recorded.
          </p>
        </>
      )}
      {content.kind === "assessment-draft" && (
        <>
          <label
            className="field-label"
            htmlFor={`edit-item-instructions-${item.id}`}
          >
            Instructions
          </label>
          <textarea
            id={`edit-item-instructions-${item.id}`}
            rows={4}
            value={content.instructions}
            onChange={(event) =>
              updateContent({ ...content, instructions: event.target.value })
            }
            placeholder="Tell students what evidence they will produce."
          />
          <div className="form-grid-two">
            <label className="field-label">
              Due date (optional)
              <input
                type="datetime-local"
                value={toDateTimeLocal(content.dueAt)}
                onChange={(event) =>
                  updateContent({
                    ...content,
                    dueAt: fromDateTimeLocal(event.target.value),
                  })
                }
              />
            </label>
            <label className="field-label">
              Points (optional)
              <input
                type="number"
                min="0"
                step="1"
                value={content.points ?? ""}
                onChange={(event) =>
                  updateContent({
                    ...content,
                    points: event.target.value
                      ? Number(event.target.value)
                      : null,
                  })
                }
              />
            </label>
          </div>
          <div className="assessment-boundary" role="note">
            <strong>{itemTypeLabel(item.type)} draft only</strong>
            <span>
              No question bank, attempts, grade columns, or live release is
              created here.
            </span>
            <button className="button quiet" type="button" disabled>
              Continue to assessment builder (next slice)
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="field-note composer-error" role="alert">
          {error}
        </p>
      )}
      <div className="composer-editor-actions-row">
        <button className="button primary" type="button" onClick={onSave}>
          Save content
        </button>
        <button className="button quiet" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function TeacherComposer({
  course,
  setCourse,
  setScreen,
  itemDrafts,
  setItemDrafts,
}: {
  course: CourseModel;
  setCourse: Dispatch<SetStateAction<CourseModel>>;
  setScreen: (screen: DemoScreen) => void;
  itemDrafts: Record<string, ItemDraft>;
  setItemDrafts: Dispatch<SetStateAction<Record<string, ItemDraft>>>;
}) {
  const [selectedModuleId, setSelectedModuleId] = useState(
    course.modules.some(
      (module) => module.id === pilotCourseModel.modules[0].id,
    )
      ? pilotCourseModel.modules[0].id
      : (course.modules[0]?.id ?? ""),
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editorErrors, setEditorErrors] = useState<Record<string, string>>({});
  const [orderNotice, setOrderNotice] = useState("");
  const editButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const focusAfterClose = useRef<string | null>(null);
  useEffect(() => {
    if (editingItemId === null && focusAfterClose.current) {
      editButtonRefs.current[focusAfterClose.current]?.focus();
      focusAfterClose.current = null;
    }
  }, [editingItemId]);
  const selectedModule =
    course.modules.find((module) => module.id === selectedModuleId) ??
    course.modules[0];
  const selectedItems = course.items
    .filter((item) => item.moduleId === selectedModule.id)
    .sort((a, b) => a.position - b.position);
  const operationNow = new Date(
    Math.max(
      Date.now(),
      Date.parse(course.course.audit.updatedAt),
      ...course.modules.map((module) => Date.parse(module.audit.updatedAt)),
      ...course.items.map((item) => Date.parse(item.audit.updatedAt)),
    ),
  ).toISOString();

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
      course.items.some(
        (item) =>
          item.id === `${course.course.id}-composer-item-${nextItemNumber}`,
      )
    ) {
      nextItemNumber += 1;
    }
    const item = createModuleItem({
      id: `${course.course.id}-composer-item-${nextItemNumber}`,
      courseId: course.course.id,
      moduleId: selectedModule.id,
      type,
      title: `New ${label.toLowerCase()}`,
      position: selectedItems.length,
      state: "draft",
      actorId: "teacher-1",
      now: operationNow,
    });
    replaceItems([...selectedItems, item]);
    setItemDrafts((current) => ({ ...current, [item.id]: draftForItem(item) }));
    setEditorErrors((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setEditingItemId(item.id);
  };
  const updateItem = (nextItem: ModuleItem) => {
    replaceItems(
      selectedItems.map((item) => (item.id === nextItem.id ? nextItem : item)),
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
        operationNow,
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
        operationNow,
      ),
    }));
    if (module) {
      setOrderNotice(
        `${module.title} moved to position ${targetPosition + 1}.`,
      );
    }
  };
  const setItemState = (item: ModuleItem, nextState: ReleaseState) => {
    updateItem(
      transitionReleaseState(item, nextState, "teacher-1", operationNow),
    );
  };
  const openEditor = (item: ModuleItem) => {
    if (editingItemId === item.id) return;
    setItemDrafts((current) => ({
      ...current,
      [item.id]: current[item.id] ?? draftForItem(item),
    }));
    setEditorErrors((current) => {
      const next = { ...current };
      delete next[item.id];
      return next;
    });
    setEditingItemId(item.id);
  };
  const saveItemContent = (item: ModuleItem) => {
    const draft = itemDrafts[item.id] ?? draftForItem(item);
    try {
      updateItem(
        reviseModuleItem(
          item,
          {
            title: draft.title.trim(),
            type: item.type,
            completion: item.completion,
            availability: item.availability,
            prerequisiteItemIds: item.prerequisiteItemIds,
            content: draft.content,
          },
          "teacher-1",
          operationNow,
        ),
      );
      setEditorErrors((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setEditingItemId(null);
      setItemDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      focusAfterClose.current = item.id;
      setOrderNotice(`${item.title} saved as a new draft revision.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Content is invalid.";
      setEditorErrors((current) => ({
        ...current,
        [item.id]: message.includes("moduleItem.title")
          ? "A module item needs a title before it can be saved."
          : message,
      }));
    }
  };
  const setModuleState = (nextState: ReleaseState) => {
    setCourse((current) => ({
      ...current,
      modules: current.modules.map((module) =>
        module.id === selectedModule.id
          ? transitionReleaseState(module, nextState, "teacher-1", operationNow)
          : module,
      ),
    }));
  };
  const addModule = () => {
    const module = createModule({
      id: `${course.course.id}-composer-module-${course.modules.length + 1}`,
      courseId: course.course.id,
      title: `New module ${course.modules.length + 1}`,
      position: course.modules.length,
      state: "draft",
      actorId: "teacher-1",
      now: operationNow,
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
        <button type="button" onClick={() => setScreen("teacher-dashboard")}>
          ← My workspace
        </button>
        <span className="course-nav-links">
          <span className="course-nav-title">{course.course.title}</span>
          <span className="course-nav-current" aria-current="page">
            Module Composer
          </span>
          {course.course.id === pilotCourseModel.course.id && (
            <button type="button" onClick={() => setScreen("teacher-evidence")}>
              Evidence &amp; marking
            </button>
          )}
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
            onClick={() => setScreen("teacher-student-preview")}
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
                  <h3 className="composer-item-title">{item.title}</h3>
                  <p className="composer-item-summary">
                    {itemContentSummary(item)}
                  </p>
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
                  {editingItemId === item.id && (
                    <ItemEditor
                      item={item}
                      draft={itemDrafts[item.id] ?? draftForItem(item)}
                      error={editorErrors[item.id]}
                      onChange={(draft) =>
                        setItemDrafts((current) => ({
                          ...current,
                          [item.id]: draft,
                        }))
                      }
                      onSave={() => saveItemContent(item)}
                      onCancel={() => {
                        setEditingItemId(null);
                        setItemDrafts((current) => {
                          const next = { ...current };
                          delete next[item.id];
                          return next;
                        });
                        focusAfterClose.current = item.id;
                        setEditorErrors((current) => {
                          const next = { ...current };
                          delete next[item.id];
                          return next;
                        });
                      }}
                    />
                  )}
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
                  <button
                    className="button quiet compact-button"
                    type="button"
                    aria-expanded={editingItemId === item.id}
                    aria-controls={`editor-for-${item.id}`}
                    ref={(element) => {
                      editButtonRefs.current[item.id] = element;
                    }}
                    onClick={() => openEditor(item)}
                  >
                    {editingItemId === item.id ? "Editing" : "Edit content"}
                  </button>
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
                      disabled={
                        item.type === "assignment" ||
                        item.type === "quiz" ||
                        !item.content ||
                        Boolean(itemDrafts[item.id])
                      }
                      onClick={() => setItemState(item, "published")}
                    >
                      {item.type === "assignment" || item.type === "quiz"
                        ? "Builder required"
                        : !item.content || itemDrafts[item.id]
                          ? "Save content first"
                          : "Publish"}
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
  const [screen, setScreenState] = useState<DemoScreen>("teacher-dashboard");
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<WorkspaceSnapshot>(
    () => loadAppWorkspace(window.localStorage),
  );
  const [selectedCourseId, setSelectedCourseId] = useState(
    pilotCourseModel.course.id,
  );
  const [composerDrafts, setComposerDrafts] = useState<
    Record<string, ItemDraft>
  >({});
  const [state, dispatch] = useReducer(
    activityReducer,
    initialActivityState,
    () => loadActivityState(window.localStorage),
  );
  useEffect(() => {
    saveActivityState(window.localStorage, state);
  }, [state]);
  useEffect(() => {
    saveWorkspaceSnapshot(window.localStorage, workspaceSnapshot);
  }, [workspaceSnapshot]);
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const next = (event.state as { learningLoopScreen?: DemoScreen } | null)
        ?.learningLoopScreen;
      setScreenState(next ?? "teacher-dashboard");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setScreen = (next: DemoScreen) => {
    window.history.pushState({ learningLoopScreen: next }, "", `#${next}`);
    setScreenState(next);
  };

  const selectedCourse =
    workspaceSnapshot.courseModels.find(
      (candidate) => candidate.course.id === selectedCourseId,
    ) ??
    workspaceSnapshot.courseModels[0] ??
    pilotCourseModel;
  const setCourse: Dispatch<SetStateAction<CourseModel>> = (update) => {
    setWorkspaceSnapshot((currentSnapshot) => {
      const index = currentSnapshot.courseModels.findIndex(
        (candidate) => candidate.course.id === selectedCourseId,
      );
      if (index < 0) return currentSnapshot;
      const currentCourse = structuredClone(
        currentSnapshot.courseModels[index],
      );
      const nextCourse =
        typeof update === "function" ? update(currentCourse) : update;
      const nextSnapshot = structuredClone(currentSnapshot);
      nextSnapshot.courseModels[index] = structuredClone(nextCourse);
      assertValidWorkspaceSnapshot(nextSnapshot);
      return nextSnapshot;
    });
  };

  const teacherProjection = projectWorkspace(
    workspaceSnapshot.workspace,
    teacherActor,
  );
  const studentProjection = projectWorkspace(
    workspaceSnapshot.workspace,
    studentActor,
  );
  const completedItemIds = new Set(
    state.submitted ? ["welcome", "supply-shock-activity"] : ["welcome"],
  );
  const studentSelectedCourse = studentProjection.courses.some(
    (course) => course.id === selectedCourseId,
  )
    ? workspaceSnapshot.courseModels.find(
        (candidate) => candidate.course.id === selectedCourseId,
      )
    : undefined;
  const studentSelectedCourseProjection = studentSelectedCourse
    ? projectCourse(studentSelectedCourse, "student", {
        now: DEMO_NOW,
        completedItemIds,
      })
    : null;
  const teacherCanPreviewSelectedCourse = teacherProjection.courses.some(
    (course) =>
      course.id === selectedCourseId && course.capabilities.canManageCourse,
  );
  const teacherStudentPreviewProjection = teacherCanPreviewSelectedCourse
    ? projectCourse(selectedCourse, "student", {
        now: DEMO_NOW,
        completedItemIds,
      })
    : null;
  const teacherCourseSummaries = Object.fromEntries(
    teacherProjection.courses.map((course) => {
      const model = workspaceSnapshot.courseModels.find(
        (candidate) => candidate.course.id === course.id,
      );
      return [
        course.id,
        {
          moduleCount: model?.modules.length ?? 0,
          availableItemCount:
            model?.items.filter((item) => item.state === "published").length ??
            0,
          inPreparationCount:
            model?.items.filter((item) =>
              ["draft", "scheduled", "hidden"].includes(item.state),
            ).length ?? 0,
        } satisfies WorkspaceCourseSummary,
      ];
    }),
  );
  const studentCourseSummaries = Object.fromEntries(
    studentProjection.courses.map((course) => {
      const model = workspaceSnapshot.courseModels.find(
        (candidate) => candidate.course.id === course.id,
      );
      const safeProjection = model
        ? projectCourse(model, "student", {
            now: DEMO_NOW,
            completedItemIds,
          })
        : null;
      return [
        course.id,
        {
          moduleCount: safeProjection?.modules.length ?? 0,
          availableItemCount:
            safeProjection?.modules.reduce(
              (total, module) => total + module.items.length,
              0,
            ) ?? 0,
          inPreparationCount: null,
        } satisfies WorkspaceCourseSummary,
      ];
    }),
  );

  const openTeacherCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setScreen("teacher-composer");
  };
  const openStudentCourse = (courseId: string) => {
    if (!studentProjection.courses.some((course) => course.id === courseId)) {
      return;
    }
    setSelectedCourseId(courseId);
    setScreen("student-course");
  };
  const createWorkspaceCourse = (draft: CreateCourseDraft): string | null => {
    const title = draft.title.trim();
    const subject = draft.subject.trim();
    const code = draft.code.trim().toUpperCase();
    const term = draft.term.trim();
    const section = draft.section.trim();
    if (!title || !subject || !code || !term || !section) {
      return "Complete the title, subject, course code, class, and term.";
    }
    const baseId =
      code
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "course";
    let id = baseId;
    let suffix = 2;
    while (
      workspaceSnapshot.workspace.courses.some((course) => course.id === id)
    ) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    const createdAt = new Date(
      Math.max(
        Date.now(),
        Date.parse(workspaceSnapshot.workspace.audit.updatedAt),
      ),
    ).toISOString();
    const course = createCourse({
      id,
      title,
      subject,
      actorId: teacherActor.principalId,
      now: createdAt,
    });
    const firstModule = createModule({
      id: `${id}-module-1`,
      courseId: id,
      title: "Start here",
      position: 0,
      state: "draft",
      actorId: teacherActor.principalId,
      now: createdAt,
    });
    try {
      const next = createCourseInWorkspace(
        workspaceSnapshot,
        teacherActor,
        { course, modules: [firstModule], items: [] },
        {
          code,
          term,
          section,
          visibility: "private",
          creatorMembershipId: `membership-${id}-${teacherActor.principalId}`,
          now: createdAt,
        },
      );
      setWorkspaceSnapshot(next);
      setSelectedCourseId(id);
      setScreen("teacher-composer");
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Course creation failed.";
    }
  };

  return (
    <>
      <PreviewHeader screen={screen} setScreen={setScreen} />
      {screen === "teacher-dashboard" && (
        <WorkspaceDashboard
          role="teacher"
          projection={teacherProjection}
          courseSummaries={teacherCourseSummaries}
          activityState={state}
          onOpenCourse={openTeacherCourse}
          onCreateCourse={createWorkspaceCourse}
        />
      )}
      {(screen === "student-dashboard" ||
        ((screen === "student-course" || screen === "student-activity") &&
          !studentSelectedCourseProjection)) && (
        <WorkspaceDashboard
          role="student"
          projection={studentProjection}
          courseSummaries={studentCourseSummaries}
          activityState={state}
          onOpenCourse={openStudentCourse}
          onCreateCourse={() => "Students cannot create courses."}
        />
      )}
      {screen === "student-course" && studentSelectedCourseProjection && (
        <StudentCourseHome
          projection={studentSelectedCourseProjection}
          state={state}
          onOpenActivity={() => setScreen("student-activity")}
        />
      )}
      {screen === "student-activity" && studentSelectedCourseProjection && (
        <StudentActivity
          state={state}
          dispatch={dispatch}
          onBack={() => setScreen("student-course")}
        />
      )}
      {screen === "teacher-student-preview" &&
        (teacherStudentPreviewProjection ? (
          <StudentCourseHome
            projection={teacherStudentPreviewProjection}
            state={state}
            onOpenActivity={() => setScreen("teacher-student-preview-activity")}
          />
        ) : (
          <TeacherComposer
            course={selectedCourse}
            setCourse={setCourse}
            setScreen={setScreen}
            itemDrafts={composerDrafts}
            setItemDrafts={setComposerDrafts}
          />
        ))}
      {screen === "teacher-student-preview-activity" &&
        (teacherStudentPreviewProjection ? (
          <StudentActivity
            state={state}
            dispatch={dispatch}
            onBack={() => setScreen("teacher-student-preview")}
          />
        ) : (
          <TeacherComposer
            course={selectedCourse}
            setCourse={setCourse}
            setScreen={setScreen}
            itemDrafts={composerDrafts}
            setItemDrafts={setComposerDrafts}
          />
        ))}
      {screen === "teacher-composer" && (
        <TeacherComposer
          course={selectedCourse}
          setCourse={setCourse}
          setScreen={setScreen}
          itemDrafts={composerDrafts}
          setItemDrafts={setComposerDrafts}
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
            window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
            window.localStorage.removeItem(COURSE_STORAGE_KEY);
            setWorkspaceSnapshot(structuredClone(pilotWorkspaceSnapshot));
            setSelectedCourseId(pilotCourseModel.course.id);
            setComposerDrafts({});
            window.history.replaceState(
              { learningLoopScreen: "teacher-dashboard" },
              "",
              "#teacher-dashboard",
            );
            setScreenState("teacher-dashboard");
          }}
        >
          Reset local demo
        </button>
      </footer>
    </>
  );
}
