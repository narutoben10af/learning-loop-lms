import { useEffect, useRef, useState } from "react";
import type { ActivityState } from "./domain/activity";
import type { WorkspaceProjection } from "./domain/workspace";

export type CreateCourseDraft = {
  title: string;
  subject: string;
  code: string;
  term: string;
  section: string;
};

export type WorkspaceCourseSummary = {
  moduleCount: number;
  availableItemCount: number;
  inPreparationCount: number | null;
};

const emptyDraft: CreateCourseDraft = {
  title: "",
  subject: "Economics",
  code: "",
  term: "Term 1 · 2026",
  section: "",
};

export function WorkspaceDashboard({
  role,
  projection,
  courseSummaries,
  activityState,
  onOpenCourse,
  onCreateCourse,
}: {
  role: "teacher" | "student";
  projection: WorkspaceProjection;
  courseSummaries: Readonly<Record<string, WorkspaceCourseSummary>>;
  activityState: ActivityState;
  onOpenCourse: (courseId: string) => void;
  onCreateCourse: (draft: CreateCourseDraft) => string | null;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState<CreateCourseDraft>(emptyDraft);
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement | null>(null);
  const isTeacher = role === "teacher";

  useEffect(() => {
    if (showCreate) titleRef.current?.focus();
  }, [showCreate]);

  const updateDraft = (changes: Partial<CreateCourseDraft>) => {
    setDraft((current) => ({ ...current, ...changes }));
  };

  const submitCreate = () => {
    const nextError = onCreateCourse(draft);
    if (nextError) {
      setError(nextError);
      return;
    }
    setDraft(emptyDraft);
    setError("");
    setShowCreate(false);
  };

  return (
    <main id="main-content" className="workspace-shell">
      <section className="workspace-hero">
        <div>
          <p className="eyebrow">
            {isTeacher ? "Teacher workspace" : "Student workspace"} ·{" "}
            {projection.organization.name}
          </p>
          <h1>{isTeacher ? "My workspace" : "My courses"}</h1>
          <p className="hero-copy">
            {isTeacher
              ? "See what needs attention, open a course, or shape a new learning path without hunting through admin menus."
              : "Continue published learning from one private, uncluttered course list."}
          </p>
        </div>
        {isTeacher && projection.capabilities.canCreateCourse && (
          <button
            className="button primary workspace-create-button"
            type="button"
            aria-expanded={showCreate}
            aria-controls="create-course-panel"
            onClick={() => {
              setShowCreate((current) => !current);
              setError("");
            }}
          >
            {showCreate ? "Close course setup" : "+ Create course"}
          </button>
        )}
      </section>

      {showCreate && isTeacher && (
        <section
          id="create-course-panel"
          className="create-course-panel"
          aria-labelledby="create-course-title"
        >
          <div className="create-course-intro">
            <p className="eyebrow">Private draft first</p>
            <h2 id="create-course-title">Create a clear course home</h2>
            <p>
              Learning Loop creates one draft module and keeps the course
              private until you deliberately publish it.
            </p>
          </div>
          <div className="create-course-fields">
            <label>
              Course title
              <input
                ref={titleRef}
                value={draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
              />
            </label>
            <label>
              Subject
              <input
                value={draft.subject}
                onChange={(event) =>
                  updateDraft({ subject: event.target.value })
                }
              />
            </label>
            <label>
              Course code
              <input
                value={draft.code}
                placeholder="e.g. ECON-10B"
                onChange={(event) => updateDraft({ code: event.target.value })}
              />
            </label>
            <label>
              Class / section
              <input
                value={draft.section}
                placeholder="e.g. 10B"
                onChange={(event) =>
                  updateDraft({ section: event.target.value })
                }
              />
            </label>
            <label className="create-course-term">
              Term
              <input
                value={draft.term}
                onChange={(event) => updateDraft({ term: event.target.value })}
              />
            </label>
          </div>
          {error && (
            <p className="field-note composer-error" role="alert">
              {error}
            </p>
          )}
          <div className="create-course-actions">
            <button
              className="button primary"
              type="button"
              onClick={submitCreate}
            >
              Create private draft
            </button>
            <button
              className="button quiet"
              type="button"
              onClick={() => {
                setShowCreate(false);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
          <p className="privacy-note">
            Local prototype only · no accounts are invited and no student data
            or files leave this browser.
          </p>
        </section>
      )}

      <section className="workspace-summary" aria-label="Workspace summary">
        <article>
          <span>{isTeacher ? "Courses in view" : "Enrolled courses"}</span>
          <strong>{projection.courses.length}</strong>
          <small>{isTeacher ? "Assigned to you" : "Published for you"}</small>
        </article>
        <article>
          <span>{isTeacher ? "Ready for review" : "Next learning step"}</span>
          <strong>
            {isTeacher
              ? activityState.submitted
                ? "4"
                : "3"
              : activityState.submitted
                ? "Review"
                : "Continue"}
          </strong>
          <small>
            {isTeacher ? "Synthetic pilot evidence" : "Economics activity"}
          </small>
        </article>
        <article>
          <span>Privacy</span>
          <strong>Local demo</strong>
          <small>Synthetic identities and browser storage only</small>
        </article>
      </section>

      <section
        className="workspace-courses"
        aria-labelledby="course-list-title"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Course spaces</p>
            <h2 id="course-list-title">
              {isTeacher ? "Teach and manage" : "Continue learning"}
            </h2>
          </div>
          <span className="section-note">
            {isTeacher
              ? "Drafts stay private"
              : "Only authorised published courses appear"}
          </span>
        </div>
        <div className="workspace-course-grid">
          {projection.courses.map((course) => {
            const summary = courseSummaries[course.id] ?? {
              moduleCount: 0,
              availableItemCount: 0,
              inPreparationCount: isTeacher ? 0 : null,
            };
            return (
              <article className="workspace-course-card" key={course.id}>
                <div className="workspace-course-band" aria-hidden="true" />
                <div className="workspace-course-card-body">
                  <div className="workspace-course-meta">
                    <span>{course.code}</span>
                    <span className={`state-pill ${course.lifecycle}`}>
                      {course.lifecycle === "active"
                        ? "Active"
                        : "Private draft"}
                    </span>
                  </div>
                  <h3>{course.title}</h3>
                  <p>
                    {course.subject} · {course.section} · {course.term}
                  </p>
                  <dl className="workspace-course-signals">
                    <div>
                      <dt>Modules</dt>
                      <dd>{summary.moduleCount}</dd>
                    </div>
                    <div>
                      <dt>{isTeacher ? "Published" : "Available"}</dt>
                      <dd>{summary.availableItemCount}</dd>
                    </div>
                    <div>
                      <dt>
                        {isTeacher ? "In preparation" : "Private progress"}
                      </dt>
                      <dd>
                        {isTeacher
                          ? summary.inPreparationCount
                          : activityState.submitted
                            ? "1 complete"
                            : "In progress"}
                      </dd>
                    </div>
                  </dl>
                  <button
                    className="button primary workspace-open-course"
                    type="button"
                    onClick={() => onOpenCourse(course.id)}
                  >
                    {isTeacher ? "Open course workspace" : "Open course"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {projection.courses.length === 0 && (
          <div className="workspace-empty">
            <h3>No courses are available yet.</h3>
            <p>
              Your authorised courses will appear here when they are released.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
