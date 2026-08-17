import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type {
  AssessmentAvailability,
  AssessmentResponse,
  QuestionReuseMode,
  StudentAssessmentProjection,
  StudentAttemptProjection,
  TeacherAssessmentProjection,
} from "./domain/assessment";
import type {
  QuestionBankProjection,
  QuestionContent,
  QuestionFeedback,
  QuestionMetadata,
  QuestionProvenance,
  QuestionSharing,
  QuestionType,
} from "./domain/questionBank";

export interface QuestionAuthoringInput {
  id: string | null;
  sharing: QuestionSharing;
  metadata: QuestionMetadata;
  content: QuestionContent;
  feedback: QuestionFeedback;
  provenance: QuestionProvenance;
}

export interface AssessmentAuthoringInput {
  title: string;
  instructions: string;
  availability: AssessmentAvailability;
  maxAttempts: number;
}

export interface MutationResult {
  error: string | null;
  id?: string;
}

interface TeacherQuizzesProps {
  role: "teacher";
  bank: QuestionBankProjection;
  reviewerBank: QuestionBankProjection;
  assessments: TeacherAssessmentProjection[];
  onSaveQuestion: (input: QuestionAuthoringInput) => MutationResult;
  onRequestQuestionReview: (questionId: string) => string | null;
  onPublishQuestion: (questionId: string) => string | null;
  onCreateAssessment: (input: AssessmentAuthoringInput) => MutationResult;
  onAddQuestion: (input: {
    assessmentId: string;
    questionId: string;
    reuseMode: QuestionReuseMode;
    points: number;
  }) => string | null;
  onRemoveQuestion: (assessmentId: string, itemId: string) => string | null;
  onPublishAssessment: (assessmentId: string) => string | null;
}

interface StudentQuizzesProps {
  role: "student";
  assessments: StudentAssessmentProjection[];
  attemptsByAssessment: Record<string, StudentAttemptProjection[]>;
  onStartAttempt: (assessmentId: string) => MutationResult;
  onAnswer: (
    attemptId: string,
    itemId: string,
    response: AssessmentResponse,
  ) => string | null;
  onSubmit: (attemptId: string) => string | null;
}

export type CourseQuizzesProps = TeacherQuizzesProps | StudentQuizzesProps;

type TeacherTab = "course-quizzes" | "question-bank" | "review";

interface QuestionFormDraft {
  id: string | null;
  type: Extract<QuestionType, "multiple-choice" | "true-false">;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOptionId: "a" | "b" | "c" | "d";
  correctAnswer: "true" | "false";
  correctFeedback: string;
  incorrectFeedback: string;
  subject: string;
  topic: string;
  level: string;
  tags: string;
  sharing: QuestionSharing;
}

const emptyQuestionDraft: QuestionFormDraft = {
  id: null,
  type: "multiple-choice",
  prompt: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOptionId: "a",
  correctAnswer: "true",
  correctFeedback: "",
  incorrectFeedback: "",
  subject: "Economics",
  topic: "Markets",
  level: "IGCSE",
  tags: "markets, equilibrium",
  sharing: "organization-authors",
};

function questionStateLabel(state: string): string {
  if (state === "in-review") return "In review";
  return state.charAt(0).toUpperCase() + state.slice(1);
}

