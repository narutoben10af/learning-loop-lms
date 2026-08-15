import type { AuditFields } from "./course";
import {
  assertValidWorkspaceSnapshot,
  projectWorkspace,
  type StorageLike,
  type WorkspaceActor,
  type WorkspaceRole,
  type WorkspaceSnapshot,
} from "./workspace";

export const MEDIA_SCHEMA_VERSION = 1 as const;
export const MEDIA_STORAGE_KEY = "learning-loop-media-snapshot-v1";

export type MediaState = "draft" | "published" | "archived";
export type MediaSource =
  | { kind: "link"; url: string }
  | { kind: "youtube"; url: string; videoId: string }
  | {
      kind: "local-file";
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      lastModified: number;
    };

export interface MediaAsset {
  id: string;
  organizationId: string;
  courseId: string;
  title: string;
  description: string;
  altText: string | null;
  source: MediaSource;
  state: MediaState;
  revision: number;
  audit: AuditFields;
}

export interface MediaSnapshot {
  schemaVersion: typeof MEDIA_SCHEMA_VERSION;
  organizationId: string;
  assets: MediaAsset[];
  revision: number;
  audit: AuditFields;
}

export interface MediaProjectionItem {
  id: string;
  title: string;
  description: string;
  altText: string | null;
  source: MediaSource;
  state: MediaState;
  revision: number;
  storageStatus: "external" | "device-local-draft";
}

export interface CourseMediaProjection {
  courseId: string;
  viewerRole: WorkspaceRole;
  assets: MediaProjectionItem[];
  capabilities: {
    canAuthor: boolean;
    canViewLocalDraftMetadata: boolean;
  };
}

const administratorRoles: readonly WorkspaceRole[] = [
  "platform-owner",
  "organization-administrator",
];
const authorRoles: readonly WorkspaceRole[] = [
  ...administratorRoles,
  "teacher",
];
const states: readonly MediaState[] = ["draft", "published", "archived"];

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
  for (const field of ["createdBy", "updatedBy"] as const) {
    if (typeof value[field] !== "string" || !value[field].trim()) {
      issues.push(`${label}.${field} is required`);
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

function exactSource(source: MediaSource): MediaSource {
  switch (source.kind) {
    case "link":
      return { kind: "link", url: source.url };
    case "youtube":
      return { kind: "youtube", url: source.url, videoId: source.videoId };
    case "local-file":
      return {
        kind: "local-file",
        fileName: source.fileName,
        mimeType: source.mimeType,
        sizeBytes: source.sizeBytes,
        lastModified: source.lastModified,
      };
  }
}

function exactAsset(asset: MediaAsset): MediaAsset {
  return {
    id: asset.id,
    organizationId: asset.organizationId,
    courseId: asset.courseId,
    title: asset.title,
    description: asset.description,
    altText: asset.altText,
    source: exactSource(asset.source),
    state: asset.state,
    revision: asset.revision,
    audit: clone(asset.audit),
  };
}

export function normalizeHttpsUrl(value: string): string {
  const parsed = new URL(requiredText(value, "url"));
  if (parsed.protocol !== "https:") {
    throw new Error("Only HTTPS links are allowed");
  }
  return parsed.toString();
}

export function normalizeYouTubeSource(value: string): {
  url: string;
  videoId: string;
} {
  const url = new URL(normalizeHttpsUrl(value));
  const host = url.hostname.toLocaleLowerCase();
  let videoId = "";
  if (["youtube.com", "www.youtube.com"].includes(host)) {
    videoId = url.pathname.startsWith("/shorts/")
      ? (url.pathname.split("/")[2] ?? "")
      : (url.searchParams.get("v") ?? "");
  } else if (host === "youtu.be") {
    videoId = url.pathname.slice(1).split("/")[0] ?? "";
  }
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new Error("Enter a valid YouTube video URL");
  }
  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
  };
}

function rolesForCourse(
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
            administratorRoles.includes(membership.role))),
    )
    .map((membership) => membership.role);
}

