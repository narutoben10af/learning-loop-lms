import type { AuditFields } from "./course";
import type {
  StorageLike,
  WorkspaceActor,
  WorkspaceRole,
  WorkspaceSnapshot,
} from "./workspace";
import { assertValidWorkspaceSnapshot } from "./workspace";

export const ANNOUNCEMENTS_SCHEMA_VERSION = 1 as const;
export const ANNOUNCEMENTS_STORAGE_KEY =
  "learning-loop-announcements-snapshot-v1";

export type AnnouncementAudience =
  | "all-course-members"
  | "students-only"
  | "staff-only";
export type AnnouncementState =
  | "draft"
  | "scheduled"
  | "published"
  | "archived";

export interface Announcement {
  id: string;
  organizationId: string;
  courseId: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  state: AnnouncementState;
  releaseAt: string | null;
  revision: number;
  audit: AuditFields;
}

export interface AnnouncementSnapshot {
  schemaVersion: typeof ANNOUNCEMENTS_SCHEMA_VERSION;
  organizationId: string;
  announcements: Announcement[];
  revision: number;
  audit: AuditFields;
}

export interface AnnouncementProjectionItem {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  state: AnnouncementState | "released";
  releaseAt: string | null;
  revision: number;
}

export interface CourseAnnouncementsProjection {
  courseId: string;
  viewerRole: WorkspaceRole;
  announcements: AnnouncementProjectionItem[];
  capabilities: {
    canAuthor: boolean;
    canViewStaffAudience: boolean;
  };
}

