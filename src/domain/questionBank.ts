import type { AuditFields } from "./course";
import {
  assertValidWorkspaceSnapshot,
  type StorageLike,
  type WorkspaceActor,
  type WorkspaceRole,
  type WorkspaceSnapshot,
} from "./workspace";

export const QUESTION_BANK_SCHEMA_VERSION = 1 as const;
export const QUESTION_BANK_STORAGE_KEY = "learning-loop-question-bank-v1";

export type QuestionLifecycle = "draft" | "in-review" | "published" | "retired";
export type QuestionSharing = "private" | "organization-authors";
export type QuestionType = "multiple-choice" | "true-false" | "short-answer";
export type QuestionProvenanceKind = "original" | "synthetic" | "licensed";

export interface QuestionMetadata {
  subject: string;
  topic: string;
  level: string;
  standards: string[];
  tags: string[];
}

export interface QuestionProvenance {
  kind: QuestionProvenanceKind;
  sourceLabel: string;
  sourceUrl: string | null;
}

export type QuestionContent =
  | {
      type: "multiple-choice";
      prompt: string;
      options: { id: string; text: string }[];
      correctOptionId: string;
    }
  | {
      type: "true-false";
      prompt: string;
      correctAnswer: boolean;
    }
  | {
      type: "short-answer";
      prompt: string;
      markingGuidance: string;
    };

export interface QuestionFeedback {
  correct: string;
  incorrect: string;
}

