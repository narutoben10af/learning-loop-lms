import type { AuditFields } from "./course";
import {
  assertValidQuestionBankSnapshot,
  exactQuestionContent,
  exactQuestionFeedback,
  exactQuestionMetadata,
  exactQuestionProvenance,
  getPublishedQuestionVersion,
  type QuestionBankSnapshot,
  type QuestionContent,
  type QuestionFeedback,
  type QuestionMetadata,
  type QuestionProvenance,
} from "./questionBank";
import {
  assertValidWorkspaceSnapshot,
  type StorageLike,
  type WorkspaceActor,
  type WorkspaceMembership,
  type WorkspaceRole,
  type WorkspaceSnapshot,
} from "./workspace";

export const ASSESSMENT_SCHEMA_VERSION = 1 as const;
export const ASSESSMENT_STORAGE_KEY = "learning-loop-assessments-v1";

export type AssessmentState = "draft" | "published" | "closed" | "archived";
export type AttemptState = "in-progress" | "submitted" | "graded" | "released";
export type ResultReleasePolicy = "immediate" | "manual" | "after-close";
export type QuestionReuseMode = "linked-version" | "copied-snapshot";

export interface AssessmentAvailability {
  opensAt: string | null;
  dueAt: string | null;
  closesAt: string | null;
}

export interface AttemptPolicy {
  maxAttempts: number;
  resultRelease: ResultReleasePolicy;
}

export interface AssessmentQuestionItem {
  id: string;
  sourceQuestionId: string;
  sourceQuestionVersion: number;
  reuseMode: QuestionReuseMode;
  points: number;
  metadata: QuestionMetadata;
  content: QuestionContent;
  feedback: QuestionFeedback;
  provenance: QuestionProvenance;
}

export interface AssessmentDraft {
  title: string;
  instructions: string;
  availability: AssessmentAvailability;
  attemptPolicy: AttemptPolicy;
  items: AssessmentQuestionItem[];
  revision: number;
  audit: AuditFields;
}

export interface ReleasedAssessmentVersion {
  version: number;
  title: string;
  instructions: string;
  availability: AssessmentAvailability;
  attemptPolicy: AttemptPolicy;
  items: AssessmentQuestionItem[];
  totalPoints: number;
  releasedBy: string;
  releasedAt: string;
}

export interface CourseAssessment {
  id: string;
  organizationId: string;
  courseId: string;
  ownerPrincipalId: string;
  state: AssessmentState;
  draft: AssessmentDraft;
  releasedVersions: ReleasedAssessmentVersion[];
  activeReleasedVersion: number | null;
  revision: number;
  audit: AuditFields;
}

export type AssessmentResponse =
  | { kind: "option"; optionId: string }
  | { kind: "boolean"; value: boolean }
  | { kind: "text"; value: string };

export interface AttemptResponse {
  itemId: string;
  questionId: string;
  questionVersion: number;
  response: AssessmentResponse;
  answeredAt: string;
}

export interface AttemptItemResult {
  itemId: string;
  correct: boolean | null;
  earnedPoints: number | null;
  maxPoints: number;
  feedback: string | null;
  gradingMethod: "deterministic-v1" | "human-review";
}

export interface GradeEvent {
  id: string;
  itemId: string | null;
  actorId: string;
  actorKind: "system" | "human";
  occurredAt: string;
  reason: string;
  beforePoints: number | null;
  afterPoints: number;
}

export interface AssessmentAttempt {
  id: string;
  organizationId: string;
  courseId: string;
  assessmentId: string;
  assessmentVersion: number;
  studentPrincipalId: string;
  studentMembershipId: string;
  attemptNumber: number;
  state: AttemptState;
  startedAt: string;
  submittedAt: string | null;
  releasedAt: string | null;
  responses: AttemptResponse[];
  results: AttemptItemResult[];
  earnedPoints: number | null;
  maxPoints: number;
  gradeEvents: GradeEvent[];
  revision: number;
  audit: AuditFields;
}

export interface AssessmentSnapshot {
  schemaVersion: typeof ASSESSMENT_SCHEMA_VERSION;
  organizationId: string;
  assessments: CourseAssessment[];
  attempts: AssessmentAttempt[];
  revision: number;
  audit: AuditFields;
}

export type StudentQuestion =
  | {
      type: "multiple-choice";
      prompt: string;
      options: { id: string; text: string }[];
    }
  | { type: "true-false"; prompt: string }
  | { type: "short-answer"; prompt: string };

export interface StudentAssessmentItem {
  id: string;
  points: number;
  question: StudentQuestion;
}

export interface StudentAssessmentProjection {
  id: string;
  courseId: string;
  version: number;
  title: string;
  instructions: string;
  availability: AssessmentAvailability;
  availabilityState: "upcoming" | "open" | "closed";
  attemptPolicy: AttemptPolicy;
  items: StudentAssessmentItem[];
  totalPoints: number;
  attemptsUsed: number;
  canStart: boolean;
}

export interface StudentAttemptProjection {
  id: string;
  assessmentId: string;
  assessmentVersion: number;
  attemptNumber: number;
  state: AttemptState;
  responses: AttemptResponse[];
  results: AttemptItemResult[] | null;
  earnedPoints: number | null;
  maxPoints: number;
}

export interface TeacherAssessmentProjection {
  id: string;
  courseId: string;
  ownerPrincipalId: string;
  state: AssessmentState;
  draft: AssessmentDraft;
  activeRelease: ReleasedAssessmentVersion | null;
  attemptCounts: {
    inProgress: number;
    needsReview: number;
    gradedOrReleased: number;
  };
  capabilities: {
    canEdit: boolean;
    canPublish: boolean;
    canClose: boolean;
  };
}

const states: readonly AssessmentState[] = [
  "draft",
  "published",
  "closed",
  "archived",
];
const attemptStates: readonly AttemptState[] = [
  "in-progress",
  "submitted",
  "graded",
  "released",
];
const releasePolicies: readonly ResultReleasePolicy[] = [
  "immediate",
  "manual",
  "after-close",
];
const reuseModes: readonly QuestionReuseMode[] = [
  "linked-version",
  "copied-snapshot",
];
const administratorRoles = new Set<WorkspaceRole>([
  "platform-owner",
  "organization-administrator",
]);

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