function assertCanAuthor(
  snapshot: MediaSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
): void {
  assertValidMediaSnapshot(snapshot);
  assertValidWorkspaceSnapshot(workspace);
  const course = workspace.workspace.courses.find(
    (candidate) => candidate.id === courseId,
  );
  if (!course || course.lifecycle === "archived") {
    throw new Error("Archived courses cannot change media");
  }
  if (
    snapshot.organizationId !== actor.organizationId ||
    !rolesForCourse(workspace, actor, courseId).some((role) =>
      authorRoles.includes(role),
    )
  ) {
    throw new Error("Actor is not authorised to manage course media");
  }
}

export function createMediaSnapshot(
  organizationId: string,
  actorId: string,
  now: string,
  assets: MediaAsset[] = [],
): MediaSnapshot {
  const snapshot: MediaSnapshot = {
    schemaVersion: MEDIA_SCHEMA_VERSION,
    organizationId: requiredText(organizationId, "organizationId"),
    assets: assets.map(exactAsset),
    revision: 1,
    audit: makeAudit(actorId, now),
  };
  assertValidMediaSnapshot(snapshot);
  return snapshot;
}

export function createMediaAsset(input: {
  id: string;
  organizationId: string;
  courseId: string;
  title: string;
  description: string;
  altText?: string | null;
  source: MediaSource;
  actorId: string;
  now: string;
}): MediaAsset {
  const asset: MediaAsset = {
    id: requiredText(input.id, "media.id"),
    organizationId: requiredText(input.organizationId, "media.organizationId"),
    courseId: requiredText(input.courseId, "media.courseId"),
    title: requiredText(input.title, "media.title"),
    description: requiredText(input.description, "media.description"),
    altText: input.altText?.trim() || null,
    source: exactSource(input.source),
    state: "draft",
    revision: 1,
    audit: makeAudit(input.actorId, input.now),
  };
  assertValidMediaAsset(asset);
  return asset;
}

export function addMediaDraft(
  snapshot: MediaSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: Omit<
    Parameters<typeof createMediaAsset>[0],
    "organizationId" | "actorId"
  >,
): MediaSnapshot {
  assertCanAuthor(snapshot, workspace, actor, input.courseId);
  if (snapshot.assets.some((asset) => asset.id === input.id)) {
    throw new Error(`Media ID ${input.id} already exists`);
  }
  const next = clone(snapshot);
  next.assets.push(
    createMediaAsset({
      ...input,
      organizationId: actor.organizationId,
      actorId: actor.principalId,
    }),
  );
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, input.now);
  assertValidMediaSnapshot(next);
  return next;
}

export function reviseMedia(
  snapshot: MediaSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  input: {
    id: string;
    title: string;
    description: string;
    altText?: string | null;
    source: MediaSource;
    now: string;
  },
): MediaSnapshot {
  const current = snapshot.assets.find((asset) => asset.id === input.id);
  if (!current) throw new Error("Media does not exist");
  assertCanAuthor(snapshot, workspace, actor, current.courseId);
  if (current.state === "archived")
    throw new Error("Archived media cannot be edited");
  const next = clone(snapshot);
  const index = next.assets.findIndex((asset) => asset.id === input.id);
  next.assets[index] = {
    ...exactAsset(current),
    title: requiredText(input.title, "media.title"),
    description: requiredText(input.description, "media.description"),
    altText: input.altText?.trim() || null,
    source: exactSource(input.source),
    state: "draft",
    revision: current.revision + 1,
    audit: updateAudit(current.audit, actor.principalId, input.now),
  };
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, input.now);
  assertValidMediaSnapshot(next);
  return next;
}

export function publishMedia(
  snapshot: MediaSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  id: string,
  now: string,
): MediaSnapshot {
  const current = snapshot.assets.find((asset) => asset.id === id);
  if (!current) throw new Error("Media does not exist");
  assertCanAuthor(snapshot, workspace, actor, current.courseId);
  if (current.source.kind === "local-file") {
    throw new Error(
      "Device-local files cannot be published without durable storage",
    );
  }
  if (current.state === "archived")
    throw new Error("Archived media cannot be published");
  const next = clone(snapshot);
  const index = next.assets.findIndex((asset) => asset.id === id);
  next.assets[index] = {
    ...exactAsset(current),
    state: "published",
    revision: current.revision + 1,
    audit: updateAudit(current.audit, actor.principalId, now),
  };
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, now);
  assertValidMediaSnapshot(next);
  return next;
}