const audiences: readonly AnnouncementAudience[] = [
  "all-course-members",
  "students-only",
  "staff-only",
];
const states: readonly AnnouncementState[] = [
  "draft",
  "scheduled",
  "published",
  "archived",
];
const administratorRoles: readonly WorkspaceRole[] = [
  "platform-owner",
  "organization-administrator",
];
const staffRoles: readonly WorkspaceRole[] = [
  ...administratorRoles,
  "teacher",
  "teaching-assistant",
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

function iso(value: unknown, label: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${label} must be an ISO timestamp`);
  }
  return new Date(Date.parse(value)).toISOString();
}

function makeAudit(actorId: string, now: string): AuditFields {
  const actor = requiredText(actorId, "actorId");
  const timestamp = iso(now, "now");
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
  const timestamp = iso(now, "now");
  if (Date.parse(timestamp) < Date.parse(current.updatedAt)) {
    throw new Error("now cannot precede the current audit timestamp");
  }
  return {
    ...clone(current),
    updatedBy: requiredText(actorId, "actorId"),
    updatedAt: timestamp,
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

function rolesForCourse(
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
): WorkspaceRole[] {
  if (
    actor.organizationId !== workspace.workspace.organization.id ||
    !workspace.workspace.courses.some((course) => course.id === courseId)
  ) {
    return [];
  }
  return workspace.workspace.memberships
    .filter(
      (membership) =>
        membership.organizationId === actor.organizationId &&
        membership.principalId === actor.principalId &&
        membership.status === "active" &&
        (membership.courseId === courseId ||
          (membership.courseId === null &&
            administratorRoles.includes(membership.role))),
    )
    .map((membership) => membership.role);
}

function highestRole(roles: readonly WorkspaceRole[]): WorkspaceRole {
  for (const role of [
    "platform-owner",
    "organization-administrator",
    "teacher",
    "teaching-assistant",
    "student",
    "parent-guardian",
  ] as const) {
    if (roles.includes(role)) return role;
  }
  throw new Error("Actor is not authorised for this course");
}

function assertCanAuthor(
  snapshot: AnnouncementSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
): void {
  assertValidAnnouncementSnapshot(snapshot);
  assertValidWorkspaceSnapshot(workspace);
  if (
    snapshot.organizationId !== actor.organizationId ||
    !rolesForCourse(workspace, actor, courseId).some((role) =>
      ["platform-owner", "organization-administrator", "teacher"].includes(
        role,
      ),
    )
  ) {
    throw new Error("Actor is not authorised to author course announcements");
  }
}

export function createAnnouncementSnapshot(
  organizationId: string,
  actorId: string,
  now: string,
  announcements: Announcement[] = [],
): AnnouncementSnapshot {
  const snapshot: AnnouncementSnapshot = {
    schemaVersion: ANNOUNCEMENTS_SCHEMA_VERSION,
    organizationId: requiredText(organizationId, "organizationId"),
    announcements: clone(announcements),
    revision: 1,
    audit: makeAudit(actorId, now),
  };
  assertValidAnnouncementSnapshot(snapshot);
  return snapshot;
}

export function createAnnouncementRecord(input: {
  id: string;
  organizationId: string;
  courseId: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  state?: AnnouncementState;
  releaseAt?: string | null;
  actorId: string;
  now: string;
}): Announcement {
  const record: Announcement = {
    id: requiredText(input.id, "announcement.id"),
    organizationId: requiredText(
      input.organizationId,
      "announcement.organizationId",
    ),
    courseId: requiredText(input.courseId, "announcement.courseId"),
    title: requiredText(input.title, "announcement.title"),
    body: requiredText(input.body, "announcement.body"),
    audience: input.audience,
    state: input.state ?? "draft",
    releaseAt: input.releaseAt ? iso(input.releaseAt, "releaseAt") : null,
    revision: 1,
    audit: makeAudit(input.actorId, input.now),
  };
  assertValidAnnouncement(record);
  return record;
}

export function addAnnouncementDraft(
  snapshot: AnnouncementSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: {
    id: string;
    courseId: string;
    title: string;
    body: string;
    audience: AnnouncementAudience;
    now: string;
  },
): AnnouncementSnapshot {
  assertCanAuthor(snapshot, workspace, actor, input.courseId);
  if (snapshot.announcements.some((item) => item.id === input.id)) {
    throw new Error(`Announcement ID ${input.id} already exists`);
  }
  const next = clone(snapshot);
  next.announcements.push(
    createAnnouncementRecord({
      ...input,
      organizationId: actor.organizationId,
      state: "draft",
      releaseAt: null,
      actorId: actor.principalId,
    }),
  );
  next.revision += 1;
  next.audit = updatedAudit(next.audit, actor.principalId, input.now);
  assertValidAnnouncementSnapshot(next);
  return next;
}

export function reviseAnnouncement(
  snapshot: AnnouncementSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: {
    id: string;
    title: string;
    body: string;
    audience: AnnouncementAudience;
    now: string;
  },
): AnnouncementSnapshot {
  const current = snapshot.announcements.find((item) => item.id === input.id);
  if (!current) throw new Error("Announcement does not exist");
  assertCanAuthor(snapshot, workspace, actor, current.courseId);
  if (current.state === "archived") {
    throw new Error("Archived announcements cannot be edited");
  }
  const next = clone(snapshot);
  const index = next.announcements.findIndex((item) => item.id === input.id);
  next.announcements[index] = {
    ...clone(current),
    title: requiredText(input.title, "announcement.title"),
    body: requiredText(input.body, "announcement.body"),
    audience: input.audience,
    state: "draft",
    releaseAt: null,
    revision: current.revision + 1,
    audit: updatedAudit(current.audit, actor.principalId, input.now),
  };
  next.revision += 1;
  next.audit = updatedAudit(next.audit, actor.principalId, input.now);
  assertValidAnnouncementSnapshot(next);
  return next;
}

export function releaseAnnouncement(
  snapshot: AnnouncementSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: {
    id: string;
    state: "scheduled" | "published";
    releaseAt?: string | null;
    now: string;
  },
): AnnouncementSnapshot {
  const current = snapshot.announcements.find((item) => item.id === input.id);
  if (!current) throw new Error("Announcement does not exist");
  assertCanAuthor(snapshot, workspace, actor, current.courseId);
  if (current.state === "archived") {
    throw new Error("Archived announcements cannot be released");
  }
  const now = iso(input.now, "now");
  const releaseAt =
    input.state === "scheduled" ? iso(input.releaseAt, "releaseAt") : now;
  if (input.state === "scheduled" && Date.parse(releaseAt) <= Date.parse(now)) {
    throw new Error("A scheduled announcement needs a future release time");
  }
  const next = clone(snapshot);
  const index = next.announcements.findIndex((item) => item.id === input.id);
  next.announcements[index] = {
    ...clone(current),
    state: input.state,
    releaseAt,
    revision: current.revision + 1,
    audit: updatedAudit(current.audit, actor.principalId, now),
  };
  next.revision += 1;
  next.audit = updatedAudit(next.audit, actor.principalId, now);
  assertValidAnnouncementSnapshot(next);
  return next;
}

export function archiveAnnouncement(
  snapshot: AnnouncementSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  id: string,
  now: string,
): AnnouncementSnapshot {
  const current = snapshot.announcements.find((item) => item.id === id);
  if (!current) throw new Error("Announcement does not exist");
  assertCanAuthor(snapshot, workspace, actor, current.courseId);
  const next = clone(snapshot);
  const index = next.announcements.findIndex((item) => item.id === id);
  next.announcements[index] = {
    ...clone(current),
    state: "archived",
    revision: current.revision + 1,
    audit: updatedAudit(current.audit, actor.principalId, now),
  };
  next.revision += 1;
  next.audit = updatedAudit(next.audit, actor.principalId, now);
  assertValidAnnouncementSnapshot(next);
  return next;
}

export function projectCourseAnnouncements(
  snapshot: AnnouncementSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
  now: string,
): CourseAnnouncementsProjection {
  assertValidAnnouncementSnapshot(snapshot);
  assertValidWorkspaceSnapshot(workspace);
  if (snapshot.organizationId !== actor.organizationId) {
    throw new Error("Actor is not authorised for this organization");
  }
  const roles = rolesForCourse(workspace, actor, courseId);
  if (!roles.length) throw new Error("Actor is not authorised for this course");
  const viewerRole = highestRole(roles);
  const canViewStaffAudience = roles.some((role) => staffRoles.includes(role));
  const canAuthor = roles.some((role) =>
    ["platform-owner", "organization-administrator", "teacher"].includes(role),
  );
  const at = Date.parse(iso(now, "now"));
  const announcements =
    snapshot.announcements.flatMap<AnnouncementProjectionItem>(
      (announcement) => {
        if (announcement.courseId !== courseId) return [];
        if (canViewStaffAudience) {
          return [
            {
              id: announcement.id,
              title: announcement.title,
              body: announcement.body,
              audience: announcement.audience,
              state: announcement.state,
              releaseAt: announcement.releaseAt,
              revision: announcement.revision,
            } satisfies AnnouncementProjectionItem,
          ];
        }
        const released =
          announcement.state === "published" ||
          (announcement.state === "scheduled" &&
            announcement.releaseAt !== null &&
            Date.parse(announcement.releaseAt) <= at);
        if (
          !released ||
          announcement.state === "archived" ||
          announcement.audience === "staff-only"
        ) {
          return [];
        }
        return [
          {
            id: announcement.id,
            title: announcement.title,
            body: announcement.body,
            audience: announcement.audience,
            state: "released",
            releaseAt: announcement.releaseAt,
            revision: announcement.revision,
          } satisfies AnnouncementProjectionItem,
        ];
      },
    );
  announcements.sort((left, right) => {
    const rightAt = right.releaseAt ? Date.parse(right.releaseAt) : 0;
    const leftAt = left.releaseAt ? Date.parse(left.releaseAt) : 0;
    return rightAt - leftAt || left.title.localeCompare(right.title);
  });
  return {
    courseId,
    viewerRole,
    announcements: clone(announcements),
    capabilities: { canAuthor, canViewStaffAudience },
  };
}

export function validateAnnouncement(value: unknown): string[] {
  if (!isRecord(value)) return ["announcement must be an object"];
  const issues = unexpectedKeys(
    value,
    [
      "id",
      "organizationId",
      "courseId",
      "title",
      "body",
      "audience",
      "state",
      "releaseAt",
      "revision",
      "audit",
    ],
    "announcement",
  );
  for (const key of [
    "id",
    "organizationId",
    "courseId",
    "title",
    "body",
  ] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      issues.push(`announcement.${key} is required`);
    }
  }
  if (!audiences.includes(value.audience as AnnouncementAudience)) {
    issues.push("announcement.audience is invalid");
  }
  if (!states.includes(value.state as AnnouncementState)) {
    issues.push("announcement.state is invalid");
  }
  if (value.releaseAt !== null) {
    if (
      typeof value.releaseAt !== "string" ||
      !Number.isFinite(Date.parse(value.releaseAt))
    ) {
      issues.push("announcement.releaseAt is invalid");
    }
  }
  if (
    ["scheduled", "published"].includes(String(value.state)) &&
    value.releaseAt === null
  ) {
    issues.push("released announcements require releaseAt");
  }
  if (value.state === "draft" && value.releaseAt !== null) {
    issues.push("draft announcements cannot have releaseAt");
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) {
    issues.push("announcement.revision must be a positive integer");
  }
  issues.push(...validateAudit(value.audit, "announcement.audit"));
  return issues;
}

export function assertValidAnnouncement(
  value: unknown,
): asserts value is Announcement {
  const issues = validateAnnouncement(value);
  if (issues.length) throw new Error(issues.join("; "));
}

export function validateAnnouncementSnapshot(value: unknown): string[] {
  if (!isRecord(value)) return ["announcement snapshot must be an object"];
  const issues = unexpectedKeys(
    value,
    ["schemaVersion", "organizationId", "announcements", "revision", "audit"],
    "announcement snapshot",
  );
  if (value.schemaVersion !== ANNOUNCEMENTS_SCHEMA_VERSION) {
    issues.push(
      `announcement snapshot schemaVersion must be ${ANNOUNCEMENTS_SCHEMA_VERSION}`,
    );
  }
  if (
    typeof value.organizationId !== "string" ||
    !value.organizationId.trim()
  ) {
    issues.push("announcement snapshot organizationId is required");
  }
  if (!Array.isArray(value.announcements)) {
    issues.push("announcement snapshot announcements must be an array");
  } else {
    const ids = new Set<string>();
    value.announcements.forEach((announcement, index) => {
      issues.push(
        ...validateAnnouncement(announcement).map((issue) =>
          issue.replace(/^announcement/, `announcements[${index}]`),
        ),
      );
      if (isRecord(announcement)) {
        if (announcement.organizationId !== value.organizationId) {
          issues.push(
            `announcements[${index}].organizationId must match snapshot organizationId`,
          );
        }
        if (typeof announcement.id === "string") {
          if (ids.has(announcement.id)) {
            issues.push(`announcement ID ${announcement.id} is duplicated`);
          }
          ids.add(announcement.id);
        }
      }
    });
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) {
    issues.push("announcement snapshot revision must be a positive integer");
  }
  issues.push(...validateAudit(value.audit, "announcement snapshot.audit"));
  return issues;
}

export function assertValidAnnouncementSnapshot(
  value: unknown,
): asserts value is AnnouncementSnapshot {
  const issues = validateAnnouncementSnapshot(value);
  if (issues.length) throw new Error(issues.join("; "));
}

export function saveAnnouncementSnapshot(
  storage: StorageLike,
  snapshot: AnnouncementSnapshot,
): void {
  assertValidAnnouncementSnapshot(snapshot);
  storage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadAnnouncementSnapshot(
  storage: StorageLike,
  fallback: AnnouncementSnapshot,
): AnnouncementSnapshot {
  assertValidAnnouncementSnapshot(fallback);
  const serialized = storage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
  if (!serialized) return clone(fallback);
  try {
    const parsed = JSON.parse(serialized) as unknown;
    assertValidAnnouncementSnapshot(parsed);
    return clone(parsed);
  } catch {
    return clone(fallback);
  }
}
