import {
  assertValidCourseModel,
  validateCourseModel,
  type AuditFields,
  type CourseId,
  type CourseModel,
  type CourseStatus,
} from "./course";

export const WORKSPACE_SCHEMA_VERSION = 1 as const;
export const WORKSPACE_STORAGE_KEY = "learning-loop-workspace-snapshot-v1";

export type WorkspaceRole =
  | "platform-owner"
  | "organization-administrator"
  | "teacher"
  | "teaching-assistant"
  | "student"
  | "parent-guardian";

export type MembershipStatus = "active" | "invited" | "suspended" | "ended";
export type CourseVisibility = "private" | "enrolled-members" | "organization";

export interface WorkspaceOrganization {
  id: string;
  name: string;
}

export interface WorkspaceCourse {
  id: CourseId;
  code: string;
  title: string;
  subject: string;
  term: string;
  section: string;
  lifecycle: CourseStatus;
  visibility: CourseVisibility;
  revision: number;
  audit: AuditFields;
}

export interface WorkspaceMembership {
  id: string;
  organizationId: string;
  courseId: CourseId | null;
  principalId: string;
  role: WorkspaceRole;
  status: MembershipStatus;
  revision: number;
  audit: AuditFields;
}

export interface WorkspaceModel {
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  organization: WorkspaceOrganization;
  courses: WorkspaceCourse[];
  memberships: WorkspaceMembership[];
  revision: number;
  audit: AuditFields;
}

/**
 * Local application bundle only. The workspace catalogue and course content
 * remain separate domain aggregates even though the prototype persists them in
 * one validated JSON envelope.
 */
export interface WorkspaceSnapshot {
  schemaVersion: typeof WORKSPACE_SCHEMA_VERSION;
  workspace: WorkspaceModel;
  courseModels: CourseModel[];
}

export interface WorkspaceActor {
  principalId: string;
  organizationId: string;
}

export interface WorkspaceCourseProjection {
  id: CourseId;
  code: string;
  title: string;
  subject: string;
  term: string;
  section: string;
  lifecycle: CourseStatus;
  visibility: CourseVisibility;
  role: WorkspaceRole;
  capabilities: {
    canManageCourse: boolean;
    canViewTeachingSignals: boolean;
  };
}

export interface WorkspaceProjection {
  organization: WorkspaceOrganization;
  courses: WorkspaceCourseProjection[];
  capabilities: {
    canCreateCourse: boolean;
    canViewOrganizationSignals: boolean;
  };
}

export interface CreateWorkspaceInput {
  organizationId: string;
  organizationName: string;
  actorId: string;
  actorRole: "platform-owner" | "organization-administrator" | "teacher";
  actorMembershipId: string;
  now: string;
}

export interface CreateWorkspaceCourseInput {
  code: string;
  term: string;
  section: string;
  visibility?: CourseVisibility;
  creatorMembershipId: string;
  now: string;
}