export function archiveMedia(
  snapshot: MediaSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  id: string,
  now: string,
): MediaSnapshot {
  const current = snapshot.assets.find((asset) => asset.id === id);
  if (!current) throw new Error("Media does not exist");
  assertCanAuthor(snapshot, workspace, actor, current.courseId);
  const next = clone(snapshot);
  const index = next.assets.findIndex((asset) => asset.id === id);
  next.assets[index] = {
    ...exactAsset(current),
    state: "archived",
    revision: current.revision + 1,
    audit: updateAudit(current.audit, actor.principalId, now),
  };
  next.revision += 1;
  next.audit = updateAudit(next.audit, actor.principalId, now);
  assertValidMediaSnapshot(next);
  return next;
}

export function projectCourseMedia(
  snapshot: MediaSnapshot,
  workspace: WorkspaceSnapshot,
  actor: WorkspaceActor,
  courseId: string,
): CourseMediaProjection {
  assertValidMediaSnapshot(snapshot);
  assertValidWorkspaceSnapshot(workspace);
  if (snapshot.organizationId !== actor.organizationId) {
    throw new Error("Actor is not authorised for this organization");
  }
  const course = projectWorkspace(workspace.workspace, actor).courses.find(
    (candidate) => candidate.id === courseId,
  );
  if (!course) throw new Error("Actor is not authorised for this course");
  const roles = rolesForCourse(workspace, actor, courseId);
  const canAuthor = roles.some((role) => authorRoles.includes(role));
  const canViewLocalDraftMetadata = roles.some((role) =>
    [...authorRoles, "teaching-assistant"].includes(role),
  );
  const assets = snapshot.assets.flatMap<MediaProjectionItem>((asset) => {
    if (asset.courseId !== courseId) return [];
    if (canViewLocalDraftMetadata) {
      return [
        {
          id: asset.id,
          title: asset.title,
          description: asset.description,
          altText: asset.altText,
          source: exactSource(asset.source),
          state: asset.state,
          revision: asset.revision,
          storageStatus:
            asset.source.kind === "local-file"
              ? "device-local-draft"
              : "external",
        },
      ];
    }
    if (asset.state !== "published" || asset.source.kind === "local-file")
      return [];
    return [
      {
        id: asset.id,
        title: asset.title,
        description: asset.description,
        altText: asset.altText,
        source: exactSource(asset.source),
        state: "published",
        revision: asset.revision,
        storageStatus: "external",
      },
    ];
  });
  assets.sort((left, right) => left.title.localeCompare(right.title));
  return {
    courseId,
    viewerRole: course.role,
    assets: clone(assets),
    capabilities: { canAuthor, canViewLocalDraftMetadata },
  };
}

function validateSource(value: unknown): string[] {
  if (!isRecord(value)) return ["media.source must be an object"];
  if (value.kind === "link") {
    const issues = unexpectedKeys(value, ["kind", "url"], "media.source");
    try {
      normalizeHttpsUrl(String(value.url));
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : "media.source.url is invalid",
      );
    }
    return issues;
  }
  if (value.kind === "youtube") {
    const issues = unexpectedKeys(
      value,
      ["kind", "url", "videoId"],
      "media.source",
    );
    try {
      const normalized = normalizeYouTubeSource(String(value.url));
      if (value.videoId !== normalized.videoId)
        issues.push("media.source.videoId does not match URL");
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : "media.source.url is invalid",
      );
    }
    return issues;
  }
  if (value.kind === "local-file") {
    const issues = unexpectedKeys(
      value,
      ["kind", "fileName", "mimeType", "sizeBytes", "lastModified"],
      "media.source",
    );
    for (const field of ["fileName", "mimeType"] as const) {
      if (typeof value[field] !== "string" || !value[field].trim()) {
        issues.push(`media.source.${field} is required`);
      }
    }
    if (!Number.isInteger(value.sizeBytes) || Number(value.sizeBytes) < 0) {
      issues.push("media.source.sizeBytes must be a non-negative integer");
    }
    if (
      !Number.isInteger(value.lastModified) ||
      Number(value.lastModified) < 0
    ) {
      issues.push("media.source.lastModified must be a non-negative integer");
    }
    return issues;
  }
  return ["media.source.kind is invalid"];
}