export interface QuestionReview {
  requestedBy: string;
  requestedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface QuestionVersion {
  version: number;
  revision: number;
  state: QuestionLifecycle;
  metadata: QuestionMetadata;
  content: QuestionContent;
  feedback: QuestionFeedback;
  provenance: QuestionProvenance;
  review: QuestionReview | null;
  audit: AuditFields;
}

export interface BankQuestion {
  id: string;
  organizationId: string;
  ownerPrincipalId: string;
  sharing: QuestionSharing;
  versions: QuestionVersion[];
  publishedVersion: number | null;
  revision: number;
  audit: AuditFields;
}

export interface QuestionBankSnapshot {
  schemaVersion: typeof QUESTION_BANK_SCHEMA_VERSION;
  organizationId: string;
  questions: BankQuestion[];
  revision: number;
  audit: AuditFields;
}

export interface QuestionBankProjectionItem {
  id: string;
  ownerPrincipalId: string;
  sharing: QuestionSharing;
  publishedVersion: number | null;
  current: QuestionVersion;
  capabilities: {
    canEdit: boolean;
    canRequestReview: boolean;
    canPublish: boolean;
    canCreateRevision: boolean;
  };
}

export interface QuestionBankProjection {
  organizationId: string;
  viewerRole: WorkspaceRole;
  questions: QuestionBankProjectionItem[];
  capabilities: {
    canCreate: boolean;
    canReview: boolean;
  };
}

export interface CreateQuestionInput {
  id: string;
  sharing: QuestionSharing;
  metadata: QuestionMetadata;
  content: QuestionContent;
  feedback: QuestionFeedback;
  provenance: QuestionProvenance;
  now: string;
}

const administratorRoles = new Set<WorkspaceRole>([
  "platform-owner",
  "organization-administrator",
]);
const authorRoles = new Set<WorkspaceRole>([
  "platform-owner",
  "organization-administrator",
  "teacher",
]);
const lifecycles: readonly QuestionLifecycle[] = [
  "draft",
  "in-review",
  "published",
  "retired",
];
const sharingValues: readonly QuestionSharing[] = [
  "private",
  "organization-authors",
];
const provenanceKinds: readonly QuestionProvenanceKind[] = [
  "original",
  "synthetic",
  "licensed",
];

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

function timestamp(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be an ISO timestamp`);
  }
  return new Date(Date.parse(value)).toISOString();
}

function makeAudit(actorId: string, now: string): AuditFields {
  const actor = requiredText(actorId, "actorId");
  const at = timestamp(now, "now");
  return { createdBy: actor, createdAt: at, updatedBy: actor, updatedAt: at };
}

function updateAudit(
  current: AuditFields,
  actorId: string,
  now: string,
): AuditFields {
  const at = timestamp(now, "now");
  if (Date.parse(at) < Date.parse(current.updatedAt)) {
    throw new Error("now cannot precede the current audit timestamp");
  }
  return {
    ...clone(current),
    updatedBy: requiredText(actorId, "actorId"),
    updatedAt: at,
  };
}

function rolesForOrganization(
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
): WorkspaceRole[] {
  if (workspace.workspace.organization.id !== actor.organizationId) return [];
  return workspace.workspace.memberships
    .filter(
      (membership) =>
        membership.organizationId === actor.organizationId &&
        membership.principalId === actor.principalId &&
        membership.status === "active",
    )
    .map((membership) => membership.role);
}

function highestRole(roles: WorkspaceRole[]): WorkspaceRole {
  const priority: WorkspaceRole[] = [
    "platform-owner",
    "organization-administrator",
    "teacher",
    "teaching-assistant",
    "student",
    "parent-guardian",
  ];
  const role = priority.find((candidate) => roles.includes(candidate));
  if (!role) throw new Error("Actor has no active organization relationship");
  return role;
}

function assertAuthor(
  bank: QuestionBankSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
): WorkspaceRole[] {
  assertValidQuestionBankSnapshot(bank);
  assertValidWorkspaceSnapshot(workspace);
  if (
    bank.organizationId !== actor.organizationId ||
    workspace.workspace.organization.id !== actor.organizationId
  ) {
    throw new Error("Actor is not authorised for this organization bank");
  }
  const roles = rolesForOrganization(workspace, actor);
  if (!roles.some((role) => authorRoles.has(role))) {
    throw new Error("Actor is not authorised to author bank questions");
  }
  return roles;
}

function canManageQuestion(
  question: BankQuestion,
  actor: WorkspaceActor,
  roles: WorkspaceRole[],
): boolean {
  return (
    question.ownerPrincipalId === actor.principalId ||
    roles.some((role) => administratorRoles.has(role))
  );
}

function normalizeStringList(values: string[], label: string): string[] {
  const normalized = values.map((value) => requiredText(value, label));
  return [...new Set(normalized)].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function exactQuestionMetadata(
  metadata: QuestionMetadata,
): QuestionMetadata {
  return {
    subject: requiredText(metadata.subject, "question.metadata.subject"),
    topic: requiredText(metadata.topic, "question.metadata.topic"),
    level: requiredText(metadata.level, "question.metadata.level"),
    standards: normalizeStringList(
      metadata.standards,
      "question.metadata.standard",
    ),
    tags: normalizeStringList(metadata.tags, "question.metadata.tag"),
  };
}

export function exactQuestionContent(
  content: QuestionContent,
): QuestionContent {
  if (content.type === "multiple-choice") {
    const options = content.options.map((option) => ({
      id: requiredText(option.id, "question.option.id"),
      text: requiredText(option.text, "question.option.text"),
    }));
    if (options.length < 2) {
      throw new Error("Multiple-choice questions require at least two options");
    }
    if (new Set(options.map((option) => option.id)).size !== options.length) {
      throw new Error("Question option IDs must be unique");
    }
    const correctOptionId = requiredText(
      content.correctOptionId,
      "question.correctOptionId",
    );
    if (!options.some((option) => option.id === correctOptionId)) {
      throw new Error("Correct option must reference an available option");
    }
    return {
      type: "multiple-choice",
      prompt: requiredText(content.prompt, "question.prompt"),
      options,
      correctOptionId,
    };
  }
  if (content.type === "true-false") {
    if (typeof content.correctAnswer !== "boolean") {
      throw new Error("True/false questions require a boolean answer");
    }
    return {
      type: "true-false",
      prompt: requiredText(content.prompt, "question.prompt"),
      correctAnswer: content.correctAnswer,
    };
  }
  if (content.type === "short-answer") {
    return {
      type: "short-answer",
      prompt: requiredText(content.prompt, "question.prompt"),
      markingGuidance: requiredText(
        content.markingGuidance,
        "question.markingGuidance",
      ),
    };
  }
  throw new Error("Question type is not supported in this pilot");
}

export function exactQuestionFeedback(
  feedback: QuestionFeedback,
): QuestionFeedback {
  return {
    correct: requiredText(feedback.correct, "question.feedback.correct"),
    incorrect: requiredText(feedback.incorrect, "question.feedback.incorrect"),
  };
}

export function exactQuestionProvenance(
  provenance: QuestionProvenance,
): QuestionProvenance {
  if (!provenanceKinds.includes(provenance.kind)) {
    throw new Error("Question provenance kind is invalid");
  }
  let sourceUrl: string | null = null;
  if (provenance.sourceUrl) {
    const url = new URL(provenance.sourceUrl);
    if (url.protocol !== "https:" || url.username || url.password) {
      throw new Error("Question provenance URL must be credential-free HTTPS");
    }
    sourceUrl = url.toString();
  }
  return {
    kind: provenance.kind,
    sourceLabel: requiredText(
      provenance.sourceLabel,
      "question.provenance.sourceLabel",
    ),
    sourceUrl,
  };
}

function currentVersion(question: BankQuestion): QuestionVersion {
  const version = question.versions.at(-1);
  if (!version) throw new Error("Question has no version");
  return version;
}

export function createQuestionBankSnapshot(
  organizationId: string,
  actorId: string,
  now: string,
  questions: BankQuestion[] = [],
): QuestionBankSnapshot {
  const snapshot: QuestionBankSnapshot = {
    schemaVersion: QUESTION_BANK_SCHEMA_VERSION,
    organizationId: requiredText(organizationId, "organizationId"),
    questions: clone(questions),
    revision: 1,
    audit: makeAudit(actorId, now),
  };
  assertValidQuestionBankSnapshot(snapshot);
  return snapshot;
}

export function createQuestion(
  bank: QuestionBankSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: CreateQuestionInput,
): QuestionBankSnapshot {
  assertAuthor(bank, workspace, actor);
  if (bank.questions.some((question) => question.id === input.id)) {
    throw new Error(`Question ID ${input.id} already exists`);
  }
  if (!sharingValues.includes(input.sharing)) {
    throw new Error("Question sharing is invalid");
  }
  const now = timestamp(input.now, "now");
  const audit = makeAudit(actor.principalId, now);
  const question: BankQuestion = {
    id: requiredText(input.id, "question.id"),
    organizationId: actor.organizationId,
    ownerPrincipalId: actor.principalId,
    sharing: input.sharing,
    versions: [
      {
        version: 1,
        revision: 1,
        state: "draft",
        metadata: exactQuestionMetadata(input.metadata),
        content: exactQuestionContent(input.content),
        feedback: exactQuestionFeedback(input.feedback),
        provenance: exactQuestionProvenance(input.provenance),
        review: null,
        audit,
      },
    ],
    publishedVersion: null,
    revision: 1,
    audit,
  };
  const next = clone(bank);
  next.questions.push(question);
  next.questions.sort((left, right) => left.id.localeCompare(right.id));
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, now);
  assertValidQuestionBankSnapshot(next);
  return next;
}

export function reviseQuestionDraft(
  bank: QuestionBankSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: Omit<CreateQuestionInput, "id" | "sharing"> & {
    questionId: string;
    sharing: QuestionSharing;
  },
): QuestionBankSnapshot {
  const roles = assertAuthor(bank, workspace, actor);
  const question = bank.questions.find(
    (candidate) => candidate.id === input.questionId,
  );
  if (!question) throw new Error("Question does not exist");
  if (!canManageQuestion(question, actor, roles)) {
    throw new Error("Actor cannot edit this question");
  }
  const version = currentVersion(question);
  if (version.state !== "draft") {
    throw new Error("Only the current draft question version can be edited");
  }
  if (
    question.publishedVersion !== null &&
    input.sharing !== question.sharing
  ) {
    throw new Error(
      "Sharing for published questions requires a separate permission workflow",
    );
  }
  const now = timestamp(input.now, "now");
  const next = clone(bank);
  const target = next.questions.find(
    (candidate) => candidate.id === input.questionId,
  ) as BankQuestion;
  target.sharing = input.sharing;
  target.revision += 1;
  target.audit = updateAudit(target.audit, actor.principalId, now);
  const draft = currentVersion(target);
  draft.revision += 1;
  draft.metadata = exactQuestionMetadata(input.metadata);
  draft.content = exactQuestionContent(input.content);
  draft.feedback = exactQuestionFeedback(input.feedback);
  draft.provenance = exactQuestionProvenance(input.provenance);
  draft.audit = updateAudit(draft.audit, actor.principalId, now);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, now);
  assertValidQuestionBankSnapshot(next);
  return next;
}

export function requestQuestionReview(
  bank: QuestionBankSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  questionId: string,
  now: string,
): QuestionBankSnapshot {
  const roles = assertAuthor(bank, workspace, actor);
  const question = bank.questions.find(
    (candidate) => candidate.id === questionId,
  );
  if (!question) throw new Error("Question does not exist");
  if (!canManageQuestion(question, actor, roles)) {
    throw new Error("Actor cannot request review for this question");
  }
  if (currentVersion(question).state !== "draft") {
    throw new Error("Only a draft question can enter review");
  }
  const at = timestamp(now, "now");
  const next = clone(bank);
  const target = next.questions.find(
    (candidate) => candidate.id === questionId,
  ) as BankQuestion;
  const version = currentVersion(target);
  version.state = "in-review";
  version.review = {
    requestedBy: actor.principalId,
    requestedAt: at,
    reviewedBy: null,
    reviewedAt: null,
  };
  version.revision += 1;
  version.audit = updateAudit(version.audit, actor.principalId, at);
  target.revision += 1;
  target.audit = updateAudit(target.audit, actor.principalId, at);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidQuestionBankSnapshot(next);
  return next;
}

export function publishQuestion(
  bank: QuestionBankSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  questionId: string,
  now: string,
): QuestionBankSnapshot {
  const roles = assertAuthor(bank, workspace, actor);
  if (!roles.some((role) => administratorRoles.has(role))) {
    throw new Error("Only an organization reviewer can publish questions");
  }
  const question = bank.questions.find(
    (candidate) => candidate.id === questionId,
  );
  if (!question) throw new Error("Question does not exist");
  const current = currentVersion(question);
  if (current.state !== "in-review" || !current.review) {
    throw new Error("Question must be in review before publication");
  }
  if (current.review.requestedBy === actor.principalId) {
    throw new Error("Question review requires a different named reviewer");
  }
  const at = timestamp(now, "now");
  const next = clone(bank);
  const target = next.questions.find(
    (candidate) => candidate.id === questionId,
  ) as BankQuestion;
  const version = currentVersion(target);
  version.state = "published";
  version.review = {
    ...clone(version.review as QuestionReview),
    reviewedBy: actor.principalId,
    reviewedAt: at,
  };
  version.revision += 1;
  version.audit = updateAudit(version.audit, actor.principalId, at);
  target.publishedVersion = version.version;
  target.revision += 1;
  target.audit = updateAudit(target.audit, actor.principalId, at);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidQuestionBankSnapshot(next);
  return next;
}

export function createQuestionRevision(
  bank: QuestionBankSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  questionId: string,
  now: string,
): QuestionBankSnapshot {
  const roles = assertAuthor(bank, workspace, actor);
  const question = bank.questions.find(
    (candidate) => candidate.id === questionId,
  );
  if (!question) throw new Error("Question does not exist");
  if (!canManageQuestion(question, actor, roles)) {
    throw new Error("Actor cannot revise this question");
  }
  const source = currentVersion(question);
  if (source.state !== "published") {
    throw new Error("A new revision can only follow a published version");
  }
  const at = timestamp(now, "now");
  const next = clone(bank);
  const target = next.questions.find(
    (candidate) => candidate.id === questionId,
  ) as BankQuestion;
  target.versions.push({
    version: source.version + 1,
    revision: 1,
    state: "draft",
    metadata: clone(source.metadata),
    content: clone(source.content),
    feedback: clone(source.feedback),
    provenance: clone(source.provenance),
    review: null,
    audit: makeAudit(actor.principalId, at),
  });
  target.revision += 1;
  target.audit = updateAudit(target.audit, actor.principalId, at);
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, at);
  assertValidQuestionBankSnapshot(next);
  return next;
}

export function getPublishedQuestionVersion(
  bank: QuestionBankSnapshot,
  questionId: string,
  versionNumber?: number,
): { question: BankQuestion; version: QuestionVersion } {
  assertValidQuestionBankSnapshot(bank);
  const question = bank.questions.find(
    (candidate) => candidate.id === questionId,
  );
  if (!question) throw new Error("Question does not exist");
  const requested = versionNumber ?? question.publishedVersion;
  if (requested === null) throw new Error("Question has no published version");
  const version = question.versions.find(
    (candidate) => candidate.version === requested,
  );
  if (!version || version.state !== "published") {
    throw new Error("Requested question version is not published");
  }
  return { question: clone(question), version: clone(version) };
}

export function projectQuestionBank(
  bank: QuestionBankSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
): QuestionBankProjection {
  assertValidQuestionBankSnapshot(bank);
  assertValidWorkspaceSnapshot(workspace);
  if (bank.organizationId !== actor.organizationId) {
    throw new Error("Actor is not authorised for this organization bank");
  }
  const roles = rolesForOrganization(workspace, actor);
  const viewerRole = highestRole(roles);
  if (!roles.some((role) => authorRoles.has(role))) {
    throw new Error("Question bank is available only to authorised authors");
  }
  const isReviewer = roles.some((role) => administratorRoles.has(role));
  const questions = bank.questions.flatMap((question) => {
    const isOwner = question.ownerPrincipalId === actor.principalId;
    const discoverable =
      isReviewer ||
      isOwner ||
      (question.sharing === "organization-authors" &&
        question.publishedVersion !== null);
    if (!discoverable) return [];
    const latest = currentVersion(question);
    const current =
      isOwner || isReviewer
        ? latest
        : (question.versions.find(
            (version) => version.version === question.publishedVersion,
          ) as QuestionVersion);
    return [
      {
        id: question.id,
        ownerPrincipalId: question.ownerPrincipalId,
        sharing: question.sharing,
        publishedVersion: question.publishedVersion,
        current: clone(current),
        capabilities: {
          canEdit: (isOwner || isReviewer) && current.state === "draft",
          canRequestReview:
            (isOwner || isReviewer) && current.state === "draft",
          canPublish:
            isReviewer &&
            current.state === "in-review" &&
            current.review?.requestedBy !== actor.principalId,
          canCreateRevision:
            (isOwner || isReviewer) && current.state === "published",
        },
      },
    ];
  });
  questions.sort((left, right) =>
    left.current.content.prompt.localeCompare(right.current.content.prompt),
  );
  return {
    organizationId: bank.organizationId,
    viewerRole,
    questions: clone(questions),
    capabilities: {
      canCreate: roles.some((role) => authorRoles.has(role)),
      canReview: isReviewer,
    },
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

function validateStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) return [`${label} must be an array`];
  const issues: string[] = [];
  if (value.some((item) => typeof item !== "string" || !item.trim())) {
    issues.push(`${label} entries must be non-empty strings`);
  }
  if (new Set(value).size !== value.length) {
    issues.push(`${label} entries must be unique`);
  }
  return issues;
}

function validateMetadata(value: unknown): string[] {
  if (!isRecord(value)) return ["question.metadata must be an object"];
  const issues = unexpectedKeys(
    value,
    ["subject", "topic", "level", "standards", "tags"],
    "question.metadata",
  );
  for (const key of ["subject", "topic", "level"] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      issues.push(`question.metadata.${key} is required`);
    }
  }
  issues.push(
    ...validateStringArray(value.standards, "question.metadata.standards"),
  );
  issues.push(...validateStringArray(value.tags, "question.metadata.tags"));
  return issues;
}

function validateContent(value: unknown): string[] {
  if (!isRecord(value)) return ["question.content must be an object"];
  try {
    if (value.type === "multiple-choice") {
      const issues = unexpectedKeys(
        value,
        ["type", "prompt", "options", "correctOptionId"],
        "question.content",
      );
      if (!Array.isArray(value.options)) {
        return [...issues, "question.content.options must be an array"];
      }
      for (const [index, option] of value.options.entries()) {
        if (!isRecord(option)) {
          issues.push(`question.content.options[${index}] must be an object`);
          continue;
        }
        issues.push(
          ...unexpectedKeys(
            option,
            ["id", "text"],
            `question.content.options[${index}]`,
          ),
        );
      }
      if (!issues.length)
        exactQuestionContent(value as unknown as QuestionContent);
      return issues;
    }
    if (value.type === "true-false") {
      const issues = unexpectedKeys(
        value,
        ["type", "prompt", "correctAnswer"],
        "question.content",
      );
      if (!issues.length)
        exactQuestionContent(value as unknown as QuestionContent);
      return issues;
    }
    if (value.type === "short-answer") {
      const issues = unexpectedKeys(
        value,
        ["type", "prompt", "markingGuidance"],
        "question.content",
      );
      if (!issues.length)
        exactQuestionContent(value as unknown as QuestionContent);
      return issues;
    }
    return ["question.content.type is invalid"];
  } catch (error) {
    return [
      error instanceof Error ? error.message : "question.content is invalid",
    ];
  }
}

function validateQuestionVersion(
  value: unknown,
  expectedVersion: number,
): string[] {
  if (!isRecord(value)) return ["question.version must be an object"];
  const issues = unexpectedKeys(
    value,
    [
      "version",
      "revision",
      "state",
      "metadata",
      "content",
      "feedback",
      "provenance",
      "review",
      "audit",
    ],
    "question.version",
  );
  if (value.version !== expectedVersion) {
    issues.push("question versions must be contiguous and ordered");
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) {
    issues.push("question.version.revision must be a positive integer");
  }
  if (!lifecycles.includes(value.state as QuestionLifecycle)) {
    issues.push("question.version.state is invalid");
  }
  issues.push(...validateMetadata(value.metadata));
  issues.push(...validateContent(value.content));
  if (!isRecord(value.feedback)) {
    issues.push("question.feedback must be an object");
  } else {
    issues.push(
      ...unexpectedKeys(
        value.feedback,
        ["correct", "incorrect"],
        "question.feedback",
      ),
    );
    for (const key of ["correct", "incorrect"] as const) {
      if (
        typeof value.feedback[key] !== "string" ||
        !value.feedback[key].trim()
      ) {
        issues.push(`question.feedback.${key} is required`);
      }
    }
  }
  if (!isRecord(value.provenance)) {
    issues.push("question.provenance must be an object");
  } else {
    issues.push(
      ...unexpectedKeys(
        value.provenance,
        ["kind", "sourceLabel", "sourceUrl"],
        "question.provenance",
      ),
    );
    try {
      exactQuestionProvenance(
        value.provenance as unknown as QuestionProvenance,
      );
    } catch (error) {
      issues.push(
        error instanceof Error
          ? error.message
          : "question.provenance is invalid",
      );
    }
  }
  if (value.review !== null) {
    if (!isRecord(value.review)) {
      issues.push("question.review must be null or an object");
    } else {
      issues.push(
        ...unexpectedKeys(
          value.review,
          ["requestedBy", "requestedAt", "reviewedBy", "reviewedAt"],
          "question.review",
        ),
      );
      if (
        typeof value.review.requestedBy !== "string" ||
        !value.review.requestedBy.trim() ||
        !Number.isFinite(Date.parse(String(value.review.requestedAt)))
      ) {
        issues.push("question.review request evidence is invalid");
      }
      if (
        (value.review.reviewedBy === null) !==
        (value.review.reviewedAt === null)
      ) {
        issues.push("question.review completion evidence must be paired");
      }
      if (
        value.review.reviewedBy !== null &&
        (typeof value.review.reviewedBy !== "string" ||
          !value.review.reviewedBy.trim() ||
          !Number.isFinite(Date.parse(String(value.review.reviewedAt))))
      ) {
        issues.push("question.review completion evidence is invalid");
      }
      const requestedAt = Date.parse(String(value.review.requestedAt));
      const reviewedAt =
        value.review.reviewedAt === null
          ? null
          : Date.parse(String(value.review.reviewedAt));
      if (
        reviewedAt !== null &&
        Number.isFinite(requestedAt) &&
        Number.isFinite(reviewedAt) &&
        reviewedAt < requestedAt
      ) {
        issues.push("question.review cannot complete before it was requested");
      }
    }
  }
  if (value.state === "draft" && value.review !== null) {
    issues.push("draft question versions cannot retain review evidence");
  }
  if (
    ["in-review", "published"].includes(String(value.state)) &&
    !value.review
  ) {
    issues.push("reviewed question states require review evidence");
  }
  if (
    value.state === "published" &&
    isRecord(value.review) &&
    (value.review.reviewedBy === null ||
      value.review.reviewedAt === null ||
      value.review.reviewedBy === value.review.requestedBy)
  ) {
    issues.push("published questions require a different named reviewer");
  }
  if (
    value.state === "in-review" &&
    isRecord(value.review) &&
    (value.review.reviewedBy !== null || value.review.reviewedAt !== null)
  ) {
    issues.push("in-review questions cannot retain completion evidence");
  }
  issues.push(...validateAudit(value.audit, "question.version.audit"));
  if (isRecord(value.audit) && isRecord(value.review)) {
    const createdAt = Date.parse(String(value.audit.createdAt));
    const updatedAt = Date.parse(String(value.audit.updatedAt));
    const requestedAt = Date.parse(String(value.review.requestedAt));
    const reviewedAt =
      value.review.reviewedAt === null
        ? null
        : Date.parse(String(value.review.reviewedAt));
    if (
      Number.isFinite(createdAt) &&
      Number.isFinite(requestedAt) &&
      requestedAt < createdAt
    ) {
      issues.push("question review cannot precede version creation");
    }
    if (
      reviewedAt !== null &&
      Number.isFinite(reviewedAt) &&
      Number.isFinite(updatedAt) &&
      reviewedAt > updatedAt
    ) {
      issues.push("question review cannot follow version audit update");
    }
  }
  return issues;
}

export function validateQuestionBankSnapshot(value: unknown): string[] {
  if (!isRecord(value)) return ["question bank must be an object"];
  const issues = unexpectedKeys(
    value,
    ["schemaVersion", "organizationId", "questions", "revision", "audit"],
    "question bank",
  );
  if (value.schemaVersion !== QUESTION_BANK_SCHEMA_VERSION) {
    issues.push("question bank schema version is unsupported");
  }
  if (
    typeof value.organizationId !== "string" ||
    !value.organizationId.trim()
  ) {
    issues.push("question bank organizationId is required");
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) {
    issues.push("question bank revision must be a positive integer");
  }
  issues.push(...validateAudit(value.audit, "question bank audit"));
  if (!Array.isArray(value.questions)) {
    issues.push("question bank questions must be an array");
    return issues;
  }
  const ids = new Set<string>();
  for (const [index, raw] of value.questions.entries()) {
    const label = `question bank questions[${index}]`;
    if (!isRecord(raw)) {
      issues.push(`${label} must be an object`);
      continue;
    }
    issues.push(
      ...unexpectedKeys(
        raw,
        [
          "id",
          "organizationId",
          "ownerPrincipalId",
          "sharing",
          "versions",
          "publishedVersion",
          "revision",
          "audit",
        ],
        label,
      ),
    );
    for (const key of ["id", "organizationId", "ownerPrincipalId"] as const) {
      if (typeof raw[key] !== "string" || !raw[key].trim()) {
        issues.push(`${label}.${key} is required`);
      }
    }
    if (typeof raw.id === "string") {
      if (ids.has(raw.id)) issues.push(`duplicate question ID ${raw.id}`);
      ids.add(raw.id);
    }
    if (raw.organizationId !== value.organizationId) {
      issues.push(`${label}.organizationId must match the bank`);
    }
    if (!sharingValues.includes(raw.sharing as QuestionSharing)) {
      issues.push(`${label}.sharing is invalid`);
    }
    if (!Number.isInteger(raw.revision) || Number(raw.revision) < 1) {
      issues.push(`${label}.revision must be a positive integer`);
    }
    issues.push(...validateAudit(raw.audit, `${label}.audit`));
    if (!Array.isArray(raw.versions) || !raw.versions.length) {
      issues.push(`${label}.versions must be a non-empty array`);
      continue;
    }
    raw.versions.forEach((version, versionIndex) =>
      issues.push(...validateQuestionVersion(version, versionIndex + 1)),
    );
    const published = raw.versions.filter(
      (version) => isRecord(version) && version.state === "published",
    );
    if (raw.publishedVersion === null) {
      if (published.length) {
        issues.push(
          `${label}.publishedVersion must identify published content`,
        );
      }
    } else if (
      !Number.isInteger(raw.publishedVersion) ||
      !published.some(
        (version) =>
          (version as Record<string, unknown>).version === raw.publishedVersion,
      )
    ) {
      issues.push(`${label}.publishedVersion is inconsistent`);
    } else {
      const highestPublishedVersion = Math.max(
        ...published.map((version) => Number(version.version)),
      );
      if (raw.publishedVersion !== highestPublishedVersion) {
        issues.push(
          `${label}.publishedVersion must identify the latest release`,
        );
      }
    }
    if (
      raw.versions
        .slice(0, -1)
        .some(
          (version) =>
            isRecord(version) &&
            !["published", "retired"].includes(String(version.state)),
        )
    ) {
      issues.push(
        `${label} only the current version may be editable or in review`,
      );
    }
    const firstVersion = raw.versions[0];
    const latestVersion = raw.versions.at(-1);
    if (isRecord(raw.audit) && isRecord(firstVersion?.audit)) {
      if (
        raw.ownerPrincipalId !== firstVersion.audit.createdBy ||
        raw.audit.createdBy !== firstVersion.audit.createdBy ||
        raw.audit.createdAt !== firstVersion.audit.createdAt
      ) {
        issues.push(`${label} owner and creation audit must stay aligned`);
      }
    }
    if (isRecord(raw.audit) && isRecord(latestVersion?.audit)) {
      if (
        raw.audit.updatedBy !== latestVersion.audit.updatedBy ||
        raw.audit.updatedAt !== latestVersion.audit.updatedAt
      ) {
        issues.push(
          `${label} record and current-version audit must stay aligned`,
        );
      }
    }
  }
  return issues;
}

export function assertValidQuestionBankSnapshot(
  value: unknown,
): asserts value is QuestionBankSnapshot {
  const issues = validateQuestionBankSnapshot(value);
  if (issues.length) throw new Error(issues.join("; "));
}

export function loadQuestionBankSnapshot(
  storage: StorageLike,
  fallback: QuestionBankSnapshot,
): QuestionBankSnapshot {
  try {
    const raw = storage.getItem(QUESTION_BANK_STORAGE_KEY);
    if (!raw) return clone(fallback);
    const parsed: unknown = JSON.parse(raw);
    assertValidQuestionBankSnapshot(parsed);
    return clone(parsed);
  } catch {
    return clone(fallback);
  }
}

export function saveQuestionBankSnapshot(
  storage: StorageLike,
  snapshot: QuestionBankSnapshot,
): void {
  assertValidQuestionBankSnapshot(snapshot);
  storage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(snapshot));
}
