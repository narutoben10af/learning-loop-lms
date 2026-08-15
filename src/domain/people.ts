import {
  addWorkspaceMembership,
  assertValidWorkspaceSnapshot,
  type StorageLike,
  type WorkspaceActor,
  type WorkspaceMembership,
  type WorkspaceRole,
  type WorkspaceSnapshot,
} from "./workspace";
import type { AuditFields } from "./course";

export const PEOPLE_SCHEMA_VERSION = 1 as const;
export const PEOPLE_STORAGE_KEY = "learning-loop-people-snapshot-v1";

export type ProfileStatus =
  | "active"
  | "pending-activation"
  | "suspended"
  | "ended";

export interface PersonProfile {
  id: string;
  organizationId: string;
  displayName: string;
  preferredName: string | null;
  status: ProfileStatus;
  revision: number;
  audit: AuditFields;
}

export interface PeopleSnapshot {
  schemaVersion: typeof PEOPLE_SCHEMA_VERSION;
  organizationId: string;
  profiles: PersonProfile[];
  revision: number;
  audit: AuditFields;
}

export interface CoursePersonProjection {
  profileId: string;
  displayName: string;
  preferredName: string | null;
  role: WorkspaceRole;
  membershipStatus: WorkspaceMembership["status"];
  profileStatus: ProfileStatus;
}

export interface CoursePeopleProjection {
  courseId: string;
  viewerRole: WorkspaceRole;
  people: CoursePersonProjection[];
  capabilities: {
    canAddPeople: boolean;
    canViewFullRoster: boolean;
  };
}

export interface AddCoursePersonInput {
  profileId: string;
  membershipId: string;
  courseId: string;
  displayName: string;
  preferredName?: string | null;
  role: "student" | "teaching-assistant";
  now: string;
}

const profileStatuses: readonly ProfileStatus[] = [
  "active",
  "pending-activation",
  "suspended",
  "ended",
];

function clone<T>(value: T): T {
  return structuredClone(value);
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
  return {
    createdBy: actor,
    createdAt: at,
    updatedBy: actor,
    updatedAt: at,
  };
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

export function createPeopleSnapshot(
  organizationId: string,
  actorId: string,
  now: string,
  profiles: PersonProfile[] = [],
): PeopleSnapshot {
  const snapshot: PeopleSnapshot = {
    schemaVersion: PEOPLE_SCHEMA_VERSION,
    organizationId: requiredText(organizationId, "organizationId"),
    profiles: clone(profiles),
    revision: 1,
    audit: makeAudit(actorId, now),
  };
  assertValidPeopleSnapshot(snapshot);
  return snapshot;
}

export function createPersonProfile(input: {
  id: string;
  organizationId: string;
  displayName: string;
  preferredName?: string | null;
  status: ProfileStatus;
  actorId: string;
  now: string;
}): PersonProfile {
  const profile: PersonProfile = {
    id: requiredText(input.id, "profile.id"),
    organizationId: requiredText(
      input.organizationId,
      "profile.organizationId",
    ),
    displayName: requiredText(input.displayName, "profile.displayName"),
    preferredName: input.preferredName?.trim() || null,
    status: input.status,
    revision: 1,
    audit: makeAudit(input.actorId, input.now),
  };
  assertValidPersonProfile(profile);
  return profile;
}

export function addCoursePerson(
  people: PeopleSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: AddCoursePersonInput,
): { people: PeopleSnapshot; workspace: WorkspaceSnapshot } {
  assertValidPeopleSnapshot(people);
  assertValidWorkspaceSnapshot(workspace);
  if (
    people.organizationId !== actor.organizationId ||
    workspace.workspace.organization.id !== actor.organizationId
  ) {
    throw new Error("Actor is not authorised for this organization");
  }
  const displayName = requiredText(input.displayName, "displayName");
  const profileId = requiredText(input.profileId, "profileId");
  if (people.profiles.some((profile) => profile.id === profileId)) {
    throw new Error(`Profile ID ${profileId} already exists`);
  }
  const now = timestamp(input.now, "now");
  const profile = createPersonProfile({
    id: profileId,
    organizationId: actor.organizationId,
    displayName,
    preferredName: input.preferredName,
    status: "pending-activation",
    actorId: actor.principalId,
    now,
  });
  const membership: WorkspaceMembership = {
    id: requiredText(input.membershipId, "membershipId"),
    organizationId: actor.organizationId,
    courseId: requiredText(input.courseId, "courseId"),
    principalId: profile.id,
    role: input.role,
    status: "invited",
    revision: 1,
    audit: makeAudit(actor.principalId, now),
  };
  const nextWorkspace = addWorkspaceMembership(
    workspace,
    actor,
    membership,
    now,
  );
  const nextPeople = clone(people);
  nextPeople.profiles.push(profile);
  nextPeople.profiles.sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );
  nextPeople.revision += 1;
  nextPeople.audit = {
    ...clone(nextPeople.audit),
    updatedBy: actor.principalId,
    updatedAt: now,
  };
  assertValidPeopleSnapshot(nextPeople);
  return { people: nextPeople, workspace: nextWorkspace };
}

function courseMembershipsForActor(
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
): WorkspaceMembership[] {
  return workspace.workspace.memberships.filter(
    (membership) =>
      membership.organizationId === actor.organizationId &&
      membership.principalId === actor.principalId &&
      membership.status === "active" &&
      (membership.courseId === courseId ||
        (membership.courseId === null &&
          ["platform-owner", "organization-administrator"].includes(
            membership.role,
          ))),
  );
}