export function validateMediaAsset(value: unknown): string[] {
  if (!isRecord(value)) return ["media must be an object"];
  const issues = unexpectedKeys(
    value,
    [
      "id",
      "organizationId",
      "courseId",
      "title",
      "description",
      "altText",
      "source",
      "state",
      "revision",
      "audit",
    ],
    "media",
  );
  for (const field of [
    "id",
    "organizationId",
    "courseId",
    "title",
    "description",
  ] as const) {
    if (typeof value[field] !== "string" || !value[field].trim())
      issues.push(`media.${field} is required`);
  }
  if (value.altText !== null && typeof value.altText !== "string")
    issues.push("media.altText must be text or null");
  if (!states.includes(value.state as MediaState))
    issues.push("media.state is invalid");
  issues.push(...validateSource(value.source));
  if (
    value.state === "published" &&
    isRecord(value.source) &&
    value.source.kind === "local-file"
  ) {
    issues.push("device-local files cannot be published");
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1)
    issues.push("media.revision must be a positive integer");
  issues.push(...validateAudit(value.audit, "media.audit"));
  return issues;
}

export function assertValidMediaAsset(
  value: unknown,
): asserts value is MediaAsset {
  const issues = validateMediaAsset(value);
  if (issues.length) throw new Error(issues.join("; "));
}

export function validateMediaSnapshot(value: unknown): string[] {
  if (!isRecord(value)) return ["media snapshot must be an object"];
  const issues = unexpectedKeys(
    value,
    ["schemaVersion", "organizationId", "assets", "revision", "audit"],
    "media snapshot",
  );
  if (value.schemaVersion !== MEDIA_SCHEMA_VERSION)
    issues.push(`media snapshot schemaVersion must be ${MEDIA_SCHEMA_VERSION}`);
  if (typeof value.organizationId !== "string" || !value.organizationId.trim())
    issues.push("media snapshot organizationId is required");
  if (!Array.isArray(value.assets)) {
    issues.push("media snapshot assets must be an array");
  } else {
    const ids = new Set<string>();
    value.assets.forEach((asset, index) => {
      issues.push(
        ...validateMediaAsset(asset).map((issue) =>
          issue.replace(/^media/, `assets[${index}]`),
        ),
      );
      if (isRecord(asset)) {
        if (asset.organizationId !== value.organizationId)
          issues.push(`assets[${index}].organizationId must match snapshot`);
        if (typeof asset.id === "string") {
          if (ids.has(asset.id))
            issues.push(`media ID ${asset.id} is duplicated`);
          ids.add(asset.id);
        }
      }
    });
  }
  if (!Number.isInteger(value.revision) || Number(value.revision) < 1)
    issues.push("media snapshot revision must be a positive integer");
  issues.push(...validateAudit(value.audit, "media snapshot.audit"));
  return issues;
}

export function assertValidMediaSnapshot(
  value: unknown,
): asserts value is MediaSnapshot {
  const issues = validateMediaSnapshot(value);
  if (issues.length) throw new Error(issues.join("; "));
}

export function saveMediaSnapshot(
  storage: StorageLike,
  snapshot: MediaSnapshot,
): void {
  assertValidMediaSnapshot(snapshot);
  storage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadMediaSnapshot(
  storage: StorageLike,
  fallback: MediaSnapshot,
): MediaSnapshot {
  assertValidMediaSnapshot(fallback);
  const serialized = storage.getItem(MEDIA_STORAGE_KEY);
  if (!serialized) return clone(fallback);
  try {
    const parsed = JSON.parse(serialized) as unknown;
    assertValidMediaSnapshot(parsed);
    return clone(parsed);
  } catch {
    return clone(fallback);
  }
}