function formatDateTime(value: string | null): string {
  if (!value) return "No date set";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function questionDraftFromProjection(
  item: QuestionBankProjection["questions"][number],
): QuestionFormDraft {
  const content = item.current.content;
  const options =
    content.type === "multiple-choice"
      ? Object.fromEntries(
          content.options.map((option) => [option.id, option.text]),
        )
      : {};
  return {
    id: item.id,
    type: content.type === "true-false" ? "true-false" : "multiple-choice",
    prompt: content.prompt,
    optionA: String(options.a ?? ""),
    optionB: String(options.b ?? ""),
    optionC: String(options.c ?? ""),
    optionD: String(options.d ?? ""),
    correctOptionId:
      content.type === "multiple-choice" &&
      ["a", "b", "c", "d"].includes(content.correctOptionId)
        ? (content.correctOptionId as "a" | "b" | "c" | "d")
        : "a",
    correctAnswer:
      content.type === "true-false" && content.correctAnswer === false
        ? "false"
        : "true",
    correctFeedback: item.current.feedback.correct,
    incorrectFeedback: item.current.feedback.incorrect,
    subject: item.current.metadata.subject,
    topic: item.current.metadata.topic,
    level: item.current.metadata.level,
    tags: item.current.metadata.tags.join(", "),
    sharing: item.sharing,
  };
}

function buildQuestionInput(draft: QuestionFormDraft): QuestionAuthoringInput {
  const prompt = draft.prompt.trim();
  const correct = draft.correctFeedback.trim();
  const incorrect = draft.incorrectFeedback.trim();
  if (!prompt || !correct || !incorrect) {
    throw new Error("Add the prompt and both feedback messages.");
  }
  let content: QuestionContent;
  if (draft.type === "true-false") {
    content = {
      type: "true-false",
      prompt,
      correctAnswer: draft.correctAnswer === "true",
    };
  } else {
    const options = [
      { id: "a", text: draft.optionA.trim() },
      { id: "b", text: draft.optionB.trim() },
      { id: "c", text: draft.optionC.trim() },
      { id: "d", text: draft.optionD.trim() },
    ];
    if (options.some((option) => !option.text)) {
      throw new Error("Add all four answer options.");
    }
    content = {
      type: "multiple-choice",
      prompt,
      options,
      correctOptionId: draft.correctOptionId,
    };
  }
  return {
    id: draft.id,
    sharing: draft.sharing,
    metadata: {
      subject: draft.subject.trim(),
      topic: draft.topic.trim(),
      level: draft.level.trim(),
      standards: [],
      tags: draft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    },
    content,
    feedback: { correct, incorrect },
    provenance: {
      kind: "original",
      sourceLabel: "Teacher-authored in the Learning Loop local pilot",
      sourceUrl: null,
    },
  };
}

function answerKeyLabel(content: QuestionContent): string {
  if (content.type === "multiple-choice") {
    return (
      content.options.find((option) => option.id === content.correctOptionId)
        ?.text ?? "Answer option unavailable"
    );
  }
  if (content.type === "true-false") return String(content.correctAnswer);
  return "Human review only";
}

function QuestionEditor({
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  draft: QuestionFormDraft;
  setDraft: (draft: QuestionFormDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="quiz-editor" aria-labelledby="question-editor-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Objective question</p>
          <h2 id="question-editor-title">
            {draft.id ? "Edit question draft" : "Create a bank question"}
          </h2>
        </div>
        <button className="button quiet" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <p className="field-note">
        This slice supports multiple choice and true/false only. Short answers
        require a separate human-marking workflow and are not offered here.
      </p>
      <div className="quiz-form-grid">
        <label>
          Question type
          <select
            autoFocus
            value={draft.type}
            onChange={(event) =>
              setDraft({
                ...draft,
                type: event.target.value as QuestionFormDraft["type"],
              })
            }
          >
            <option value="multiple-choice">Multiple choice</option>
            <option value="true-false">True / false</option>
          </select>
        </label>
        <label>
          Sharing
          <select
            value={draft.sharing}
            onChange={(event) =>
              setDraft({
                ...draft,
                sharing: event.target.value as QuestionSharing,
              })
            }
          >
            <option value="organization-authors">
              Organisation authors after approval
            </option>
            <option value="private">Private to owner</option>
          </select>
        </label>
      </div>
      <label>
        Prompt
        <textarea
          rows={3}
          value={draft.prompt}
          onChange={(event) =>
            setDraft({ ...draft, prompt: event.target.value })
          }
          placeholder="Ask one clear, original Economics question…"
        />
      </label>
      {draft.type === "multiple-choice" ? (
        <fieldset className="quiz-option-editor">
          <legend>Answer options and released answer key</legend>
          {(["a", "b", "c", "d"] as const).map((id) => {
            const field = `option${id.toUpperCase()}` as
              | "optionA"
              | "optionB"
              | "optionC"
              | "optionD";
            return (
              <div key={id} className="quiz-option-row">
                <input
                  type="radio"
                  name="correct-option"
                  aria-label={`Mark option ${id.toUpperCase()} correct`}
                  checked={draft.correctOptionId === id}
                  onChange={() => setDraft({ ...draft, correctOptionId: id })}
                />
                <label>
                  Option {id.toUpperCase()}
                  <input
                    value={draft[field]}
                    onChange={(event) =>
                      setDraft({ ...draft, [field]: event.target.value })
                    }
                  />
                </label>
              </div>
            );
          })}
        </fieldset>
      ) : (
        <fieldset className="quiz-choice-row">
          <legend>Released answer key</legend>
          <label>
            <input
              type="radio"
              name="true-false-key"
              checked={draft.correctAnswer === "true"}
              onChange={() => setDraft({ ...draft, correctAnswer: "true" })}
            />
            True
          </label>
          <label>
            <input
              type="radio"
              name="true-false-key"
              checked={draft.correctAnswer === "false"}
              onChange={() => setDraft({ ...draft, correctAnswer: "false" })}
            />
            False
          </label>
        </fieldset>
      )}
      <div className="quiz-form-grid">
        <label>
          Feedback when correct
          <textarea
            rows={3}
            value={draft.correctFeedback}
            onChange={(event) =>
              setDraft({ ...draft, correctFeedback: event.target.value })
            }
          />
        </label>
        <label>
          Feedback after an incorrect response
          <textarea
            rows={3}
            value={draft.incorrectFeedback}
            onChange={(event) =>
              setDraft({ ...draft, incorrectFeedback: event.target.value })
            }
          />
        </label>
      </div>
      <details className="quiz-details">
        <summary>Classification and discovery</summary>
        <div className="quiz-form-grid">
          <label>
            Subject
            <input
              value={draft.subject}
              onChange={(event) =>
                setDraft({ ...draft, subject: event.target.value })
              }
            />
          </label>
          <label>
            Topic
            <input
              value={draft.topic}
              onChange={(event) =>
                setDraft({ ...draft, topic: event.target.value })
              }
            />
          </label>
          <label>
            Level
            <input
              value={draft.level}
              onChange={(event) =>
                setDraft({ ...draft, level: event.target.value })
              }
            />
          </label>
          <label>
            Tags, comma separated
            <input
              value={draft.tags}
              onChange={(event) =>
                setDraft({ ...draft, tags: event.target.value })
              }
            />
          </label>
        </div>
      </details>
      <div className="quiz-editor-actions">
        <button className="button primary" type="button" onClick={onSave}>
          Save question draft
        </button>
        <span>Saving never publishes the question.</span>
      </div>
    </section>
  );
}

function QuestionBankView({ props }: { props: TeacherQuizzesProps }) {
  const [editing, setEditing] = useState<QuestionFormDraft | null>(null);
  const [message, setMessage] = useState("");
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const questionRefs = useRef(new Map<string, HTMLElement>());

  const closeEditor = () => {
    const itemId = editing?.id;
    setEditing(null);
    window.requestAnimationFrame(() => {
      if (itemId) questionRefs.current.get(itemId)?.focus();
      else createButtonRef.current?.focus();
    });
  };
  const saveQuestion = () => {
    if (!editing) return;
    try {
      const result = props.onSaveQuestion(buildQuestionInput(editing));
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setMessage("Question draft saved. Review the key, then request review.");
      setEditing(null);
      const id = result.id ?? editing.id;
      window.requestAnimationFrame(() => {
        if (id) questionRefs.current.get(id)?.focus();
        else createButtonRef.current?.focus();
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Check the question.",
      );
    }
  };

  return (
    <section aria-labelledby="bank-title" className="quiz-workspace-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Organisation question bank</p>
          <h1 id="bank-title">Reusable, reviewed questions</h1>
          <p>
            Draft once, review the exact answer key, then deliberately reuse a
            published version across courses.
          </p>
        </div>
        <button
          ref={createButtonRef}
          className="button primary"
          type="button"
          aria-expanded={editing !== null}
          onClick={() => setEditing({ ...emptyQuestionDraft })}
        >
          + New question
        </button>
      </div>
      <div className="scope-banner">
        <strong>Supported now</strong>
        <span>
          Multiple choice · True / false · deterministic released keys
        </span>
        <small>
          Short answer stays human-reviewed and is intentionally unavailable in
          this objective builder.
        </small>
      </div>
      <p className="sr-status" aria-live="polite">
        {message}
      </p>
      {editing && (
        <QuestionEditor
          draft={editing}
          setDraft={setEditing}
          onSave={saveQuestion}
          onCancel={closeEditor}
        />
      )}
      <div className="question-bank-list">
        {props.bank.questions.map((question) => (
          <article
            key={question.id}
            ref={(node) => {
              if (node) questionRefs.current.set(question.id, node);
              else questionRefs.current.delete(question.id);
            }}
            tabIndex={-1}
            className="question-bank-card"
          >
            <div className="question-card-heading">
              <div>
                <span className={`state-pill ${question.current.state}`}>
                  {questionStateLabel(question.current.state)}
                </span>
                <span className="question-type-label">
                  {question.current.content.type === "multiple-choice"
                    ? "Multiple choice"
                    : question.current.content.type === "true-false"
                      ? "True / false"
                      : "Human reviewed"}
                </span>
              </div>
              <small>Version {question.current.version}</small>
            </div>
            <h2>{question.current.content.prompt}</h2>
            <p>
              {question.current.metadata.subject} ·{" "}
              {question.current.metadata.topic}
              {question.current.metadata.tags.length
                ? ` · ${question.current.metadata.tags.join(" · ")}`
                : ""}
            </p>
            <div className="question-evidence-row">
              <span>
                {question.sharing === "private"
                  ? "Private draft"
                  : "Organisation authors after approval"}
              </span>
              <span>{question.current.provenance.sourceLabel}</span>
            </div>
            <div className="question-card-actions">
              {question.capabilities.canEdit && (
                <button
                  className="button quiet"
                  type="button"
                  onClick={() =>
                    setEditing(questionDraftFromProjection(question))
                  }
                >
                  Edit draft
                </button>
              )}
              {question.capabilities.canRequestReview && (
                <button
                  className="button primary"
                  type="button"
                  onClick={() => {
                    const error = props.onRequestQuestionReview(question.id);
                    setMessage(
                      error ??
                        "Review requested. A different named organisation reviewer must publish it.",
                    );
                    window.requestAnimationFrame(() =>
                      questionRefs.current.get(question.id)?.focus(),
                    );
                  }}
                >
                  Request review
                </button>
              )}
              {!question.capabilities.canEdit &&
                !question.capabilities.canRequestReview && (
                  <span className="field-note">
                    {question.current.state === "published"
                      ? "Available for quiz assembly"
                      : "Waiting for organisation review"}
                  </span>
                )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReviewCheckpoint({ props }: { props: TeacherQuizzesProps }) {
  const [message, setMessage] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reviewItems = props.reviewerBank.questions.filter(
    (question) => question.current.state === "in-review",
  );
  useEffect(() => {
    if (message) headingRef.current?.focus();
  }, [message, reviewItems.length]);
  return (
    <section aria-labelledby="review-title" className="quiz-workspace-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Author / QA demo checkpoint</p>
          <h1 id="review-title" ref={headingRef} tabIndex={-1}>
            Organisation review
          </h1>
          <p>
            This is a separate synthetic quality-lead permission, not an
            ordinary teacher self-publish control.
          </p>
        </div>
      </div>
      <div className="scope-banner warning">
        <strong>Named review is enforced</strong>
        <span>The requester cannot approve their own question version.</span>
        <small>
          Production reviewer assignment and notifications require backend
          identity and audit; no message is sent here.
        </small>
      </div>
      <p className="sr-status" aria-live="polite">
        {message}
      </p>
      {reviewItems.length === 0 ? (
        <div className="quiz-empty-state">
          <h2>No questions waiting</h2>
          <p>
            Create a question and request review from the Question bank tab.
          </p>
        </div>
      ) : (
        <div className="question-bank-list">
          {reviewItems.map((question) => (
            <article className="question-bank-card" key={question.id}>
              <span className="state-pill in-review">In review</span>
              <h2>{question.current.content.prompt}</h2>
              <p>
                Requested by {question.current.review?.requestedBy} · version{" "}
                {question.current.version}
              </p>
              <details className="quiz-details">
                <summary>Check released key and feedback</summary>
                <div className="review-answer-key">
                  <strong>Answer key</strong>
                  <p>{answerKeyLabel(question.current.content)}</p>
                  <strong>Correct feedback</strong>
                  <p>{question.current.feedback.correct}</p>
                  <strong>Incorrect feedback</strong>
                  <p>{question.current.feedback.incorrect}</p>
                </div>
              </details>
              <button
                className="button primary"
                type="button"
                disabled={!question.capabilities.canPublish}
                onClick={() => {
                  const error = props.onPublishQuestion(question.id);
                  setMessage(
                    error ??
                      "Question published as an immutable reviewed version.",
                  );
                }}
              >
                Approve and publish
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CourseQuizAuthoring({ props }: { props: TeacherQuizzesProps }) {
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [closesAt, setClosesAt] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [addDrafts, setAddDrafts] = useState<
    Record<
      string,
      { questionId: string; reuseMode: QuestionReuseMode; points: number }
    >
  >({});
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const assessmentRefs = useRef(new Map<string, HTMLElement>());

  const publishedQuestions = props.bank.questions.filter(
    (question) =>
      question.current.state === "published" &&
      (question.current.content.type === "multiple-choice" ||
        question.current.content.type === "true-false"),
  );
  const closeCreate = () => {
    setShowCreate(false);
    window.requestAnimationFrame(() => createButtonRef.current?.focus());
  };
  const submitCreate = (event: FormEvent) => {
    event.preventDefault();
    const result = props.onCreateAssessment({
      title,
      instructions,
      availability: {
        opensAt: toIsoOrNull(opensAt),
        dueAt: toIsoOrNull(dueAt),
        closesAt: toIsoOrNull(closesAt),
      },
      maxAttempts,
    });
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setTitle("");
    setInstructions("");
    setOpensAt("");
    setDueAt("");
    setClosesAt("");
    setMaxAttempts(1);
    setShowCreate(false);
    setMessage("Quiz draft created. Add reviewed questions before release.");
    if (result.id) {
      const id = result.id;
      window.requestAnimationFrame(() =>
        assessmentRefs.current.get(id)?.focus(),
      );
    }
  };

  return (
    <section
      aria-labelledby="course-quiz-title"
      className="quiz-workspace-panel"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Course quizzes</p>
          <h1 id="course-quiz-title">Build one canonical assessment</h1>
          <p>
            Set the learner contract, add exact reviewed question versions,
            preview the release state, then publish once.
          </p>
        </div>
        <button
          ref={createButtonRef}
          className="button primary"
          type="button"
          aria-expanded={showCreate}
          onClick={() => setShowCreate(true)}
        >
          + Create quiz
        </button>
      </div>
      <p className="sr-status" aria-live="polite">
        {message}
      </p>
      {showCreate && (
        <form className="quiz-editor" onSubmit={submitCreate}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Private draft</p>
              <h2>Create a course quiz</h2>
            </div>
            <button
              className="button quiet"
              type="button"
              onClick={closeCreate}
            >
              Cancel
            </button>
          </div>
          <label>
            Quiz title
            <input
              required
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label>
            Learner instructions
            <textarea
              required
              rows={3}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </label>
          <div className="quiz-form-grid three">
            <label>
              Opens
              <input
                type="datetime-local"
                value={opensAt}
                onChange={(event) => setOpensAt(event.target.value)}
              />
            </label>
            <label>
              Due
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </label>
            <label>
              Closes
              <input
                type="datetime-local"
                value={closesAt}
                onChange={(event) => setClosesAt(event.target.value)}
              />
            </label>
          </div>
          <div className="quiz-form-grid">
            <label>
              Maximum attempts
              <select
                value={maxAttempts}
                onChange={(event) => setMaxAttempts(Number(event.target.value))}
              >
                <option value={1}>1 attempt</option>
                <option value={2}>2 attempts</option>
                <option value={3}>3 attempts</option>
              </select>
            </label>
            <div className="read-only-policy">
              <strong>Result release</strong>
              <span>Immediate after objective submission</span>
              <small>
                Manual and after-close release stay unavailable until their
                explicit audited release workflow exists.
              </small>
            </div>
          </div>
          <button className="button primary" type="submit">
            Save private quiz draft
          </button>
        </form>
      )}
      <div className="assessment-list">
        {props.assessments.map((assessment) => {
          const draft = addDrafts[assessment.id] ?? {
            questionId: publishedQuestions[0]?.id ?? "",
            reuseMode: "linked-version" as const,
            points: 1,
          };
          const content = assessment.activeRelease ?? assessment.draft;
          return (
            <article
              key={assessment.id}
              ref={(node) => {
                if (node) assessmentRefs.current.set(assessment.id, node);
                else assessmentRefs.current.delete(assessment.id);
              }}
              tabIndex={-1}
              className="assessment-card"
            >
              <div className="assessment-card-heading">
                <div>
                  <span className={`state-pill ${assessment.state}`}>
                    {questionStateLabel(assessment.state)}
                  </span>
                  <span>{content.items.length} questions</span>
                </div>
                <strong>
                  {content.items.reduce((sum, item) => sum + item.points, 0)}{" "}
                  points
                </strong>
              </div>
              <h2>{content.title}</h2>
              <p>{content.instructions}</p>
              <dl className="assessment-policy-grid">
                <div>
                  <dt>Opens</dt>
                  <dd>{formatDateTime(content.availability.opensAt)}</dd>
                </div>
                <div>
                  <dt>Due</dt>
                  <dd>{formatDateTime(content.availability.dueAt)}</dd>
                </div>
                <div>
                  <dt>Attempts</dt>
                  <dd>{content.attemptPolicy.maxAttempts}</dd>
                </div>
                <div>
                  <dt>Results</dt>
                  <dd>Immediate objective feedback</dd>
                </div>
              </dl>
              {assessment.state === "draft" ? (
                <div className="assessment-composer">
                  <h3>Question sequence</h3>
                  {assessment.draft.items.length === 0 ? (
                    <p className="field-note">
                      Add at least one reviewed question before release.
                    </p>
                  ) : (
                    <ol>
                      {assessment.draft.items.map((item) => (
                        <li key={item.id}>
                          <div>
                            <strong>{item.content.prompt}</strong>
                            <small>
                              {item.reuseMode === "linked-version"
                                ? "Linked exact bank version"
                                : "Copied independent snapshot"}
                              {` · ${item.points} point${item.points === 1 ? "" : "s"}`}
                            </small>
                          </div>
                          <button
                            className="button quiet compact"
                            type="button"
                            onClick={() => {
                              const error = props.onRemoveQuestion(
                                assessment.id,
                                item.id,
                              );
                              setMessage(
                                error ?? "Question removed from draft.",
                              );
                            }}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                  <div className="assessment-add-question">
                    <label>
                      Reviewed bank question
                      <select
                        value={draft.questionId}
                        disabled={publishedQuestions.length === 0}
                        onChange={(event) =>
                          setAddDrafts({
                            ...addDrafts,
                            [assessment.id]: {
                              ...draft,
                              questionId: event.target.value,
                            },
                          })
                        }
                      >
                        {publishedQuestions.length === 0 && (
                          <option value="">No published questions</option>
                        )}
                        {publishedQuestions.map((question) => (
                          <option key={question.id} value={question.id}>
                            {question.current.content.prompt}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Reuse policy
                      <select
                        value={draft.reuseMode}
                        onChange={(event) =>
                          setAddDrafts({
                            ...addDrafts,
                            [assessment.id]: {
                              ...draft,
                              reuseMode: event.target
                                .value as QuestionReuseMode,
                            },
                          })
                        }
                      >
                        <option value="linked-version">
                          Link exact version
                        </option>
                        <option value="copied-snapshot">Copy snapshot</option>
                      </select>
                    </label>
                    <label>
                      Points
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={draft.points}
                        onChange={(event) =>
                          setAddDrafts({
                            ...addDrafts,
                            [assessment.id]: {
                              ...draft,
                              points: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    <button
                      className="button quiet"
                      type="button"
                      disabled={!draft.questionId}
                      onClick={() => {
                        const error = props.onAddQuestion({
                          assessmentId: assessment.id,
                          questionId: draft.questionId,
                          reuseMode: draft.reuseMode,
                          points: draft.points,
                        });
                        setMessage(
                          error ?? "Reviewed question added to quiz draft.",
                        );
                      }}
                    >
                      Add question
                    </button>
                  </div>
                  <div className="release-checklist">
                    <strong>Release check</strong>
                    <ul>
                      <li>
                        {assessment.draft.items.length ? "✓" : "○"} Reviewed
                        question version selected
                      </li>
                      <li>✓ Attempts and availability saved</li>
                      <li>✓ Immediate objective result policy disclosed</li>
                    </ul>
                    <button
                      className="button primary"
                      type="button"
                      disabled={!assessment.capabilities.canPublish}
                      onClick={() => {
                        const error = props.onPublishAssessment(assessment.id);
                        setMessage(
                          error ??
                            "Quiz released as immutable version 1. Student visibility now follows availability.",
                        );
                        window.requestAnimationFrame(() =>
                          assessmentRefs.current.get(assessment.id)?.focus(),
                        );
                      }}
                    >
                      Release quiz version 1
                    </button>
                  </div>
                </div>
              ) : (
                <div className="released-assessment-note">
                  <strong>
                    Immutable released version{" "}
                    {assessment.activeRelease?.version}
                  </strong>
                  <span>
                    {assessment.attemptCounts.inProgress} in progress ·{" "}
                    {assessment.attemptCounts.needsReview} human review ·{" "}
                    {assessment.attemptCounts.gradedOrReleased} graded/released
                  </span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function TeacherQuizzes(props: TeacherQuizzesProps) {
  const [tab, setTab] = useState<TeacherTab>("course-quizzes");
  return (
    <main id="main-content" className="page-shell course-quizzes-shell">
      <div className="quiz-surface-intro">
        <div>
          <p className="eyebrow">Assessment workspace</p>
          <h1>Quizzes that preserve learning evidence</h1>
          <p>
            Author reusable questions, assemble one canonical course quiz, and
            release only the exact version learners will answer.
          </p>
        </div>
        <span className="state-pill published">Local synthetic pilot</span>
      </div>
      <nav className="quiz-tabs" aria-label="Quiz authoring areas">
        {(
          [
            ["course-quizzes", "Course quizzes"],
            ["question-bank", "Question bank"],
            ["review", "Organisation review · QA demo"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "course-quizzes" ? (
        <CourseQuizAuthoring props={props} />
      ) : tab === "question-bank" ? (
        <QuestionBankView props={props} />
      ) : (
        <ReviewCheckpoint props={props} />
      )}
      <p className="privacy-note">
        Local synthetic records only. No external question source, AI provider,
        production identity, notification, file upload, or Gradebook release is
        connected.
      </p>
    </main>
  );
}

function responseForItem(
  attempt: StudentAttemptProjection,
  itemId: string,
): AssessmentResponse | undefined {
  return attempt.responses.find((response) => response.itemId === itemId)
    ?.response;
}

function StudentAttempt({
  assessment,
  attempt,
  onAnswer,
  onSubmit,
  onClose,
}: {
  assessment: StudentAssessmentProjection;
  attempt: StudentAttemptProjection;
  onAnswer: StudentQuizzesProps["onAnswer"];
  onSubmit: StudentQuizzesProps["onSubmit"];
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  const answeredCount = attempt.responses.length;
  const canSubmit =
    attempt.state === "in-progress" &&
    answeredCount === assessment.items.length;
  return (
    <section className="student-quiz-attempt" aria-labelledby="attempt-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            Attempt {attempt.attemptNumber} · version{" "}
            {attempt.assessmentVersion}
          </p>
          <h1 id="attempt-title" ref={titleRef} tabIndex={-1}>
            {assessment.title}
          </h1>
          <p>{assessment.instructions}</p>
        </div>
        <button className="button quiet" type="button" onClick={onClose}>
          Back to quizzes
        </button>
      </div>
      <div className="attempt-progress" aria-label="Attempt progress">
        <strong>
          {answeredCount} of {assessment.items.length} answered
        </strong>
        <span>
          {attempt.state === "released"
            ? "Results released"
            : attempt.state === "in-progress"
              ? "Saved locally as you answer"
              : "Submitted · results withheld"}
        </span>
      </div>
      <p className="sr-status" aria-live="polite">
        {message}
      </p>
      {attempt.state === "in-progress" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const error = onSubmit(attempt.id);
            setMessage(
              error ?? "Attempt submitted. Released results are shown below.",
            );
          }}
        >
          <ol className="student-question-list">
            {assessment.items.map((item, index) => {
              const response = responseForItem(attempt, item.id);
              return (
                <li key={item.id}>
                  <fieldset>
                    <legend>
                      <span>Question {index + 1}</span>
                      {item.question.prompt}
                      <small>
                        {item.points} point{item.points === 1 ? "" : "s"}
                      </small>
                    </legend>
                    {item.question.type === "multiple-choice" ? (
                      item.question.options.map((option) => (
                        <label
                          key={option.id}
                          className="student-answer-option"
                        >
                          <input
                            type="radio"
                            name={`${attempt.id}-${item.id}`}
                            checked={
                              response?.kind === "option" &&
                              response.optionId === option.id
                            }
                            onChange={() => {
                              const error = onAnswer(attempt.id, item.id, {
                                kind: "option",
                                optionId: option.id,
                              });
                              setMessage(
                                error ?? `Question ${index + 1} saved.`,
                              );
                            }}
                          />
                          <span>{option.text}</span>
                        </label>
                      ))
                    ) : item.question.type === "true-false" ? (
                      [true, false].map((value) => (
                        <label
                          key={String(value)}
                          className="student-answer-option"
                        >
                          <input
                            type="radio"
                            name={`${attempt.id}-${item.id}`}
                            checked={
                              response?.kind === "boolean" &&
                              response.value === value
                            }
                            onChange={() => {
                              const error = onAnswer(attempt.id, item.id, {
                                kind: "boolean",
                                value,
                              });
                              setMessage(
                                error ?? `Question ${index + 1} saved.`,
                              );
                            }}
                          />
                          <span>{value ? "True" : "False"}</span>
                        </label>
                      ))
                    ) : (
                      <p className="scope-banner warning">
                        Short answers require human review and are not available
                        in this objective attempt surface.
                      </p>
                    )}
                  </fieldset>
                </li>
              );
            })}
          </ol>
          <div className="attempt-submit-bar">
            <span>
              Submission freezes these responses against assessment version{" "}
              {attempt.assessmentVersion}.
            </span>
            <button
              className="button primary"
              type="submit"
              disabled={!canSubmit}
            >
              Submit attempt
            </button>
          </div>
        </form>
      ) : attempt.state === "released" && attempt.results ? (
        <section className="quiz-result" aria-labelledby="result-title">
          <div>
            <p className="eyebrow">Private released result</p>
            <h2 id="result-title">
              {attempt.earnedPoints} / {attempt.maxPoints} points
            </h2>
            <p>
              Deterministically scored against the immutable released answer
              key. Only this learner can see this result in the pilot.
            </p>
          </div>
          <ol>
            {attempt.results.map((result, index) => (
              <li key={result.itemId}>
                <strong>
                  Question {index + 1} · {result.correct ? "Correct" : "Review"}
                </strong>
                <span>
                  {result.earnedPoints} / {result.maxPoints}
                </span>
                <p>{result.feedback}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <div className="quiz-empty-state">
          <h2>Submitted for human review</h2>
          <p>
            No result is released until an authorised teacher completes the
            later human-marking and release workflow.
          </p>
        </div>
      )}
    </section>
  );
}

function StudentQuizzes(props: StudentQuizzesProps) {
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const active = useMemo(() => {
    for (const assessment of props.assessments) {
      const attempt = (props.attemptsByAssessment[assessment.id] ?? []).find(
        (candidate) => candidate.id === activeAttemptId,
      );
      if (attempt) return { assessment, attempt };
    }
    return null;
  }, [activeAttemptId, props.assessments, props.attemptsByAssessment]);

  if (active) {
    return (
      <main id="main-content" className="page-shell course-quizzes-shell">
        <StudentAttempt
          assessment={active.assessment}
          attempt={active.attempt}
          onAnswer={props.onAnswer}
          onSubmit={props.onSubmit}
          onClose={() => setActiveAttemptId(null)}
        />
      </main>
    );
  }

  return (
    <main id="main-content" className="page-shell course-quizzes-shell">
      <div className="quiz-surface-intro student">
        <div>
          <p className="eyebrow">My course quizzes</p>
          <h1>Check what you understand</h1>
          <p>
            Only released quizzes for this course appear. Your attempts and
            results are private to your authorised course relationship.
          </p>
        </div>
        <span className="state-pill published">Published access only</span>
      </div>
      <p className="sr-status" aria-live="polite">
        {message}
      </p>
      {props.assessments.length === 0 ? (
        <div className="quiz-empty-state">
          <h2>No quiz is available yet</h2>
          <p>Draft, private, closed, and unreleased assessments stay hidden.</p>
        </div>
      ) : (
        <div className="student-assessment-list">
          {props.assessments.map((assessment) => {
            const attempts = props.attemptsByAssessment[assessment.id] ?? [];
            const inProgress = attempts.find(
              (attempt) => attempt.state === "in-progress",
            );
            const latest = attempts.at(-1);
            return (
              <article className="student-assessment-card" key={assessment.id}>
                <div className="assessment-card-heading">
                  <span
                    className={`state-pill ${assessment.availabilityState}`}
                  >
                    {assessment.availabilityState === "open"
                      ? "Open now"
                      : questionStateLabel(assessment.availabilityState)}
                  </span>
                  <strong>{assessment.totalPoints} points</strong>
                </div>
                <h2>{assessment.title}</h2>
                <p>{assessment.instructions}</p>
                <dl className="assessment-policy-grid">
                  <div>
                    <dt>Due</dt>
                    <dd>{formatDateTime(assessment.availability.dueAt)}</dd>
                  </div>
                  <div>
                    <dt>Attempts</dt>
                    <dd>
                      {assessment.attemptsUsed} /{" "}
                      {assessment.attemptPolicy.maxAttempts}
                    </dd>
                  </div>
                  <div>
                    <dt>Questions</dt>
                    <dd>{assessment.items.length || "Revealed when open"}</dd>
                  </div>
                  <div>
                    <dt>Results</dt>
                    <dd>
                      {assessment.attemptPolicy.resultRelease === "immediate"
                        ? "After objective submission"
                        : "Withheld until release"}
                    </dd>
                  </div>
                </dl>
                <div className="student-assessment-actions">
                  {latest?.state === "released" && (
                    <button
                      className="button quiet"
                      type="button"
                      onClick={() => setActiveAttemptId(latest.id)}
                    >
                      View latest result
                    </button>
                  )}
                  <button
                    className="button primary"
                    type="button"
                    disabled={!assessment.canStart && !inProgress}
                    onClick={() => {
                      if (inProgress) {
                        setActiveAttemptId(inProgress.id);
                        return;
                      }
                      const result = props.onStartAttempt(assessment.id);
                      if (result.error) {
                        setMessage(result.error);
                        return;
                      }
                      if (result.id) setActiveAttemptId(result.id);
                    }}
                  >
                    {inProgress
                      ? "Resume attempt"
                      : latest && assessment.canStart
                        ? "Start another attempt"
                        : "Start quiz"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <p className="privacy-note">
        Synthetic local pilot. No other learner's attempts, unreleased answer
        keys, or private Gradebook records are available here.
      </p>
    </main>
  );
}

export function CourseQuizzes(props: CourseQuizzesProps) {
  return props.role === "teacher" ? (
    <TeacherQuizzes {...props} />
  ) : (
    <StudentQuizzes {...props} />
  );
}