export function projectCoursePeople(
  people: PeopleSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
): CoursePeopleProjection {
  assertValidPeopleSnapshot(people);
  assertValidWorkspaceSnapshot(workspace);
  if (
    people.organizationId !== actor.organizationId ||
    workspace.workspace.organization.id !== actor.organizationId
  ) {
    throw new Error("Actor is not authorised for this organization");
  }
  const course = workspace.workspace.courses.find(
    (candidate) => candidate.id === courseId,
  );
  if (!course) throw new Error("Course does not exist");
  const access = courseMembershipsForActor(workspace, actor, courseId);
  if (!access.length)
    throw new Error("Actor is not authorised for this course");
  const roles = access.map((membership) => membership.role);
  const canViewFullRoster = roles.some((role) =>
    [
      "platform-owner",
      "organization-administrator",
      "teacher",
      "teaching-assistant",
    ].includes(role),
  );
  const canAddPeople = roles.some((role) =>
    ["platform-owner", "organization-administrator", "teacher"].includes(role),
  );
  const viewerRole = roles.includes("platform-owner")
    ? "platform-owner"
    : roles.includes("organization-administrator")
      ? "organization-administrator"
      : roles.includes("teacher")
        ? "teacher"
        : roles.includes("teaching-assistant")
          ? "teaching-assistant"
          : roles.includes("student")
            ? "student"
            : "parent-guardian";
  const memberships = workspace.workspace.memberships.filter(
    (membership) =>
      membership.courseId === courseId &&
      (canViewFullRoster || membership.principalId === actor.principalId),
  );
  const projected = memberships.flatMap((membership) => {
    const profile = people.profiles.find(
      (candidate) =>
        candidate.id === membership.principalId &&
        candidate.organizationId === actor.organizationId,
    );
    if (!profile || profile.status === "ended") return [];
    return [
      {
        profileId: profile.id,
        displayName: profile.displayName,
        preferredName: profile.preferredName,
        role: membership.role,
        membershipStatus: membership.status,
        profileStatus: profile.status,
      } satisfies CoursePersonProjection,
    ];
  });
  return {
    courseId,
    viewerRole,
    people: clone(
      projected.sort((left, right) =>
        left.displayName.localeCompare(right.displayName),
      ),
    ),
    capabilities: { canAddPeople, canViewFullRoster },
  };
}

export function validatePersonProfile(value: unknown): string[] {
  if (!isRecord(value)) return ["profile must be an object"];
  const issues = unexpectedKeys(
    value,
    [
      "id",
      "organizationId",
      "displayName",
      "preferredName",
      "status",
      "revision",
      "audit",
    ],
    "profile",
  );
  for (const key of ["id", "organizationId", "displayName"] as const) {
    if (typeof value[key] !== "string" || !value[key].trim()) {
      issues.push(`profile.${key} is required`);
    }
  }
  if (value.preferredName !== null && typeof value.preferredName !== "string") {
    issues.push("profile.preferredName must be a string or null");
  }
  if (!profileStatuses.includes(value.status as ProfileStatus)) {
    issues.push("profile.status is invalid");
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) {
    issues.push("profile.revision must be a positive integer");
  }
  issues.push(...validateAudit(value.audit, "profile.audit"));
  return issues;
}

export function assertValidPersonProfile(
  value: unknown,
): asserts value is PersonProfile {
  const issues = validatePersonProfile(value);
  if (issues.length) throw new Error(issues.join("; "));
}

export function validatePeopleSnapshot(value: unknown): string[] {
  if (!isRecord(value)) return ["people snapshot must be an object"];
  const issues = unexpectedKeys(
    value,
    ["schemaVersion", "organizationId", "profiles", "revision", "audit"],
    "people snapshot",
  );
  if (value.schemaVersion !== PEOPLE_SCHEMA_VERSION) {
    issues.push(
      `people snapshot schemaVersion must be ${PEOPLE_SCHEMA_VERSION}`,
    );
  }
  if (
    typeof value.organizationId !== "string" ||
    !value.organizationId.trim()
  ) {
    issues.push("people snapshot organizationId is required");
  }
  if (!Array.isArray(value.profiles)) {
    issues.push("people snapshot profiles must be an array");
  } else {
    const ids = new Set<string>();
    value.profiles.forEach((profile, index) => {
      const profileIssues = validatePersonProfile(profile).map((issue) =>
        issue.replace(/^profile/, `profiles[${index}]`),
      );
      issues.push(...profileIssues);
      if (
        isRecord(profile) &&
        profile.organizationId !== value.organizationId
      ) {
        issues.push(
          `profiles[${index}].organizationId must match people snapshot organizationId`,
        );
      }
      if (isRecord(profile) && typeof profile.id === "string") {
        if (ids.has(profile.id))
          issues.push(`profile ID ${profile.id} is duplicated`);
        ids.add(profile.id);
      }
    });
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1) {
    issues.push("people snapshot revision must be a positive integer");
  }
  issues.push(...validateAudit(value.audit, "people snapshot.audit"));
  return issues;
}

export function assertValidPeopleSnapshot(
  value: unknown,
): asserts value is PeopleSnapshot {
  const issues = validatePeopleSnapshot(value);
  if (issues.length) throw new Error(issues.join("; "));
}

export function savePeopleSnapshot(
  storage: StorageLike,
  snapshot: PeopleSnapshot,
): void {
  assertValidPeopleSnapshot(snapshot);
  storage.setItem(PEOPLE_STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadPeopleSnapshot(
  storage: StorageLike,
  fallback: PeopleSnapshot,
): PeopleSnapshot {
  assertValidPeopleSnapshot(fallback);
  const serialized = storage.getItem(PEOPLE_STORAGE_KEY);
  if (!serialized) return clone(fallback);
  try {
    const parsed = JSON.parse(serialized) as unknown;
    assertValidPeopleSnapshot(parsed);
    return clone(parsed);
  } catch {
    return clone(fallback);
  }
}