export interface LegacyCourseMigrationInput {
  organizationId: string;
  organizationName: string;
  actorId: string;
  actorMembershipId: string;
  courseMembershipId: string;
  code: string;
  term: string;
  section: string;
  visibility?: CourseVisibility;
  now: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface WorkspaceLoadOptions {
  fallback: WorkspaceSnapshot;
  legacyCourseKey?: string;
  legacyMigration?: LegacyCourseMigrationInput;
}

const workspaceRoles: readonly WorkspaceRole[] = [
  "platform-owner",
  "organization-administrator",
  "teacher",
  "teaching-assistant",
  "student",
  "parent-guardian",
];
const membershipStatuses: readonly MembershipStatus[] = [
  "active",
  "invited",
  "suspended",
  "ended",
];
const courseStatuses: readonly CourseStatus[] = ["draft", "active", "archived"];
const courseVisibilities: readonly CourseVisibility[] = [
  "private",
  "enrolled-members",
  "organization",
];
const organizationRoles = new Set<WorkspaceRole>([
  "platform-owner",
  "organization-administrator",
  "teacher",
]);
const organizationCourseAccessRoles = new Set<WorkspaceRole>([
  "platform-owner",
  "organization-administrator",
]);
const createCourseRoles = new Set<WorkspaceRole>([
  "platform-owner",
  "organization-administrator",
  "teacher",
]);
const manageCourseRoles = new Set<WorkspaceRole>([
  "platform-owner",
  "organization-administrator",
  "teacher",
]);
const rolePriority: Record<WorkspaceRole, number> = {
  "platform-owner": 6,
  "organization-administrator": 5,
  teacher: 4,
  "teaching-assistant": 3,
  student: 2,
  "parent-guardian": 1,
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function assertNonEmpty(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} is required`);
  return trimmed;
}

function epoch(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed))
    throw new Error(`${label} must be an ISO timestamp`);
  return parsed;
}

function audit(actorId: string, now: string): AuditFields {
  const actor = assertNonEmpty(actorId, "actorId");
  const timestamp = new Date(epoch(now, "now")).toISOString();
  return {
    createdBy: actor,
    createdAt: timestamp,
    updatedBy: actor,
    updatedAt: timestamp,
  };
}

function updatedAudit(
  current: AuditFields,
  actorId: string,
  now: string,
): AuditFields {
  const actor = assertNonEmpty(actorId, "actorId");
  const nextEpoch = epoch(now, "now");
  if (nextEpoch < epoch(current.updatedAt, "audit.updatedAt")) {
    throw new Error("now cannot be earlier than the current audit timestamp");
  }
  return {
    ...clone(current),
    updatedBy: actor,
    updatedAt: new Date(nextEpoch).toISOString(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  const created = Date.parse(String(value.createdAt));
  const updated = Date.parse(String(value.updatedAt));
  if (!Number.isFinite(created)) issues.push(`${label}.createdAt is invalid`);
  if (!Number.isFinite(updated)) issues.push(`${label}.updatedAt is invalid`);
  if (
    Number.isFinite(created) &&
    Number.isFinite(updated) &&
    updated < created
  ) {
    issues.push(`${label}.updatedAt cannot precede createdAt`);
  }
  return issues;
}

function validateRevision(value: unknown, label: string): string[] {
  return Number.isInteger(value) && Number(value) >= 1
    ? []
    : [`${label} must be a positive integer`];
}

function activeMemberships(
  model: WorkspaceModel,
  actor: WorkspaceActor,
): WorkspaceMembership[] {
  if (actor.organizationId !== model.organization.id) return [];
  return model.memberships.filter(
    (membership) =>
      membership.principalId === actor.principalId &&
      membership.organizationId === actor.organizationId &&
      membership.status === "active",
  );
}

function highestRole(
  memberships: readonly WorkspaceMembership[],
): WorkspaceRole {
  const role = memberships
    .map((membership) => membership.role)
    .sort((a, b) => rolePriority[b] - rolePriority[a])[0];
  if (!role) throw new Error("No active membership grants this course");
  return role;
}

function courseAccess(
  model: WorkspaceModel,
  actor: WorkspaceActor,
  courseId: CourseId,
): WorkspaceMembership[] {
  const memberships = activeMemberships(model, actor);
  const organizationAccess = memberships.filter(
    (membership) =>
      membership.courseId === null &&
      organizationCourseAccessRoles.has(membership.role),
  );
  const courseMemberships = memberships.filter(
    (membership) => membership.courseId === courseId,
  );
  return [...organizationAccess, ...courseMemberships];
}

export function createWorkspace(input: CreateWorkspaceInput): WorkspaceModel {
  const baseAudit = audit(input.actorId, input.now);
  const organizationId = assertNonEmpty(input.organizationId, "organizationId");
  const actorMembership: WorkspaceMembership = {
    id: assertNonEmpty(input.actorMembershipId, "actorMembershipId"),
    organizationId,
    courseId: null,
    principalId: assertNonEmpty(input.actorId, "actorId"),
    role: input.actorRole,
    status: "active",
    revision: 1,
    audit: clone(baseAudit),
  };
  return {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    organization: {
      id: organizationId,
      name: assertNonEmpty(input.organizationName, "organizationName"),
    },
    courses: [],
    memberships: [actorMembership],
    revision: 1,
    audit: baseAudit,
  };
}

export function createWorkspaceSnapshot(
  workspace: WorkspaceModel,
): WorkspaceSnapshot {
  const snapshot: WorkspaceSnapshot = {
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    workspace: clone(workspace),
    courseModels: [],
  };
  assertValidWorkspaceSnapshot(snapshot);
  return snapshot;
}

export function createCourseInWorkspace(
  snapshot: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseModel: CourseModel,
  input: CreateWorkspaceCourseInput,
): WorkspaceSnapshot {
  assertValidWorkspaceSnapshot(snapshot);
  assertValidCourseModel(courseModel);
  const organizationMemberships = activeMemberships(
    snapshot.workspace,
    actor,
  ).filter((membership) => membership.courseId === null);
  if (
    !organizationMemberships.some((membership) =>
      createCourseRoles.has(membership.role),
    )
  ) {
    throw new Error(
      "Actor is not authorised to create courses in this organization",
    );
  }
  if (courseModel.course.status !== "draft") {
    throw new Error("A new workspace course must begin in draft");
  }
  if (
    snapshot.workspace.courses.some(
      (course) => course.id === courseModel.course.id,
    )
  ) {
    throw new Error(`Course ID ${courseModel.course.id} already exists`);
  }
  const code = assertNonEmpty(input.code, "code");
  if (
    snapshot.workspace.courses.some(
      (course) => course.code.toLocaleLowerCase() === code.toLocaleLowerCase(),
    )
  ) {
    throw new Error(`Course code ${code} already exists`);
  }
  const nowEpoch = epoch(input.now, "now");
  if (
    nowEpoch <
    epoch(snapshot.workspace.audit.updatedAt, "workspace.audit.updatedAt")
  ) {
    throw new Error("now cannot be earlier than the workspace audit timestamp");
  }
  const next = clone(snapshot);
  const courseAudit = audit(actor.principalId, input.now);
  next.workspace.courses.push({
    id: courseModel.course.id,
    code,
    title: courseModel.course.title,
    subject: courseModel.course.subject,
    term: assertNonEmpty(input.term, "term"),
    section: assertNonEmpty(input.section, "section"),
    lifecycle: "draft",
    visibility: input.visibility ?? "private",
    revision: 1,
    audit: clone(courseAudit),
  });
  next.workspace.memberships.push({
    id: assertNonEmpty(input.creatorMembershipId, "creatorMembershipId"),
    organizationId: next.workspace.organization.id,
    courseId: courseModel.course.id,
    principalId: actor.principalId,
    role: "teacher",
    status: "active",
    revision: 1,
    audit: clone(courseAudit),
  });
  next.courseModels.push(clone(courseModel));
  next.workspace.revision += 1;
  next.workspace.audit = updatedAudit(
    next.workspace.audit,
    actor.principalId,
    input.now,
  );
  assertValidWorkspaceSnapshot(next);
  return next;
}

export function addWorkspaceMembership(
  snapshot: WorkspaceSnapshot,
  actor: WorkspaceActor,
  membership: WorkspaceMembership,
  now: string,
): WorkspaceSnapshot {
  assertValidWorkspaceSnapshot(snapshot);
  const actorRoles = activeMemberships(snapshot.workspace, actor).filter(
    (candidate) => candidate.courseId === null,
  );
  const authority = actorRoles
    .map((candidate) => candidate.role)
    .filter((role) =>
      ["platform-owner", "organization-administrator"].includes(role),
    )
    .sort((a, b) => rolePriority[b] - rolePriority[a])[0];
  if (!authority) {
    throw new Error("Actor is not authorised to manage memberships");
  }
  if (
    authority !== "platform-owner" &&
    ["platform-owner", "organization-administrator"].includes(membership.role)
  ) {
    throw new Error("Only a platform owner can grant an administrator role");
  }
  if (
    !(["active", "invited"] as MembershipStatus[]).includes(membership.status)
  ) {
    throw new Error("A new membership must begin as active or invited");
  }
  const next = clone(snapshot);
  const nextMembership = clone(membership);
  nextMembership.audit = audit(actor.principalId, now);
  nextMembership.revision = 1;
  next.workspace.memberships.push(nextMembership);
  next.workspace.revision += 1;
  next.workspace.audit = updatedAudit(
    next.workspace.audit,
    actor.principalId,
    now,
  );
  assertValidWorkspaceSnapshot(next);
  return next;
}

export function projectWorkspace(
  model: WorkspaceModel,
  actor: WorkspaceActor,
  options: { includeArchived?: boolean } = {},
): WorkspaceProjection {
  assertValidWorkspaceModel(model);
  const memberships = activeMemberships(model, actor);
  if (!memberships.length) {
    throw new Error("Actor is not authorised for this workspace");
  }
  const organizationMemberships = memberships.filter(
    (membership) => membership.courseId === null,
  );
  const canCreateCourse = organizationMemberships.some((membership) =>
    createCourseRoles.has(membership.role),
  );
  const canViewOrganizationSignals = organizationMemberships.some(
    (membership) =>
      ["platform-owner", "organization-administrator"].includes(
        membership.role,
      ),
  );
  const courses = model.courses.flatMap((course) => {
    if (course.lifecycle === "archived" && !options.includeArchived) return [];
    const access = courseAccess(model, actor, course.id);
    if (!access.length) return [];
    const role = highestRole(access);
    if (
      ["student", "parent-guardian"].includes(role) &&
      (course.lifecycle !== "active" || course.visibility === "private")
    ) {
      return [];
    }
    const canManageCourse = manageCourseRoles.has(role);
    return [
      {
        id: course.id,
        code: course.code,
        title: course.title,
        subject: course.subject,
        term: course.term,
        section: course.section,
        lifecycle: course.lifecycle,
        visibility: course.visibility,
        role,
        capabilities: {
          canManageCourse,
          canViewTeachingSignals:
            canManageCourse || role === "teaching-assistant",
        },
      } satisfies WorkspaceCourseProjection,
    ];
  });
  return {
    organization: {
      id: model.organization.id,
      name: model.organization.name,
    },
    courses,
    capabilities: { canCreateCourse, canViewOrganizationSignals },
  };
}

export function selectWorkspaceCourse(
  model: WorkspaceModel,
  actor: WorkspaceActor,
  courseId: CourseId,
): { principalId: string; courseId: CourseId } {
  const projection = projectWorkspace(model, actor, { includeArchived: false });
  if (!projection.courses.some((course) => course.id === courseId)) {
    throw new Error("Course is not available to this actor");
  }
  return { principalId: actor.principalId, courseId };
}

export function transitionWorkspaceCourse(
  snapshot: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: CourseId,
  nextStatus: CourseStatus,
  now: string,
): WorkspaceSnapshot {
  assertValidWorkspaceSnapshot(snapshot);
  const courseAccessRows = courseAccess(snapshot.workspace, actor, courseId);
  if (
    !courseAccessRows.some((membership) =>
      manageCourseRoles.has(membership.role),
    )
  ) {
    throw new Error("Actor is not authorised to manage this course");
  }
  const courseIndex = snapshot.workspace.courses.findIndex(
    (course) => course.id === courseId,
  );
  const modelIndex = snapshot.courseModels.findIndex(
    (model) => model.course.id === courseId,
  );
  if (courseIndex < 0 || modelIndex < 0)
    throw new Error("Course does not exist");
  const current = snapshot.workspace.courses[courseIndex];
  const transitions: Record<CourseStatus, readonly CourseStatus[]> = {
    draft: ["active", "archived"],
    active: ["draft", "archived"],
    archived: [],
  };
  if (!transitions[current.lifecycle].includes(nextStatus)) {
    throw new Error(
      `Cannot transition course from ${current.lifecycle} to ${nextStatus}`,
    );
  }
  const next = clone(snapshot);
  next.workspace.courses[courseIndex] = {
    ...next.workspace.courses[courseIndex],
    lifecycle: nextStatus,
    revision: next.workspace.courses[courseIndex].revision + 1,
    audit: updatedAudit(
      next.workspace.courses[courseIndex].audit,
      actor.principalId,
      now,
    ),
  };
  next.courseModels[modelIndex].course = {
    ...next.courseModels[modelIndex].course,
    status: nextStatus,
    revision: next.courseModels[modelIndex].course.revision + 1,
    audit: updatedAudit(
      next.courseModels[modelIndex].course.audit,
      actor.principalId,
      now,
    ),
  };
  next.workspace.revision += 1;
  next.workspace.audit = updatedAudit(
    next.workspace.audit,
    actor.principalId,
    now,
  );
  assertValidWorkspaceSnapshot(next);
  return next;
}

export function migrateLegacyCourseModel(
  courseModel: CourseModel,
  input: LegacyCourseMigrationInput,
): WorkspaceSnapshot {
  assertValidCourseModel(courseModel);
  let snapshot = createWorkspaceSnapshot(
    createWorkspace({
      organizationId: input.organizationId,
      organizationName: input.organizationName,
      actorId: input.actorId,
      actorRole: "teacher",
      actorMembershipId: input.actorMembershipId,
      now: input.now,
    }),
  );
  const migrationCourse = clone(courseModel);
  migrationCourse.course = {
    ...migrationCourse.course,
    status: "draft",
  };
  snapshot = createCourseInWorkspace(
    snapshot,
    {
      principalId: input.actorId,
      organizationId: input.organizationId,
    },
    migrationCourse,
    {
      code: input.code,
      term: input.term,
      section: input.section,
      visibility: input.visibility,
      creatorMembershipId: input.courseMembershipId,
      now: input.now,
    },
  );
  if (courseModel.course.status !== "draft") {
    snapshot = transitionWorkspaceCourse(
      snapshot,
      {
        principalId: input.actorId,
        organizationId: input.organizationId,
      },
      courseModel.course.id,
      courseModel.course.status,
      input.now,
    );
  }
  return snapshot;
}

export function saveWorkspaceSnapshot(
  storage: StorageLike,
  snapshot: WorkspaceSnapshot,
): void {
  assertValidWorkspaceSnapshot(snapshot);
  storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadWorkspaceSnapshot(
  storage: StorageLike,
  options: WorkspaceLoadOptions,
): WorkspaceSnapshot {
  assertValidWorkspaceSnapshot(options.fallback);
  const serialized = storage.getItem(WORKSPACE_STORAGE_KEY);
  if (serialized) {
    try {
      const parsed = JSON.parse(serialized) as unknown;
      assertValidWorkspaceSnapshot(parsed);
      return clone(parsed);
    } catch {
      return clone(options.fallback);
    }
  }
  if (options.legacyCourseKey && options.legacyMigration) {
    const legacy = storage.getItem(options.legacyCourseKey);
    if (legacy) {
      try {
        return migrateLegacyCourseModel(
          JSON.parse(legacy) as CourseModel,
          options.legacyMigration,
        );
      } catch {
        return clone(options.fallback);
      }
    }
  }
  return clone(options.fallback);
}

export function validateWorkspaceModel(value: unknown): string[] {
  if (!isRecord(value)) return ["workspace must be an object"];
  const issues = unexpectedKeys(
    value,
    [
      "schemaVersion",
      "organization",
      "courses",
      "memberships",
      "revision",
      "audit",
    ],
    "workspace",
  );
  if (value.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    issues.push(`workspace schemaVersion must be ${WORKSPACE_SCHEMA_VERSION}`);
  }
  if (!isRecord(value.organization)) {
    issues.push("organization must be an object");
  } else {
    issues.push(
      ...unexpectedKeys(value.organization, ["id", "name"], "organization"),
    );
    for (const key of ["id", "name"] as const) {
      if (
        typeof value.organization[key] !== "string" ||
        !value.organization[key].trim()
      ) {
        issues.push(`organization.${key} is required`);
      }
    }
  }
  issues.push(...validateRevision(value.revision, "workspace.revision"));
  issues.push(...validateAudit(value.audit, "workspace.audit"));
  if (!Array.isArray(value.courses)) {
    issues.push("courses must be an array");
  }
  if (!Array.isArray(value.memberships)) {
    issues.push("memberships must be an array");
  }
  if (!Array.isArray(value.courses) || !Array.isArray(value.memberships)) {
    return issues;
  }
  const organizationId = isRecord(value.organization)
    ? String(value.organization.id ?? "")
    : "";
  const courseIds = new Set<string>();
  const courseCodes = new Set<string>();
  value.courses.forEach((candidate, index) => {
    const label = `courses[${index}]`;
    if (!isRecord(candidate)) {
      issues.push(`${label} must be an object`);
      return;
    }
    issues.push(
      ...unexpectedKeys(
        candidate,
        [
          "id",
          "code",
          "title",
          "subject",
          "term",
          "section",
          "lifecycle",
          "visibility",
          "revision",
          "audit",
        ],
        label,
      ),
    );
    for (const key of [
      "id",
      "code",
      "title",
      "subject",
      "term",
      "section",
    ] as const) {
      if (typeof candidate[key] !== "string" || !candidate[key].trim()) {
        issues.push(`${label}.${key} is required`);
      }
    }
    if (!courseStatuses.includes(candidate.lifecycle as CourseStatus)) {
      issues.push(`${label}.lifecycle is invalid`);
    }
    if (
      !courseVisibilities.includes(candidate.visibility as CourseVisibility)
    ) {
      issues.push(`${label}.visibility is invalid`);
    }
    issues.push(...validateRevision(candidate.revision, `${label}.revision`));
    issues.push(...validateAudit(candidate.audit, `${label}.audit`));
    if (typeof candidate.id === "string") {
      if (courseIds.has(candidate.id))
        issues.push(`course ID ${candidate.id} is duplicated`);
      courseIds.add(candidate.id);
    }
    if (typeof candidate.code === "string") {
      const key = candidate.code.toLocaleLowerCase();
      if (courseCodes.has(key))
        issues.push(`course code ${candidate.code} is duplicated`);
      courseCodes.add(key);
    }
  });
  const membershipIds = new Set<string>();
  const membershipScopes = new Set<string>();
  value.memberships.forEach((candidate, index) => {
    const label = `memberships[${index}]`;
    if (!isRecord(candidate)) {
      issues.push(`${label} must be an object`);
      return;
    }
    issues.push(
      ...unexpectedKeys(
        candidate,
        [
          "id",
          "organizationId",
          "courseId",
          "principalId",
          "role",
          "status",
          "revision",
          "audit",
        ],
        label,
      ),
    );
    for (const key of ["id", "organizationId", "principalId"] as const) {
      if (typeof candidate[key] !== "string" || !candidate[key].trim()) {
        issues.push(`${label}.${key} is required`);
      }
    }
    if (candidate.organizationId !== organizationId) {
      issues.push(`${label}.organizationId must match workspace organization`);
    }
    if (!workspaceRoles.includes(candidate.role as WorkspaceRole)) {
      issues.push(`${label}.role is invalid`);
    }
    if (!membershipStatuses.includes(candidate.status as MembershipStatus)) {
      issues.push(`${label}.status is invalid`);
    }
    if (candidate.courseId !== null && typeof candidate.courseId !== "string") {
      issues.push(`${label}.courseId must be a string or null`);
    }
    if (
      typeof candidate.courseId === "string" &&
      !courseIds.has(candidate.courseId)
    ) {
      issues.push(`${label}.courseId does not exist`);
    }
    if (
      candidate.courseId === null &&
      workspaceRoles.includes(candidate.role as WorkspaceRole) &&
      !organizationRoles.has(candidate.role as WorkspaceRole)
    ) {
      issues.push(`${label}.role cannot have organization-wide scope`);
    }
    issues.push(...validateRevision(candidate.revision, `${label}.revision`));
    issues.push(...validateAudit(candidate.audit, `${label}.audit`));
    if (typeof candidate.id === "string") {
      if (membershipIds.has(candidate.id)) {
        issues.push(`membership ID ${candidate.id} is duplicated`);
      }
      membershipIds.add(candidate.id);
    }
    if (
      typeof candidate.organizationId === "string" &&
      (candidate.courseId === null || typeof candidate.courseId === "string") &&
      typeof candidate.principalId === "string" &&
      typeof candidate.role === "string"
    ) {
      const scope = [
        candidate.organizationId,
        candidate.courseId ?? "organization",
        candidate.principalId,
        candidate.role,
      ].join(":");
      if (membershipScopes.has(scope)) {
        issues.push(
          `${label} duplicates a principal, scope, and role relationship`,
        );
      }
      membershipScopes.add(scope);
    }
  });
  return issues;
}

export function assertValidWorkspaceModel(
  value: unknown,
): asserts value is WorkspaceModel {
  const issues = validateWorkspaceModel(value);
  if (issues.length) throw new Error(issues.join("; "));
}

export function validateWorkspaceSnapshot(value: unknown): string[] {
  if (!isRecord(value)) return ["snapshot must be an object"];
  const issues = unexpectedKeys(
    value,
    ["schemaVersion", "workspace", "courseModels"],
    "snapshot",
  );
  if (value.schemaVersion !== WORKSPACE_SCHEMA_VERSION) {
    issues.push(`snapshot schemaVersion must be ${WORKSPACE_SCHEMA_VERSION}`);
  }
  issues.push(...validateWorkspaceModel(value.workspace));
  if (!Array.isArray(value.courseModels)) {
    issues.push("courseModels must be an array");
    return issues;
  }
  const courseModelsById = new Map<string, CourseModel>();
  value.courseModels.forEach((candidate, index) => {
    if (!isRecord(candidate) || !isRecord(candidate.course)) {
      issues.push(`courseModels[${index}] must be a course model object`);
      return;
    }
    try {
      const courseIssues = validateCourseModel(
        candidate as unknown as CourseModel,
      );
      issues.push(
        ...courseIssues.map((issue) => `courseModels[${index}].${issue}`),
      );
    } catch {
      issues.push(`courseModels[${index}] is malformed`);
      return;
    }
    const id = String(candidate.course.id ?? "");
    if (courseModelsById.has(id))
      issues.push(`course model ID ${id} is duplicated`);
    courseModelsById.set(id, candidate as unknown as CourseModel);
  });
  if (isRecord(value.workspace) && Array.isArray(value.workspace.courses)) {
    const catalogueIds = new Set<string>();
    value.workspace.courses.forEach((candidate, index) => {
      if (!isRecord(candidate) || typeof candidate.id !== "string") return;
      catalogueIds.add(candidate.id);
      const courseModel = courseModelsById.get(candidate.id);
      if (!courseModel) {
        issues.push(`courses[${index}] has no matching course model`);
        return;
      }
      if (
        candidate.title !== courseModel.course.title ||
        candidate.subject !== courseModel.course.subject ||
        candidate.lifecycle !== courseModel.course.status
      ) {
        issues.push(`courses[${index}] does not match its course model`);
      }
    });
    for (const id of courseModelsById.keys()) {
      if (!catalogueIds.has(id))
        issues.push(`course model ${id} has no catalogue record`);
    }
  }
  return issues;
}

export function assertValidWorkspaceSnapshot(
  value: unknown,
): asserts value is WorkspaceSnapshot {
  const issues = validateWorkspaceSnapshot(value);
  if (issues.length) throw new Error(issues.join("; "));
}