function iso(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be an ISO timestamp`);
  }
  return new Date(Date.parse(value)).toISOString();
}

function nullableIso(value: string | null, label: string): string | null {
  return value === null ? null : iso(value, label);
}

function makeAudit(actorId: string, now: string): AuditFields {
  const actor = requiredText(actorId, "actorId");
  const at = iso(now, "now");
  return { createdBy: actor, createdAt: at, updatedBy: actor, updatedAt: at };
}

function updateAudit(
  current: AuditFields,
  actorId: string,
  now: string,
): AuditFields {
  const at = iso(now, "now");
  if (Date.parse(at) < Date.parse(current.updatedAt)) {
    throw new Error("now cannot precede the current audit timestamp");
  }
  return {
    ...clone(current),
    updatedBy: requiredText(actorId, "actorId"),
    updatedAt: at,
  };
}

function exactAvailability(
  availability: AssessmentAvailability,
): AssessmentAvailability {
  const exact = {
    opensAt: nullableIso(availability.opensAt, "assessment.opensAt"),
    dueAt: nullableIso(availability.dueAt, "assessment.dueAt"),
    closesAt: nullableIso(availability.closesAt, "assessment.closesAt"),
  };
  const opens = exact.opensAt ? Date.parse(exact.opensAt) : null;
  const due = exact.dueAt ? Date.parse(exact.dueAt) : null;
  const closes = exact.closesAt ? Date.parse(exact.closesAt) : null;
  if (opens !== null && due !== null && due < opens) {
    throw new Error("Assessment due time cannot precede its opening time");
  }
  if (opens !== null && closes !== null && closes <= opens) {
    throw new Error("Assessment closing time must follow its opening time");
  }
  if (due !== null && closes !== null && closes < due) {
    throw new Error("Assessment closing time cannot precede its due time");
  }
  return exact;
}

function exactAttemptPolicy(policy: AttemptPolicy): AttemptPolicy {
  if (
    !Number.isInteger(policy.maxAttempts) ||
    policy.maxAttempts < 1 ||
    policy.maxAttempts > 10
  ) {
    throw new Error("Assessment maxAttempts must be an integer from 1 to 10");
  }
  if (!releasePolicies.includes(policy.resultRelease)) {
    throw new Error("Assessment result release policy is invalid");
  }
  return {
    maxAttempts: policy.maxAttempts,
    resultRelease: policy.resultRelease,
  };
}

function exactQuestionItem(
  item: AssessmentQuestionItem,
): AssessmentQuestionItem {
  if (!reuseModes.includes(item.reuseMode)) {
    throw new Error("Assessment question reuse mode is invalid");
  }
  if (
    !Number.isInteger(item.sourceQuestionVersion) ||
    item.sourceQuestionVersion < 1
  ) {
    throw new Error("Assessment question source version must be positive");
  }
  if (!Number.isFinite(item.points) || item.points <= 0 || item.points > 100) {
    throw new Error("Assessment question points must be between 0 and 100");
  }
  return {
    id: requiredText(item.id, "assessment.item.id"),
    sourceQuestionId: requiredText(
      item.sourceQuestionId,
      "assessment.item.sourceQuestionId",
    ),
    sourceQuestionVersion: item.sourceQuestionVersion,
    reuseMode: item.reuseMode,
    points: item.points,
    metadata: exactQuestionMetadata(item.metadata),
    content: exactQuestionContent(item.content),
    feedback: exactQuestionFeedback(item.feedback),
    provenance: exactQuestionProvenance(item.provenance),
  };
}

function courseRoles(
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
): WorkspaceRole[] {
  return workspace.workspace.memberships
    .filter(
      (membership) =>
        membership.organizationId === actor.organizationId &&
        membership.principalId === actor.principalId &&
        membership.status === "active" &&
        (membership.courseId === courseId ||
          (membership.courseId === null &&
            administratorRoles.has(membership.role))),
    )
    .map((membership) => membership.role);
}

function assertCanAuthorCourse(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
): void {
  assertValidAssessmentSnapshot(snapshot);
  assertValidWorkspaceSnapshot(workspace);
  const course = workspace.workspace.courses.find(
    (candidate) => candidate.id === courseId,
  );
  if (!course || course.lifecycle === "archived") {
    throw new Error("Archived courses cannot change assessments");
  }
  if (
    snapshot.organizationId !== actor.organizationId ||
    !courseRoles(workspace, actor, courseId).some((role) =>
      ["platform-owner", "organization-administrator", "teacher"].includes(
        role,
      ),
    )
  ) {
    throw new Error("Actor is not authorised to author this course assessment");
  }
}

function exactStudentMembership(
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
): WorkspaceMembership {
  const membership = workspace.workspace.memberships.find(
    (candidate) =>
      candidate.organizationId === actor.organizationId &&
      candidate.principalId === actor.principalId &&
      candidate.courseId === courseId &&
      candidate.role === "student" &&
      candidate.status === "active",
  );
  const course = workspace.workspace.courses.find(
    (candidate) => candidate.id === courseId,
  );
  if (
    !membership ||
    !course ||
    course.lifecycle !== "active" ||
    course.visibility === "private"
  ) {
    throw new Error("Student is not authorised for this course assessment");
  }
  return membership;
}

function availabilityState(
  availability: AssessmentAvailability,
  now: string,
): "upcoming" | "open" | "closed" {
  const at = Date.parse(iso(now, "now"));
  if (availability.opensAt && at < Date.parse(availability.opensAt)) {
    return "upcoming";
  }
  if (availability.closesAt && at >= Date.parse(availability.closesAt)) {
    return "closed";
  }
  return "open";
}

function activeRelease(
  assessment: CourseAssessment,
): ReleasedAssessmentVersion {
  if (assessment.activeReleasedVersion === null) {
    throw new Error("Assessment has no active released version");
  }
  const release = assessment.releasedVersions.find(
    (candidate) => candidate.version === assessment.activeReleasedVersion,
  );
  if (!release) throw new Error("Assessment release evidence is missing");
  return release;
}

export function createAssessmentSnapshot(
  organizationId: string,
  actorId: string,
  now: string,
  assessments: CourseAssessment[] = [],
  attempts: AssessmentAttempt[] = [],
): AssessmentSnapshot {
  const snapshot: AssessmentSnapshot = {
    schemaVersion: ASSESSMENT_SCHEMA_VERSION,
    organizationId: requiredText(organizationId, "organizationId"),
    assessments: clone(assessments),
    attempts: clone(attempts),
    revision: 1,
    audit: makeAudit(actorId, now),
  };
  assertValidAssessmentSnapshot(snapshot);
  return snapshot;
}

export function createCourseAssessment(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: {
    id: string;
    courseId: string;
    title: string;
    instructions: string;
    availability: AssessmentAvailability;
    attemptPolicy: AttemptPolicy;
    now: string;
  },
): AssessmentSnapshot {
  assertCanAuthorCourse(snapshot, workspace, actor, input.courseId);
  if (snapshot.assessments.some((assessment) => assessment.id === input.id)) {
    throw new Error(`Assessment ID ${input.id} already exists`);
  }
  const at = iso(input.now, "now");
  const audit = makeAudit(actor.principalId, at);
  const assessment: CourseAssessment = {
    id: requiredText(input.id, "assessment.id"),
    organizationId: actor.organizationId,
    courseId: requiredText(input.courseId, "assessment.courseId"),
    ownerPrincipalId: actor.principalId,
    state: "draft",
    draft: {
      title: requiredText(input.title, "assessment.title"),
      instructions: requiredText(input.instructions, "assessment.instructions"),
      availability: exactAvailability(input.availability),
      attemptPolicy: exactAttemptPolicy(input.attemptPolicy),
      items: [],
      revision: 1,
      audit,
    },
    releasedVersions: [],
    activeReleasedVersion: null,
    revision: 1,
    audit,
  };
  const next = clone(snapshot);
  next.assessments.push(assessment);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidAssessmentSnapshot(next);
  return next;
}

export function reviseAssessmentDraft(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: {
    assessmentId: string;
    title: string;
    instructions: string;
    availability: AssessmentAvailability;
    attemptPolicy: AttemptPolicy;
    now: string;
  },
): AssessmentSnapshot {
  const assessment = snapshot.assessments.find(
    (candidate) => candidate.id === input.assessmentId,
  );
  if (!assessment) throw new Error("Assessment does not exist");
  assertCanAuthorCourse(snapshot, workspace, actor, assessment.courseId);
  if (assessment.state !== "draft") {
    throw new Error("Released assessment content is immutable");
  }
  const at = iso(input.now, "now");
  const next = clone(snapshot);
  const target = next.assessments.find(
    (candidate) => candidate.id === input.assessmentId,
  ) as CourseAssessment;
  target.draft.title = requiredText(input.title, "assessment.title");
  target.draft.instructions = requiredText(
    input.instructions,
    "assessment.instructions",
  );
  target.draft.availability = exactAvailability(input.availability);
  target.draft.attemptPolicy = exactAttemptPolicy(input.attemptPolicy);
  target.draft.revision += 1;
  target.draft.audit = updateAudit(target.draft.audit, actor.principalId, at);
  target.revision += 1;
  target.audit = updateAudit(target.audit, actor.principalId, at);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidAssessmentSnapshot(next);
  return next;
}

export function addBankQuestionToAssessment(
  snapshot: AssessmentSnapshot,
  bank: QuestionBankSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: {
    assessmentId: string;
    itemId: string;
    questionId: string;
    questionVersion?: number;
    reuseMode: QuestionReuseMode;
    points: number;
    now: string;
  },
): AssessmentSnapshot {
  assertValidQuestionBankSnapshot(bank);
  const assessment = snapshot.assessments.find(
    (candidate) => candidate.id === input.assessmentId,
  );
  if (!assessment) throw new Error("Assessment does not exist");
  assertCanAuthorCourse(snapshot, workspace, actor, assessment.courseId);
  if (assessment.state !== "draft") {
    throw new Error("Only draft assessments can change question composition");
  }
  if (assessment.draft.items.some((item) => item.id === input.itemId)) {
    throw new Error(`Assessment item ID ${input.itemId} already exists`);
  }
  const { question, version } = getPublishedQuestionVersion(
    bank,
    input.questionId,
    input.questionVersion,
  );
  const roles = courseRoles(workspace, actor, assessment.courseId);
  const canUse =
    question.organizationId === actor.organizationId &&
    (question.sharing === "organization-authors" ||
      question.ownerPrincipalId === actor.principalId ||
      roles.some((role) => administratorRoles.has(role)));
  if (!canUse) throw new Error("Actor cannot reuse this bank question");
  const at = iso(input.now, "now");
  const item = exactQuestionItem({
    id: input.itemId,
    sourceQuestionId: question.id,
    sourceQuestionVersion: version.version,
    reuseMode: input.reuseMode,
    points: input.points,
    metadata: version.metadata,
    content: version.content,
    feedback: version.feedback,
    provenance: version.provenance,
  });
  const next = clone(snapshot);
  const target = next.assessments.find(
    (candidate) => candidate.id === input.assessmentId,
  ) as CourseAssessment;
  target.draft.items.push(item);
  target.draft.revision += 1;
  target.draft.audit = updateAudit(target.draft.audit, actor.principalId, at);
  target.revision += 1;
  target.audit = updateAudit(target.audit, actor.principalId, at);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidAssessmentSnapshot(next);
  return next;
}

export function removeAssessmentQuestion(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  assessmentId: string,
  itemId: string,
  now: string,
): AssessmentSnapshot {
  const assessment = snapshot.assessments.find(
    (candidate) => candidate.id === assessmentId,
  );
  if (!assessment) throw new Error("Assessment does not exist");
  assertCanAuthorCourse(snapshot, workspace, actor, assessment.courseId);
  if (assessment.state !== "draft") {
    throw new Error("Released assessment composition is immutable");
  }
  if (!assessment.draft.items.some((item) => item.id === itemId)) {
    throw new Error("Assessment item does not exist");
  }
  const at = iso(now, "now");
  const next = clone(snapshot);
  const target = next.assessments.find(
    (candidate) => candidate.id === assessmentId,
  ) as CourseAssessment;
  target.draft.items = target.draft.items.filter((item) => item.id !== itemId);
  target.draft.revision += 1;
  target.draft.audit = updateAudit(target.draft.audit, actor.principalId, at);
  target.revision += 1;
  target.audit = updateAudit(target.audit, actor.principalId, at);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidAssessmentSnapshot(next);
  return next;
}

export function publishAssessment(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  assessmentId: string,
  now: string,
): AssessmentSnapshot {
  const assessment = snapshot.assessments.find(
    (candidate) => candidate.id === assessmentId,
  );
  if (!assessment) throw new Error("Assessment does not exist");
  assertCanAuthorCourse(snapshot, workspace, actor, assessment.courseId);
  const course = workspace.workspace.courses.find(
    (candidate) => candidate.id === assessment.courseId,
  );
  if (!course || course.lifecycle !== "active") {
    throw new Error("Assessment can publish only inside an active course");
  }
  if (assessment.state !== "draft" || assessment.releasedVersions.length) {
    throw new Error(
      "This pilot publishes one immutable assessment version only",
    );
  }
  if (!assessment.draft.items.length) {
    throw new Error("Assessment requires at least one published bank question");
  }
  const ids = assessment.draft.items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Assessment item IDs must be unique");
  }
  const at = iso(now, "now");
  const release: ReleasedAssessmentVersion = {
    version: 1,
    title: assessment.draft.title,
    instructions: assessment.draft.instructions,
    availability: clone(assessment.draft.availability),
    attemptPolicy: clone(assessment.draft.attemptPolicy),
    items: clone(assessment.draft.items),
    totalPoints: assessment.draft.items.reduce(
      (total, item) => total + item.points,
      0,
    ),
    releasedBy: actor.principalId,
    releasedAt: at,
  };
  const next = clone(snapshot);
  const target = next.assessments.find(
    (candidate) => candidate.id === assessmentId,
  ) as CourseAssessment;
  target.releasedVersions.push(release);
  target.activeReleasedVersion = release.version;
  target.state = "published";
  target.revision += 1;
  target.audit = updateAudit(target.audit, actor.principalId, at);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidAssessmentSnapshot(next);
  return next;
}

export function closeAssessment(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  assessmentId: string,
  now: string,
): AssessmentSnapshot {
  const assessment = snapshot.assessments.find(
    (candidate) => candidate.id === assessmentId,
  );
  if (!assessment) throw new Error("Assessment does not exist");
  assertCanAuthorCourse(snapshot, workspace, actor, assessment.courseId);
  if (assessment.state !== "published") {
    throw new Error("Only a published assessment can close");
  }
  const at = iso(now, "now");
  const next = clone(snapshot);
  const target = next.assessments.find(
    (candidate) => candidate.id === assessmentId,
  ) as CourseAssessment;
  target.state = "closed";
  target.revision += 1;
  target.audit = updateAudit(target.audit, actor.principalId, at);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidAssessmentSnapshot(next);
  return next;
}

export function projectTeacherAssessments(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
): TeacherAssessmentProjection[] {
  assertCanAuthorCourse(snapshot, workspace, actor, courseId);
  const course = workspace.workspace.courses.find(
    (candidate) => candidate.id === courseId,
  );
  return snapshot.assessments
    .filter((assessment) => assessment.courseId === courseId)
    .map((assessment) => {
      const attempts = snapshot.attempts.filter(
        (attempt) => attempt.assessmentId === assessment.id,
      );
      return {
        id: assessment.id,
        courseId: assessment.courseId,
        ownerPrincipalId: assessment.ownerPrincipalId,
        state: assessment.state,
        draft: clone(assessment.draft),
        activeRelease:
          assessment.activeReleasedVersion === null
            ? null
            : clone(activeRelease(assessment)),
        attemptCounts: {
          inProgress: attempts.filter(
            (attempt) => attempt.state === "in-progress",
          ).length,
          needsReview: attempts.filter(
            (attempt) => attempt.state === "submitted",
          ).length,
          gradedOrReleased: attempts.filter((attempt) =>
            ["graded", "released"].includes(attempt.state),
          ).length,
        },
        capabilities: {
          canEdit: assessment.state === "draft",
          canPublish:
            course?.lifecycle === "active" &&
            assessment.state === "draft" &&
            assessment.draft.items.length > 0,
          canClose: assessment.state === "published",
        },
      };
    });
}

function studentQuestion(content: QuestionContent): StudentQuestion {
  if (content.type === "multiple-choice") {
    return {
      type: "multiple-choice",
      prompt: content.prompt,
      options: content.options.map((option) => ({ ...option })),
    };
  }
  if (content.type === "true-false") {
    return { type: "true-false", prompt: content.prompt };
  }
  return { type: "short-answer", prompt: content.prompt };
}

export function projectStudentAssessments(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
  now: string,
): StudentAssessmentProjection[] {
  assertValidAssessmentSnapshot(snapshot);
  assertValidWorkspaceSnapshot(workspace);
  if (snapshot.organizationId !== actor.organizationId) {
    throw new Error("Assessment snapshot is outside the actor organization");
  }
  const membership = exactStudentMembership(workspace, actor, courseId);
  const at = iso(now, "now");
  return snapshot.assessments.flatMap((assessment) => {
    if (
      assessment.courseId !== courseId ||
      !["published", "closed"].includes(assessment.state) ||
      assessment.activeReleasedVersion === null
    ) {
      return [];
    }
    const release = activeRelease(assessment);
    const state =
      assessment.state === "closed"
        ? "closed"
        : availabilityState(release.availability, at);
    const attemptsUsed = snapshot.attempts.filter(
      (attempt) =>
        attempt.assessmentId === assessment.id &&
        attempt.studentPrincipalId === actor.principalId &&
        attempt.studentMembershipId === membership.id,
    ).length;
    return [
      {
        id: assessment.id,
        courseId,
        version: release.version,
        title: release.title,
        instructions: release.instructions,
        availability: clone(release.availability),
        availabilityState: state,
        attemptPolicy: clone(release.attemptPolicy),
        items:
          state === "open"
            ? release.items.map((item) => ({
                id: item.id,
                points: item.points,
                question: studentQuestion(item.content),
              }))
            : [],
        totalPoints: release.totalPoints,
        attemptsUsed,
        canStart:
          state === "open" && attemptsUsed < release.attemptPolicy.maxAttempts,
      },
    ];
  });
}

export function startAssessmentAttempt(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: { id: string; assessmentId: string; now: string },
): AssessmentSnapshot {
  assertValidAssessmentSnapshot(snapshot);
  assertValidWorkspaceSnapshot(workspace);
  if (snapshot.organizationId !== actor.organizationId) {
    throw new Error("Assessment snapshot is outside the actor organization");
  }
  if (snapshot.attempts.some((attempt) => attempt.id === input.id)) {
    throw new Error(`Attempt ID ${input.id} already exists`);
  }
  const assessment = snapshot.assessments.find(
    (candidate) => candidate.id === input.assessmentId,
  );
  if (!assessment || assessment.state !== "published") {
    throw new Error("Assessment is not open for attempts");
  }
  const membership = exactStudentMembership(
    workspace,
    actor,
    assessment.courseId,
  );
  const release = activeRelease(assessment);
  const at = iso(input.now, "now");
  if (availabilityState(release.availability, at) !== "open") {
    throw new Error("Assessment is outside its availability window");
  }
  const priorAttempts = snapshot.attempts.filter(
    (attempt) =>
      attempt.assessmentId === assessment.id &&
      attempt.studentPrincipalId === actor.principalId,
  );
  if (priorAttempts.length >= release.attemptPolicy.maxAttempts) {
    throw new Error("Assessment attempt limit has been reached");
  }
  const audit = makeAudit(actor.principalId, at);
  const attempt: AssessmentAttempt = {
    id: requiredText(input.id, "attempt.id"),
    organizationId: actor.organizationId,
    courseId: assessment.courseId,
    assessmentId: assessment.id,
    assessmentVersion: release.version,
    studentPrincipalId: actor.principalId,
    studentMembershipId: membership.id,
    attemptNumber: priorAttempts.length + 1,
    state: "in-progress",
    startedAt: at,
    submittedAt: null,
    releasedAt: null,
    responses: [],
    results: [],
    earnedPoints: null,
    maxPoints: release.totalPoints,
    gradeEvents: [],
    revision: 1,
    audit,
  };
  const next = clone(snapshot);
  next.attempts.push(attempt);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidAssessmentSnapshot(next);
  return next;
}

function validateResponseForItem(
  item: AssessmentQuestionItem,
  response: AssessmentResponse,
): AssessmentResponse {
  if (item.content.type === "multiple-choice") {
    if (
      response.kind !== "option" ||
      !item.content.options.some((option) => option.id === response.optionId)
    ) {
      throw new Error("Select one available answer option");
    }
    return { kind: "option", optionId: response.optionId };
  }
  if (item.content.type === "true-false") {
    if (response.kind !== "boolean" || typeof response.value !== "boolean") {
      throw new Error("True/false response must be a boolean");
    }
    return { kind: "boolean", value: response.value };
  }
  if (response.kind !== "text" || !response.value.trim()) {
    throw new Error("Short-answer response is required");
  }
  return { kind: "text", value: response.value.trim() };
}

export function answerAssessmentItem(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: {
    attemptId: string;
    itemId: string;
    response: AssessmentResponse;
    now: string;
  },
): AssessmentSnapshot {
  assertValidAssessmentSnapshot(snapshot);
  assertValidWorkspaceSnapshot(workspace);
  if (snapshot.organizationId !== actor.organizationId) {
    throw new Error("Assessment snapshot is outside the actor organization");
  }
  const attempt = snapshot.attempts.find(
    (candidate) => candidate.id === input.attemptId,
  );
  if (!attempt || attempt.studentPrincipalId !== actor.principalId) {
    throw new Error("Attempt is not available to this student");
  }
  const membership = exactStudentMembership(workspace, actor, attempt.courseId);
  if (attempt.studentMembershipId !== membership.id) {
    throw new Error("Attempt membership evidence is no longer authorised");
  }
  if (attempt.state !== "in-progress") {
    throw new Error("Only an in-progress attempt can change responses");
  }
  const assessment = snapshot.assessments.find(
    (candidate) => candidate.id === attempt.assessmentId,
  ) as CourseAssessment | undefined;
  const release = assessment?.releasedVersions.find(
    (candidate) => candidate.version === attempt.assessmentVersion,
  );
  const item = release?.items.find(
    (candidate) => candidate.id === input.itemId,
  );
  if (!assessment || !release || !item) {
    throw new Error("Attempt assessment evidence is missing");
  }
  const at = iso(input.now, "now");
  if (
    assessment.state !== "published" ||
    availabilityState(release.availability, at) !== "open"
  ) {
    throw new Error("Assessment is no longer open for responses");
  }
  const response = validateResponseForItem(item, input.response);
  const next = clone(snapshot);
  const target = next.attempts.find(
    (candidate) => candidate.id === input.attemptId,
  ) as AssessmentAttempt;
  const existing = target.responses.findIndex(
    (candidate) => candidate.itemId === input.itemId,
  );
  const evidence: AttemptResponse = {
    itemId: item.id,
    questionId: item.sourceQuestionId,
    questionVersion: item.sourceQuestionVersion,
    response,
    answeredAt: at,
  };
  if (existing >= 0) target.responses[existing] = evidence;
  else target.responses.push(evidence);
  target.revision += 1;
  target.audit = updateAudit(target.audit, actor.principalId, at);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidAssessmentSnapshot(next);
  return next;
}

function deterministicResult(
  item: AssessmentQuestionItem,
  response: AttemptResponse,
): AttemptItemResult {
  if (item.content.type === "short-answer") {
    return {
      itemId: item.id,
      correct: null,
      earnedPoints: null,
      maxPoints: item.points,
      feedback: null,
      gradingMethod: "human-review",
    };
  }
  const correct =
    item.content.type === "multiple-choice"
      ? response.response.kind === "option" &&
        response.response.optionId === item.content.correctOptionId
      : response.response.kind === "boolean" &&
        response.response.value === item.content.correctAnswer;
  return {
    itemId: item.id,
    correct,
    earnedPoints: correct ? item.points : 0,
    maxPoints: item.points,
    feedback: correct ? item.feedback.correct : item.feedback.incorrect,
    gradingMethod: "deterministic-v1",
  };
}

export function submitAssessmentAttempt(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  attemptId: string,
  now: string,
): AssessmentSnapshot {
  assertValidAssessmentSnapshot(snapshot);
  assertValidWorkspaceSnapshot(workspace);
  if (snapshot.organizationId !== actor.organizationId) {
    throw new Error("Assessment snapshot is outside the actor organization");
  }
  const attempt = snapshot.attempts.find(
    (candidate) => candidate.id === attemptId,
  );
  if (!attempt || attempt.studentPrincipalId !== actor.principalId) {
    throw new Error("Attempt is not available to this student");
  }
  const membership = exactStudentMembership(workspace, actor, attempt.courseId);
  if (attempt.studentMembershipId !== membership.id) {
    throw new Error("Attempt membership evidence is no longer authorised");
  }
  if (attempt.state !== "in-progress") {
    throw new Error("Only an in-progress attempt can be submitted");
  }
  const assessment = snapshot.assessments.find(
    (candidate) => candidate.id === attempt.assessmentId,
  ) as CourseAssessment | undefined;
  const release = assessment?.releasedVersions.find(
    (candidate) => candidate.version === attempt.assessmentVersion,
  );
  if (!assessment || !release) throw new Error("Assessment release is missing");
  const at = iso(now, "now");
  if (
    assessment.state !== "published" ||
    availabilityState(release.availability, at) !== "open"
  ) {
    throw new Error("Assessment is no longer open for submission");
  }
  const responseByItem = new Map(
    attempt.responses.map((response) => [response.itemId, response]),
  );
  if (release.items.some((item) => !responseByItem.has(item.id))) {
    throw new Error("Answer every question before submitting");
  }
  const results = release.items.map((item) =>
    deterministicResult(item, responseByItem.get(item.id) as AttemptResponse),
  );
  const needsReview = results.some((result) => result.earnedPoints === null);
  const earned = results.reduce(
    (total, result) => total + (result.earnedPoints ?? 0),
    0,
  );
  const immediate =
    !needsReview && release.attemptPolicy.resultRelease === "immediate";
  const next = clone(snapshot);
  const target = next.attempts.find(
    (candidate) => candidate.id === attemptId,
  ) as AssessmentAttempt;
  target.results = results;
  target.earnedPoints = needsReview ? null : earned;
  target.submittedAt = at;
  target.releasedAt = immediate ? at : null;
  target.state = immediate ? "released" : needsReview ? "submitted" : "graded";
  target.gradeEvents.push({
    id: `${attempt.id}:deterministic:${target.revision + 1}`,
    itemId: null,
    actorId: "system:deterministic-v1",
    actorKind: "system",
    occurredAt: at,
    reason: "Scored released objective answer keys deterministically",
    beforePoints: null,
    afterPoints: earned,
  });
  target.revision += 1;
  target.audit = updateAudit(target.audit, actor.principalId, at);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidAssessmentSnapshot(next);
  return next;
}

export function projectStudentAttempt(
  snapshot: AssessmentSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  attemptId: string,
): StudentAttemptProjection {
  assertValidAssessmentSnapshot(snapshot);
  assertValidWorkspaceSnapshot(workspace);
  if (snapshot.organizationId !== actor.organizationId) {
    throw new Error("Assessment snapshot is outside the actor organization");
  }
  const attempt = snapshot.attempts.find(
    (candidate) => candidate.id === attemptId,
  );
  if (!attempt || attempt.studentPrincipalId !== actor.principalId) {
    throw new Error("Attempt is not available to this student");
  }
  const membership = exactStudentMembership(workspace, actor, attempt.courseId);
  if (attempt.studentMembershipId !== membership.id) {
    throw new Error("Attempt membership evidence is no longer authorised");
  }
  return {
    id: attempt.id,
    assessmentId: attempt.assessmentId,
    assessmentVersion: attempt.assessmentVersion,
    attemptNumber: attempt.attemptNumber,
    state: attempt.state,
    responses: clone(attempt.responses),
    results: attempt.state === "released" ? clone(attempt.results) : null,
    earnedPoints: attempt.state === "released" ? attempt.earnedPoints : null,
    maxPoints: attempt.maxPoints,
  };
}

function unexpectedKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): string[] {
  const allow = new Set(allowed);
  const extras = Object.keys(value).filter((key) => !allow.has(key));
  return extras.length
    ? [`${label} has unsupported fields: ${extras.join(", ")}`]
    : [];
}

function validateAudit(value: unknown, label: string): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  const issues = unexpectedKeys(
    value,
    ["createdBy", "createdAt", "updatedBy", "updatedAt"],
    label,
  );
  for (const key of ["createdBy", "updatedBy"] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      issues.push(`${label}.${key} is required`);
    }
  }
  const createdAt = Date.parse(String(value.createdAt));
  const updatedAt = Date.parse(String(value.updatedAt));
  if (!Number.isFinite(createdAt)) issues.push(`${label}.createdAt is invalid`);
  if (!Number.isFinite(updatedAt)) issues.push(`${label}.updatedAt is invalid`);
  if (
    Number.isFinite(createdAt) &&
    Number.isFinite(updatedAt) &&
    updatedAt < createdAt
  ) {
    issues.push(`${label}.updatedAt cannot precede createdAt`);
  }
  return issues;
}

function validateAvailability(value: unknown, label: string): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  const issues = unexpectedKeys(value, ["opensAt", "dueAt", "closesAt"], label);
  try {
    exactAvailability(value as unknown as AssessmentAvailability);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : `${label} is invalid`);
  }
  return issues;
}

function validatePolicy(value: unknown, label: string): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  const issues = unexpectedKeys(value, ["maxAttempts", "resultRelease"], label);
  try {
    exactAttemptPolicy(value as unknown as AttemptPolicy);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : `${label} is invalid`);
  }
  return issues;
}

function validateItem(value: unknown, label: string): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  const issues = unexpectedKeys(
    value,
    [
      "id",
      "sourceQuestionId",
      "sourceQuestionVersion",
      "reuseMode",
      "points",
      "metadata",
      "content",
      "feedback",
      "provenance",
    ],
    label,
  );
  try {
    exactQuestionItem(value as unknown as AssessmentQuestionItem);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : `${label} is invalid`);
  }
  return issues;
}

function validateDraft(value: unknown, label: string): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  const issues = unexpectedKeys(
    value,
    [
      "title",
      "instructions",
      "availability",
      "attemptPolicy",
      "items",
      "revision",
      "audit",
    ],
    label,
  );
  for (const key of ["title", "instructions"] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      issues.push(`${label}.${key} is required`);
    }
  }
  issues.push(
    ...validateAvailability(value.availability, `${label}.availability`),
  );
  issues.push(...validatePolicy(value.attemptPolicy, `${label}.attemptPolicy`));
  if (!Array.isArray(value.items))
    issues.push(`${label}.items must be an array`);
  else {
    const ids = new Set<string>();
    value.items.forEach((item, index) => {
      issues.push(...validateItem(item, `${label}.items[${index}]`));
      if (isRecord(item) && typeof item.id === "string") {
        if (ids.has(item.id)) issues.push(`${label}.item IDs must be unique`);
        ids.add(item.id);
      }
    });
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) {
    issues.push(`${label}.revision must be a positive integer`);
  }
  issues.push(...validateAudit(value.audit, `${label}.audit`));
  return issues;
}

function validateRelease(
  value: unknown,
  index: number,
  label: string,
): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  const issues = unexpectedKeys(
    value,
    [
      "version",
      "title",
      "instructions",
      "availability",
      "attemptPolicy",
      "items",
      "totalPoints",
      "releasedBy",
      "releasedAt",
    ],
    label,
  );
  if (value.version !== index + 1)
    issues.push(`${label}.version must be contiguous`);
  for (const key of ["title", "instructions", "releasedBy"] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      issues.push(`${label}.${key} is required`);
    }
  }
  if (!Number.isFinite(Date.parse(String(value.releasedAt)))) {
    issues.push(`${label}.releasedAt is invalid`);
  }
  issues.push(
    ...validateAvailability(value.availability, `${label}.availability`),
  );
  issues.push(...validatePolicy(value.attemptPolicy, `${label}.attemptPolicy`));
  if (!Array.isArray(value.items) || !value.items.length) {
    issues.push(`${label}.items must be non-empty`);
  } else {
    const itemIds = new Set<string>();
    value.items.forEach((item, itemIndex) => {
      issues.push(...validateItem(item, `${label}.items[${itemIndex}]`));
      if (isRecord(item) && typeof item.id === "string") {
        if (itemIds.has(item.id)) {
          issues.push(`${label}.item IDs must be unique`);
        }
        itemIds.add(item.id);
      }
    });
    const expected = value.items.reduce(
      (total, item) =>
        total +
        (isRecord(item) && typeof item.points === "number" ? item.points : 0),
      0,
    );
    if (value.totalPoints !== expected)
      issues.push(`${label}.totalPoints is inconsistent`);
    if (!Number.isFinite(value.totalPoints) || Number(value.totalPoints) <= 0) {
      issues.push(`${label}.totalPoints must be positive`);
    }
  }
  return issues;
}

function draftMatchesRelease(
  draft: Record<string, unknown>,
  release: Record<string, unknown>,
): boolean {
  return (
    draft.title === release.title &&
    draft.instructions === release.instructions &&
    JSON.stringify(draft.availability) ===
      JSON.stringify(release.availability) &&
    JSON.stringify(draft.attemptPolicy) ===
      JSON.stringify(release.attemptPolicy) &&
    JSON.stringify(draft.items) === JSON.stringify(release.items)
  );
}

function validateResponse(value: unknown, label: string): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  if (value.kind === "option") {
    const issues = unexpectedKeys(value, ["kind", "optionId"], label);
    if (typeof value.optionId !== "string" || !value.optionId.trim()) {
      issues.push(`${label}.optionId is required`);
    }
    return issues;
  }
  if (value.kind === "boolean") {
    const issues = unexpectedKeys(value, ["kind", "value"], label);
    if (typeof value.value !== "boolean")
      issues.push(`${label}.value must be boolean`);
    return issues;
  }
  if (value.kind === "text") {
    const issues = unexpectedKeys(value, ["kind", "value"], label);
    if (typeof value.value !== "string" || !value.value.trim()) {
      issues.push(`${label}.value is required`);
    }
    return issues;
  }
  return [`${label}.kind is invalid`];
}

function validateAttemptResponseEvidence(
  value: unknown,
  label: string,
): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  const issues = unexpectedKeys(
    value,
    ["itemId", "questionId", "questionVersion", "response", "answeredAt"],
    label,
  );
  for (const key of ["itemId", "questionId"] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      issues.push(`${label}.${key} is required`);
    }
  }
  if (
    !Number.isInteger(value.questionVersion) ||
    Number(value.questionVersion) < 1
  ) {
    issues.push(`${label}.questionVersion must be positive`);
  }
  if (!Number.isFinite(Date.parse(String(value.answeredAt)))) {
    issues.push(`${label}.answeredAt is invalid`);
  }
  issues.push(...validateResponse(value.response, `${label}.response`));
  return issues;
}

function validateAttemptResult(value: unknown, label: string): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  const issues = unexpectedKeys(
    value,
    [
      "itemId",
      "correct",
      "earnedPoints",
      "maxPoints",
      "feedback",
      "gradingMethod",
    ],
    label,
  );
  if (typeof value.itemId !== "string" || !value.itemId.trim()) {
    issues.push(`${label}.itemId is required`);
  }
  if (value.correct !== null && typeof value.correct !== "boolean") {
    issues.push(`${label}.correct must be boolean or null`);
  }
  if (
    value.earnedPoints !== null &&
    (!Number.isFinite(value.earnedPoints) || Number(value.earnedPoints) < 0)
  ) {
    issues.push(`${label}.earnedPoints must be non-negative or null`);
  }
  if (!Number.isFinite(value.maxPoints) || Number(value.maxPoints) <= 0) {
    issues.push(`${label}.maxPoints must be positive`);
  }
  if (
    typeof value.earnedPoints === "number" &&
    typeof value.maxPoints === "number" &&
    value.earnedPoints > value.maxPoints
  ) {
    issues.push(`${label}.earnedPoints cannot exceed maxPoints`);
  }
  if (value.feedback !== null && typeof value.feedback !== "string") {
    issues.push(`${label}.feedback must be text or null`);
  }
  if (
    !["deterministic-v1", "human-review"].includes(String(value.gradingMethod))
  ) {
    issues.push(`${label}.gradingMethod is invalid`);
  }
  if (
    value.gradingMethod === "deterministic-v1" &&
    (typeof value.correct !== "boolean" ||
      typeof value.earnedPoints !== "number")
  ) {
    issues.push(
      `${label} deterministic results require a score and correctness`,
    );
  }
  if (
    value.gradingMethod === "human-review" &&
    value.earnedPoints === null &&
    value.correct !== null
  ) {
    issues.push(`${label} pending human review cannot claim correctness`);
  }
  return issues;
}

function validateGradeEvent(value: unknown, label: string): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  const issues = unexpectedKeys(
    value,
    [
      "id",
      "itemId",
      "actorId",
      "actorKind",
      "occurredAt",
      "reason",
      "beforePoints",
      "afterPoints",
    ],
    label,
  );
  for (const key of ["id", "actorId", "reason"] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      issues.push(`${label}.${key} is required`);
    }
  }
  if (
    value.itemId !== null &&
    (typeof value.itemId !== "string" || !value.itemId.trim())
  ) {
    issues.push(`${label}.itemId must be text or null`);
  }
  if (!["system", "human"].includes(String(value.actorKind))) {
    issues.push(`${label}.actorKind is invalid`);
  }
  if (!Number.isFinite(Date.parse(String(value.occurredAt)))) {
    issues.push(`${label}.occurredAt is invalid`);
  }
  if (
    value.beforePoints !== null &&
    (!Number.isFinite(value.beforePoints) || Number(value.beforePoints) < 0)
  ) {
    issues.push(`${label}.beforePoints must be non-negative or null`);
  }
  if (!Number.isFinite(value.afterPoints) || Number(value.afterPoints) < 0) {
    issues.push(`${label}.afterPoints must be non-negative`);
  }
  return issues;
}

function validateAttempt(value: unknown, label: string): string[] {
  if (!isRecord(value)) return [`${label} must be an object`];
  const issues = unexpectedKeys(
    value,
    [
      "id",
      "organizationId",
      "courseId",
      "assessmentId",
      "assessmentVersion",
      "studentPrincipalId",
      "studentMembershipId",
      "attemptNumber",
      "state",
      "startedAt",
      "submittedAt",
      "releasedAt",
      "responses",
      "results",
      "earnedPoints",
      "maxPoints",
      "gradeEvents",
      "revision",
      "audit",
    ],
    label,
  );
  for (const key of [
    "id",
    "organizationId",
    "courseId",
    "assessmentId",
    "studentPrincipalId",
    "studentMembershipId",
  ] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      issues.push(`${label}.${key} is required`);
    }
  }
  if (!attemptStates.includes(value.state as AttemptState)) {
    issues.push(`${label}.state is invalid`);
  }
  for (const key of [
    "assessmentVersion",
    "attemptNumber",
    "revision",
  ] as const) {
    if (!Number.isInteger(value[key]) || Number(value[key]) < 1) {
      issues.push(`${label}.${key} must be a positive integer`);
    }
  }
  if (!Number.isFinite(Date.parse(String(value.startedAt)))) {
    issues.push(`${label}.startedAt is invalid`);
  }
  for (const key of ["submittedAt", "releasedAt"] as const) {
    if (
      value[key] !== null &&
      !Number.isFinite(Date.parse(String(value[key])))
    ) {
      issues.push(`${label}.${key} is invalid`);
    }
  }
  if (value.state === "in-progress" && value.submittedAt !== null) {
    issues.push(`${label} in-progress attempt cannot be submitted`);
  }
  if (value.state !== "in-progress" && value.submittedAt === null) {
    issues.push(`${label} submitted states require submittedAt`);
  }
  if (value.state === "released" && value.releasedAt === null) {
    issues.push(`${label} released attempt requires releasedAt`);
  }
  if (value.state !== "released" && value.releasedAt !== null) {
    issues.push(`${label} unreleased states cannot have releasedAt`);
  }
  const startedAt = Date.parse(String(value.startedAt));
  const submittedAt =
    value.submittedAt === null ? null : Date.parse(String(value.submittedAt));
  const releasedAt =
    value.releasedAt === null ? null : Date.parse(String(value.releasedAt));
  if (
    Number.isFinite(startedAt) &&
    submittedAt !== null &&
    Number.isFinite(submittedAt) &&
    submittedAt < startedAt
  ) {
    issues.push(`${label}.submittedAt cannot precede startedAt`);
  }
  if (
    submittedAt !== null &&
    Number.isFinite(submittedAt) &&
    releasedAt !== null &&
    Number.isFinite(releasedAt) &&
    releasedAt < submittedAt
  ) {
    issues.push(`${label}.releasedAt cannot precede submittedAt`);
  }
  if (!Array.isArray(value.responses))
    issues.push(`${label}.responses must be an array`);
  else {
    value.responses.forEach((raw, index) =>
      issues.push(
        ...validateAttemptResponseEvidence(raw, `${label}.responses[${index}]`),
      ),
    );
  }
  if (!Array.isArray(value.results)) {
    issues.push(`${label}.results must be an array`);
  } else {
    value.results.forEach((result, index) =>
      issues.push(
        ...validateAttemptResult(result, `${label}.results[${index}]`),
      ),
    );
  }
  if (!Array.isArray(value.gradeEvents)) {
    issues.push(`${label}.gradeEvents must be an array`);
  } else {
    value.gradeEvents.forEach((event, index) =>
      issues.push(
        ...validateGradeEvent(event, `${label}.gradeEvents[${index}]`),
      ),
    );
  }
  if (!Number.isFinite(value.maxPoints) || Number(value.maxPoints) < 0) {
    issues.push(`${label}.maxPoints must be non-negative`);
  }
  if (value.earnedPoints !== null && !Number.isFinite(value.earnedPoints)) {
    issues.push(`${label}.earnedPoints must be finite or null`);
  }
  issues.push(...validateAudit(value.audit, `${label}.audit`));
  if (isRecord(value.audit)) {
    if (
      value.studentPrincipalId !== value.audit.createdBy ||
      value.startedAt !== value.audit.createdAt
    ) {
      issues.push(
        `${label} student identity and creation audit must stay aligned`,
      );
    }
    const updatedAt = Date.parse(String(value.audit.updatedAt));
    const submittedAt =
      value.submittedAt === null ? null : Date.parse(String(value.submittedAt));
    const releasedAt =
      value.releasedAt === null ? null : Date.parse(String(value.releasedAt));
    if (
      submittedAt !== null &&
      Number.isFinite(submittedAt) &&
      Number.isFinite(updatedAt) &&
      submittedAt > updatedAt
    ) {
      issues.push(`${label}.submittedAt cannot follow its audit update`);
    }
    if (
      releasedAt !== null &&
      Number.isFinite(releasedAt) &&
      Number.isFinite(updatedAt) &&
      releasedAt > updatedAt
    ) {
      issues.push(`${label}.releasedAt cannot follow its audit update`);
    }
  }
  return issues;
}

export function validateAssessmentSnapshot(value: unknown): string[] {
  if (!isRecord(value)) return ["assessment snapshot must be an object"];
  const issues = unexpectedKeys(
    value,
    [
      "schemaVersion",
      "organizationId",
      "assessments",
      "attempts",
      "revision",
      "audit",
    ],
    "assessment snapshot",
  );
  if (value.schemaVersion !== ASSESSMENT_SCHEMA_VERSION) {
    issues.push("assessment schema version is unsupported");
  }
  if (
    typeof value.organizationId !== "string" ||
    !value.organizationId.trim()
  ) {
    issues.push("assessment snapshot organizationId is required");
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) {
    issues.push("assessment snapshot revision must be a positive integer");
  }
  issues.push(...validateAudit(value.audit, "assessment snapshot audit"));
  const assessmentIds = new Set<string>();
  if (!Array.isArray(value.assessments)) {
    issues.push("assessment snapshot assessments must be an array");
  } else {
    value.assessments.forEach((raw, index) => {
      const label = `assessments[${index}]`;
      if (!isRecord(raw)) {
        issues.push(`${label} must be an object`);
        return;
      }
      issues.push(
        ...unexpectedKeys(
          raw,
          [
            "id",
            "organizationId",
            "courseId",
            "ownerPrincipalId",
            "state",
            "draft",
            "releasedVersions",
            "activeReleasedVersion",
            "revision",
            "audit",
          ],
          label,
        ),
      );
      for (const key of [
        "id",
        "organizationId",
        "courseId",
        "ownerPrincipalId",
      ] as const) {
        if (typeof raw[key] !== "string" || !raw[key].trim()) {
          issues.push(`${label}.${key} is required`);
        }
      }
      if (typeof raw.id === "string") {
        if (assessmentIds.has(raw.id))
          issues.push(`duplicate assessment ID ${raw.id}`);
        assessmentIds.add(raw.id);
      }
      if (raw.organizationId !== value.organizationId) {
        issues.push(`${label}.organizationId must match the snapshot`);
      }
      if (!states.includes(raw.state as AssessmentState))
        issues.push(`${label}.state is invalid`);
      issues.push(...validateDraft(raw.draft, `${label}.draft`));
      if (!Array.isArray(raw.releasedVersions)) {
        issues.push(`${label}.releasedVersions must be an array`);
      } else {
        raw.releasedVersions.forEach((release, releaseIndex) =>
          issues.push(
            ...validateRelease(
              release,
              releaseIndex,
              `${label}.releasedVersions[${releaseIndex}]`,
            ),
          ),
        );
      }
      if (raw.activeReleasedVersion === null) {
        if (raw.state !== "draft")
          issues.push(`${label} released states require an active version`);
        if (
          Array.isArray(raw.releasedVersions) &&
          raw.releasedVersions.length
        ) {
          issues.push(`${label} draft cannot retain released versions`);
        }
      } else if (
        !Number.isInteger(raw.activeReleasedVersion) ||
        !Array.isArray(raw.releasedVersions) ||
        !raw.releasedVersions.some(
          (release) =>
            isRecord(release) && release.version === raw.activeReleasedVersion,
        )
      ) {
        issues.push(`${label}.activeReleasedVersion is inconsistent`);
      } else if (isRecord(raw.draft) && Array.isArray(raw.releasedVersions)) {
        const release = raw.releasedVersions.find(
          (candidate) =>
            isRecord(candidate) &&
            candidate.version === raw.activeReleasedVersion,
        );
        if (isRecord(release) && !draftMatchesRelease(raw.draft, release)) {
          issues.push(
            `${label}.draft must match the immutable active release in this pilot`,
          );
        }
      }
      if (!Number.isInteger(raw.revision) || Number(raw.revision) < 1) {
        issues.push(`${label}.revision must be positive`);
      }
      issues.push(...validateAudit(raw.audit, `${label}.audit`));
      if (isRecord(raw.audit) && isRecord(raw.draft)) {
        const draftAudit = raw.draft.audit;
        if (
          !isRecord(draftAudit) ||
          raw.ownerPrincipalId !== raw.audit.createdBy ||
          raw.audit.createdBy !== draftAudit.createdBy ||
          raw.audit.createdAt !== draftAudit.createdAt
        ) {
          issues.push(`${label} owner and creation audit must stay aligned`);
        }
        const assessmentUpdatedAt = Date.parse(String(raw.audit.updatedAt));
        const draftUpdatedAt = isRecord(draftAudit)
          ? Date.parse(String(draftAudit.updatedAt))
          : Number.NaN;
        if (
          Number.isFinite(assessmentUpdatedAt) &&
          Number.isFinite(draftUpdatedAt) &&
          draftUpdatedAt > assessmentUpdatedAt
        ) {
          issues.push(`${label} draft audit cannot follow assessment audit`);
        }
      }
    });
  }
  const attemptIds = new Set<string>();
  if (!Array.isArray(value.attempts)) {
    issues.push("assessment snapshot attempts must be an array");
  } else {
    value.attempts.forEach((attempt, index) => {
      const label = `attempts[${index}]`;
      issues.push(...validateAttempt(attempt, label));
      if (isRecord(attempt) && typeof attempt.id === "string") {
        if (attemptIds.has(attempt.id))
          issues.push(`duplicate attempt ID ${attempt.id}`);
        attemptIds.add(attempt.id);
      }
      if (!isRecord(attempt)) return;
      const assessment = Array.isArray(value.assessments)
        ? value.assessments.find(
            (candidate) =>
              isRecord(candidate) && candidate.id === attempt.assessmentId,
          )
        : undefined;
      if (!isRecord(assessment)) {
        issues.push(`${label} references an unknown assessment`);
        return;
      }
      if (
        attempt.organizationId !== value.organizationId ||
        attempt.courseId !== assessment.courseId
      ) {
        issues.push(`${label} organization/course scope is inconsistent`);
      }
      const release = Array.isArray(assessment.releasedVersions)
        ? assessment.releasedVersions.find(
            (candidate) =>
              isRecord(candidate) &&
              candidate.version === attempt.assessmentVersion,
          )
        : undefined;
      if (!isRecord(release) || !Array.isArray(release.items)) {
        issues.push(`${label} references an unknown assessment version`);
        return;
      }
      if (attempt.maxPoints !== release.totalPoints) {
        issues.push(`${label}.maxPoints must match the released assessment`);
      }
      const itemById = new Map(
        release.items.flatMap((item) =>
          isRecord(item) && typeof item.id === "string"
            ? [[item.id, item] as const]
            : [],
        ),
      );
      if (Array.isArray(attempt.responses)) {
        const responseIds = new Set<string>();
        for (const response of attempt.responses) {
          if (!isRecord(response) || typeof response.itemId !== "string") {
            continue;
          }
          if (responseIds.has(response.itemId)) {
            issues.push(`${label} response item IDs must be unique`);
          }
          responseIds.add(response.itemId);
          const item = itemById.get(response.itemId);
          if (
            !item ||
            response.questionId !== item.sourceQuestionId ||
            response.questionVersion !== item.sourceQuestionVersion
          ) {
            issues.push(`${label} response question evidence is inconsistent`);
          } else if (isRecord(response.response)) {
            try {
              validateResponseForItem(
                item as unknown as AssessmentQuestionItem,
                response.response as unknown as AssessmentResponse,
              );
            } catch {
              issues.push(
                `${label} response kind is inconsistent with its question`,
              );
            }
          }
          const answeredAt = Date.parse(String(response.answeredAt));
          const startedAt = Date.parse(String(attempt.startedAt));
          const submittedAt =
            attempt.submittedAt === null
              ? null
              : Date.parse(String(attempt.submittedAt));
          if (
            Number.isFinite(answeredAt) &&
            Number.isFinite(startedAt) &&
            answeredAt < startedAt
          ) {
            issues.push(`${label} response cannot precede attempt start`);
          }
          if (
            Number.isFinite(answeredAt) &&
            submittedAt !== null &&
            Number.isFinite(submittedAt) &&
            answeredAt > submittedAt
          ) {
            issues.push(`${label} response cannot follow submission`);
          }
        }
        if (
          attempt.state !== "in-progress" &&
          responseIds.size !== itemById.size
        ) {
          issues.push(`${label} submitted attempts require every response`);
        }
      }
      if (Array.isArray(attempt.results)) {
        const resultIds = new Set<string>();
        let resultTotal = 0;
        let hasPending = false;
        for (const result of attempt.results) {
          if (!isRecord(result) || typeof result.itemId !== "string") continue;
          if (resultIds.has(result.itemId)) {
            issues.push(`${label} result item IDs must be unique`);
          }
          resultIds.add(result.itemId);
          const item = itemById.get(result.itemId);
          if (!item || result.maxPoints !== item.points) {
            issues.push(`${label} result points are inconsistent`);
          } else if (isRecord(item.content)) {
            const expectedMethod =
              item.content.type === "short-answer"
                ? "human-review"
                : "deterministic-v1";
            if (result.gradingMethod !== expectedMethod) {
              issues.push(`${label} result grading method is inconsistent`);
            }
            if (expectedMethod === "deterministic-v1") {
              const response = Array.isArray(attempt.responses)
                ? attempt.responses.find(
                    (candidate) =>
                      isRecord(candidate) && candidate.itemId === result.itemId,
                  )
                : undefined;
              if (isRecord(response) && isRecord(response.response)) {
                try {
                  const expected = deterministicResult(
                    item as unknown as AssessmentQuestionItem,
                    response as unknown as AttemptResponse,
                  );
                  if (
                    result.correct !== expected.correct ||
                    result.earnedPoints !== expected.earnedPoints ||
                    result.feedback !== expected.feedback
                  ) {
                    issues.push(
                      `${label} deterministic result does not match released evidence`,
                    );
                  }
                } catch {
                  issues.push(
                    `${label} deterministic result evidence is invalid`,
                  );
                }
              }
            }
          }
          if (typeof result.earnedPoints === "number") {
            resultTotal += result.earnedPoints;
          } else {
            hasPending = true;
          }
        }
        if (attempt.state === "in-progress" && resultIds.size) {
          issues.push(`${label} in-progress attempts cannot retain results`);
        }
        if (
          attempt.state !== "in-progress" &&
          resultIds.size !== itemById.size
        ) {
          issues.push(`${label} submitted attempts require every result`);
        }
        if (attempt.earnedPoints === null) {
          if (!hasPending && attempt.state !== "in-progress") {
            issues.push(
              `${label}.earnedPoints is missing despite complete scoring`,
            );
          }
        } else if (attempt.earnedPoints !== resultTotal || hasPending) {
          issues.push(
            `${label}.earnedPoints is inconsistent with item results`,
          );
        }
      }
      if (
        Array.isArray(attempt.gradeEvents) &&
        new Set(
          attempt.gradeEvents.flatMap((event) =>
            isRecord(event) && typeof event.id === "string" ? [event.id] : [],
          ),
        ).size !== attempt.gradeEvents.length
      ) {
        issues.push(`${label} grade event IDs must be unique`);
      }
      if (
        attempt.state === "in-progress" &&
        Array.isArray(attempt.gradeEvents) &&
        attempt.gradeEvents.length
      ) {
        issues.push(`${label} in-progress attempts cannot retain grade events`);
      }
      if (Array.isArray(attempt.gradeEvents)) {
        for (const event of attempt.gradeEvents) {
          if (
            isRecord(event) &&
            typeof event.afterPoints === "number" &&
            typeof attempt.maxPoints === "number" &&
            event.afterPoints > attempt.maxPoints
          ) {
            issues.push(`${label} grade event cannot exceed assessment points`);
          }
        }
      }
      const resultRecords = Array.isArray(attempt.results)
        ? attempt.results.filter(isRecord)
        : [];
      const hasHumanReview = release.items.some(
        (item) =>
          isRecord(item) &&
          isRecord(item.content) &&
          item.content.type === "short-answer",
      );
      const deterministicPoints = resultRecords.reduce(
        (total, result) =>
          result.gradingMethod === "deterministic-v1" &&
          typeof result.earnedPoints === "number"
            ? total + result.earnedPoints
            : total,
        0,
      );
      for (const result of resultRecords) {
        if (
          result.gradingMethod === "human-review" &&
          (result.correct !== null ||
            result.earnedPoints !== null ||
            result.feedback !== null)
        ) {
          issues.push(
            `${label} human-review results must remain pending until the human-marking contract is implemented`,
          );
        }
      }
      const gradeEvents = Array.isArray(attempt.gradeEvents)
        ? attempt.gradeEvents.filter(isRecord)
        : [];
      if (attempt.state !== "in-progress") {
        if (gradeEvents.length !== 1) {
          issues.push(
            `${label} submitted attempt requires one deterministic scoring event`,
          );
        } else {
          const event = gradeEvents[0];
          if (
            event.actorKind !== "system" ||
            event.actorId !== "system:deterministic-v1" ||
            event.itemId !== null ||
            event.beforePoints !== null ||
            event.afterPoints !== deterministicPoints ||
            event.occurredAt !== attempt.submittedAt
          ) {
            issues.push(
              `${label} deterministic scoring event is inconsistent with released evidence`,
            );
          }
        }
        if (hasHumanReview) {
          if (
            attempt.state !== "submitted" ||
            attempt.earnedPoints !== null ||
            attempt.releasedAt !== null
          ) {
            issues.push(
              `${label} human-review attempt must remain submitted and unreleased`,
            );
          }
        } else if (isRecord(release.attemptPolicy)) {
          const resultRelease = release.attemptPolicy.resultRelease;
          if (resultRelease === "immediate") {
            if (
              attempt.state !== "released" ||
              attempt.releasedAt !== attempt.submittedAt
            ) {
              issues.push(
                `${label} immediate objective result must release at submission`,
              );
            }
          } else if (
            attempt.state !== "graded" ||
            attempt.releasedAt !== null
          ) {
            issues.push(
              `${label} non-immediate objective result must remain graded and unreleased`,
            );
          }
        }
      }
    });
    const attemptNumbers = new Map<
      string,
      { numbers: number[]; maxAttempts: number }
    >();
    const assessmentRecords = Array.isArray(value.assessments)
      ? value.assessments
      : [];
    for (const attempt of value.attempts) {
      if (!isRecord(attempt)) continue;
      const assessment = assessmentRecords.find(
        (candidate) =>
          isRecord(candidate) && candidate.id === attempt.assessmentId,
      );
      const release =
        isRecord(assessment) && Array.isArray(assessment.releasedVersions)
          ? assessment.releasedVersions.find(
              (candidate) =>
                isRecord(candidate) &&
                candidate.version === attempt.assessmentVersion,
            )
          : undefined;
      if (!isRecord(release) || !isRecord(release.attemptPolicy)) continue;
      const maxAttempts = Number(release.attemptPolicy.maxAttempts);
      if (!Number.isInteger(maxAttempts) || maxAttempts < 1) continue;
      const key = `${String(attempt.assessmentId)}:${String(
        attempt.assessmentVersion,
      )}:${String(attempt.studentPrincipalId)}`;
      const group = attemptNumbers.get(key) ?? {
        numbers: [],
        maxAttempts,
      };
      if (typeof attempt.attemptNumber === "number") {
        group.numbers.push(attempt.attemptNumber);
      }
      attemptNumbers.set(key, group);
    }
    for (const { numbers, maxAttempts } of attemptNumbers.values()) {
      const ordered = [...numbers].sort((left, right) => left - right);
      if (ordered.some((number, index) => number !== index + 1)) {
        issues.push(
          "assessment attempt numbers must be contiguous per student",
        );
      }
      if (
        ordered.length > maxAttempts ||
        ordered.some((number) => number > maxAttempts)
      ) {
        issues.push(
          "assessment attempts cannot exceed the released attempt policy",
        );
      }
    }
  }
  return issues;
}

export function assertValidAssessmentSnapshot(
  value: unknown,
): asserts value is AssessmentSnapshot {
  const issues = validateAssessmentSnapshot(value);
  if (issues.length) throw new Error(issues.join("; "));
}

export function loadAssessmentSnapshot(
  storage: StorageLike,
  fallback: AssessmentSnapshot,
): AssessmentSnapshot {
  try {
    const raw = storage.getItem(ASSESSMENT_STORAGE_KEY);
    if (!raw) return clone(fallback);
    const parsed: unknown = JSON.parse(raw);
    assertValidAssessmentSnapshot(parsed);
    return clone(parsed);
  } catch {
    return clone(fallback);
  }
}

export function saveAssessmentSnapshot(
  storage: StorageLike,
  snapshot: AssessmentSnapshot,
): void {
  assertValidAssessmentSnapshot(snapshot);
  storage.setItem(ASSESSMENT_STORAGE_KEY, JSON.stringify(snapshot));
}
