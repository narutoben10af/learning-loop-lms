/**
 * Course/module contracts for the first authoring foundation.
 *
 * These are pure domain values: they do not persist, authenticate, enroll, or
 * call a backend. IDs are supplied by the caller and are never changed by
 * reorder, release, or revision operations. A future service can wrap these
 * contracts with tenant and permission enforcement.
 */

export type CourseId = string;
export type ModuleId = string;
export type ModuleItemId = string;
export type RevisionId = string;
export type DomainRole = "teacher" | "student";

export type CourseStatus = "draft" | "active" | "archived";
export type ReleaseState =
  | "draft"
  | "scheduled"
  | "published"
  | "closed"
  | "hidden"
  | "archived";

export type ModuleItemType =
  | "learning-block"
  | "page"
  | "resource"
  | "video"
  | "assignment"
  | "quiz"
  | "discussion";

export interface AuditFields {
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface AvailabilityWindow {
  startsAt: string | null;
  endsAt: string | null;
}

export type ItemCompletionRule =
  | { type: "view" }
  | { type: "submit" }
  | { type: "manual" }
  | { type: "score"; minimumScore: number };

export type ModuleCompletionRule =
  | { type: "all-items" }
  | { type: "percentage"; minimumPercent: number };

export interface Course {
  id: CourseId;
  title: string;
  subject: string;
  status: CourseStatus;
  revision: number;
  audit: AuditFields;
}

export interface Module {
  id: ModuleId;
  courseId: CourseId;
  title: string;
  position: number;
  state: ReleaseState;
  availability: AvailabilityWindow;
  prerequisiteModuleIds: ModuleId[];
  completion: ModuleCompletionRule;
  revision: number;
  audit: AuditFields;
}

export interface ModuleItem {
  id: ModuleItemId;
  courseId: CourseId;
  moduleId: ModuleId;
  type: ModuleItemType;
  title: string;
  position: number;
  state: ReleaseState;
  availability: AvailabilityWindow;
  prerequisiteItemIds: ModuleItemId[];
  completion: ItemCompletionRule;
  revision: number;
  /** Content revision identity; `revision` is the aggregate record version. */
  revisionId: RevisionId;
  audit: AuditFields;
}

export interface CourseModel {
  course: Course;
  modules: Module[];
  items: ModuleItem[];
}

export interface AvailabilityContext {
  now: string;
  completedModuleIds?: ReadonlySet<ModuleId>;
  completedItemIds?: ReadonlySet<ModuleItemId>;
}

export interface CompletionContext {
  viewed?: boolean;
  submitted?: boolean;
  manuallyMarked?: boolean;
  score?: number;
}

export interface CourseProjection {
  role: DomainRole;
  course: Pick<Course, "id" | "title" | "subject" | "status">;
  modules: Array<{
    id: ModuleId;
    title: string;
    position: number;
    state: ReleaseState;
    /** Student-safe aggregate for items that are not released yet. */
    lockedItemCount: number;
    nextAvailableAt: string | null;
    lockedReason: "scheduled" | "prerequisite" | "mixed" | null;
    items: Array<{
      id: ModuleItemId;
      type: ModuleItemType;
      title: string;
      position: number;
      state: ReleaseState;
      completion: ItemCompletionRule;
    }>;
  }>;
  capabilities: {
    canEdit: boolean;
    canPublish: boolean;
    canViewEvidence: boolean;
  };
}

export interface CreateCourseInput {
  id: CourseId;
  title: string;
  subject: string;
  actorId: string;
  now: string;
}

export interface CreateModuleInput {
  id: ModuleId;
  courseId: CourseId;
  title: string;
  position: number;
  actorId: string;
  now: string;
  state?: ReleaseState;
  availability?: AvailabilityWindow;
  prerequisiteModuleIds?: ModuleId[];
  completion?: ModuleCompletionRule;
}

export interface CreateModuleItemInput {
  id: ModuleItemId;
  courseId: CourseId;
  moduleId: ModuleId;
  type: ModuleItemType;
  title: string;
  position: number;
  actorId: string;
  now: string;
  state?: ReleaseState;
  availability?: AvailabilityWindow;
  prerequisiteItemIds?: ModuleItemId[];
  completion?: ItemCompletionRule;
  revisionId?: RevisionId;
}

const releaseTransitions: Record<ReleaseState, readonly ReleaseState[]> = {
  draft: ["scheduled", "published", "hidden", "archived"],
  scheduled: ["draft", "published", "hidden", "archived"],
  published: ["scheduled", "closed", "hidden", "archived"],
  closed: ["published", "hidden", "archived"],
  hidden: ["draft", "scheduled", "published", "archived"],
  archived: [],
};

const itemTypes: readonly ModuleItemType[] = [
  "learning-block",
  "page",
  "resource",
  "video",
  "assignment",
  "quiz",
  "discussion",
];

const releaseStates: readonly ReleaseState[] = [
  "draft",
  "scheduled",
  "published",
  "closed",
  "hidden",
  "archived",
];

function assertNonEmpty(value: string, field: string): void {
  if (!value.trim()) throw new Error(`${field} must not be empty`);
}

function assertIsoDate(value: string, field: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${field} must be an ISO date`);
  }
  return parsed;
}

function assertRevision(revision: number): void {
  if (!Number.isInteger(revision) || revision < 1) {
    throw new Error("revision must be a positive integer");
  }
}

function assertAvailability(window: AvailabilityWindow): void {
  const startsAt = window.startsAt
    ? assertIsoDate(window.startsAt, "availability.startsAt")
    : null;
  const endsAt = window.endsAt
    ? assertIsoDate(window.endsAt, "availability.endsAt")
    : null;
  if (startsAt !== null && endsAt !== null && endsAt <= startsAt) {
    throw new Error("availability.endsAt must be after startsAt");
  }
}

function assertItemCompletion(
  rule: ItemCompletionRule,
  field = "completion",
): void {
  if (!rule || typeof rule !== "object") throw new Error(`${field} is invalid`);
  if (rule.type === "score") {
    if (!Number.isFinite(rule.minimumScore) || rule.minimumScore < 0) {
      throw new Error(
        `${field}.minimumScore must be a finite non-negative number`,
      );
    }
    return;
  }
  if (
    !("view" === rule.type || "submit" === rule.type || "manual" === rule.type)
  ) {
    throw new Error(`${field}.type is invalid`);
  }
}

function assertModuleCompletion(
  rule: ModuleCompletionRule,
  field = "completion",
): void {
  if (!rule || typeof rule !== "object") throw new Error(`${field} is invalid`);
  if (rule.type === "percentage") {
    if (
      !Number.isFinite(rule.minimumPercent) ||
      rule.minimumPercent < 0 ||
      rule.minimumPercent > 100
    ) {
      throw new Error(`${field}.minimumPercent must be between 0 and 100`);
    }
    return;
  }
  if (rule.type !== "all-items") throw new Error(`${field}.type is invalid`);
}

function cloneAvailability(window: AvailabilityWindow): AvailabilityWindow {
  return { startsAt: window.startsAt, endsAt: window.endsAt };
}

function cloneItemCompletion(rule: ItemCompletionRule): ItemCompletionRule {
  return rule.type === "score" ? { ...rule } : { type: rule.type };
}

function cloneModuleCompletion(
  rule: ModuleCompletionRule,
): ModuleCompletionRule {
  return rule.type === "percentage" ? { ...rule } : { type: rule.type };
}

function hasDependencyCycle(
  ids: readonly string[],
  dependencies: (id: string) => readonly string[],
): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependency of dependencies(id)) {
      if (visit(dependency)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return ids.some(visit);
}

function defaultAvailability(): AvailabilityWindow {
  return { startsAt: null, endsAt: null };
}

function audit(actorId: string, now: string): AuditFields {
  assertNonEmpty(actorId, "actorId");
  assertIsoDate(now, "now");
  return {
    createdBy: actorId,
    createdAt: now,
    updatedBy: actorId,
    updatedAt: now,
  };
}

function assertAudit(value: AuditFields, field: string): void {
  assertNonEmpty(value.createdBy, `${field}.createdBy`);
  assertNonEmpty(value.updatedBy, `${field}.updatedBy`);
  const createdAt = assertIsoDate(value.createdAt, `${field}.createdAt`);
  const updatedAt = assertIsoDate(value.updatedAt, `${field}.updatedAt`);
  if (updatedAt < createdAt) {
    throw new Error(`${field}.updatedAt must not be before createdAt`);
  }
}

function assertMonotonicUpdate(
  previous: string,
  next: string,
  field: string,
): void {
  if (
    assertIsoDate(next, field) < assertIsoDate(previous, `${field}.previous`)
  ) {
    throw new Error(`${field} must not move backwards`);
  }
}

export function createCourse(input: CreateCourseInput): Course {
  assertNonEmpty(input.id, "course.id");
  assertNonEmpty(input.title, "course.title");
  assertNonEmpty(input.subject, "course.subject");
  return {
    id: input.id,
    title: input.title,
    subject: input.subject,
    status: "draft",
    revision: 1,
    audit: audit(input.actorId, input.now),
  };
}

export function createModule(input: CreateModuleInput): Module {
  assertNonEmpty(input.id, "module.id");
  assertNonEmpty(input.courseId, "module.courseId");
  assertNonEmpty(input.title, "module.title");
  if (!Number.isInteger(input.position) || input.position < 0) {
    throw new Error("module.position must be a non-negative integer");
  }
  const availability = input.availability ?? defaultAvailability();
  assertAvailability(availability);
  const state = input.state ?? "draft";
  if (!releaseStates.includes(state)) throw new Error("invalid module state");
  const prerequisiteModuleIds = [...(input.prerequisiteModuleIds ?? [])];
  if (prerequisiteModuleIds.includes(input.id)) {
    throw new Error("module cannot require itself");
  }
  const completion = input.completion ?? { type: "all-items" as const };
  assertModuleCompletion(completion);
  return {
    id: input.id,
    courseId: input.courseId,
    title: input.title,
    position: input.position,
    state,
    availability: cloneAvailability(availability),
    prerequisiteModuleIds,
    completion: cloneModuleCompletion(completion),
    revision: 1,
    audit: audit(input.actorId, input.now),
  };
}

export function createModuleItem(input: CreateModuleItemInput): ModuleItem {
  assertNonEmpty(input.id, "moduleItem.id");
  assertNonEmpty(input.courseId, "moduleItem.courseId");
  assertNonEmpty(input.moduleId, "moduleItem.moduleId");
  assertNonEmpty(input.title, "moduleItem.title");
  if (!itemTypes.includes(input.type))
    throw new Error("unknown module item type");
  if (!Number.isInteger(input.position) || input.position < 0) {
    throw new Error("moduleItem.position must be a non-negative integer");
  }
  const availability = input.availability ?? defaultAvailability();
  assertAvailability(availability);
  const completion = input.completion ?? { type: "view" as const };
  assertItemCompletion(completion);
  const state = input.state ?? "draft";
  if (!releaseStates.includes(state))
    throw new Error("invalid module item state");
  const prerequisiteItemIds = [...(input.prerequisiteItemIds ?? [])];
  if (prerequisiteItemIds.includes(input.id)) {
    throw new Error("module item cannot require itself");
  }
  return {
    id: input.id,
    courseId: input.courseId,
    moduleId: input.moduleId,
    type: input.type,
    title: input.title,
    position: input.position,
    state,
    availability: cloneAvailability(availability),
    prerequisiteItemIds,
    completion: cloneItemCompletion(completion),
    revision: 1,
    revisionId: input.revisionId ?? `${input.id}:r1`,
    audit: audit(input.actorId, input.now),
  };
}

export function reviseModuleItem(
  item: ModuleItem,
  changes: Pick<
    ModuleItem,
    "title" | "type" | "completion" | "availability" | "prerequisiteItemIds"
  >,
  actorId: string,
  now: string,
  revisionId = `${item.id}:r${item.revision + 1}`,
): ModuleItem {
  if (item.state === "archived")
    throw new Error("archived items cannot be revised");
  assertNonEmpty(changes.title, "moduleItem.title");
  if (!itemTypes.includes(changes.type))
    throw new Error("unknown module item type");
  assertAvailability(changes.availability);
  if (
    changes.completion.type === "score" &&
    (!Number.isFinite(changes.completion.minimumScore) ||
      changes.completion.minimumScore < 0)
  ) {
    throw new Error(
      "completion.minimumScore must be a finite non-negative number",
    );
  }
  assertItemCompletion(changes.completion);
  assertNonEmpty(revisionId, "revisionId");
  assertNonEmpty(actorId, "actorId");
  assertIsoDate(now, "now");
  assertMonotonicUpdate(item.audit.updatedAt, now, "now");
  const nextRevision = item.revision + 1;
  assertRevision(nextRevision);
  return {
    ...item,
    ...changes,
    state: "draft",
    availability: cloneAvailability(changes.availability),
    revision: nextRevision,
    revisionId,
    prerequisiteItemIds: [...changes.prerequisiteItemIds],
    completion: cloneItemCompletion(changes.completion),
    audit: { ...item.audit, updatedBy: actorId, updatedAt: now },
  };
}

type VersionedAudited = {
  state: ReleaseState;
  revision: number;
  audit: AuditFields;
};

function cloneVersionedValue<T extends VersionedAudited>(value: T): T {
  if ("moduleId" in value) {
    const item = value as unknown as ModuleItem;
    return {
      ...item,
      availability: cloneAvailability(item.availability),
      prerequisiteItemIds: [...item.prerequisiteItemIds],
      completion: cloneItemCompletion(item.completion),
    } as unknown as T;
  }
  const module = value as unknown as Module;
  return {
    ...module,
    availability: cloneAvailability(module.availability),
    prerequisiteModuleIds: [...module.prerequisiteModuleIds],
    completion: cloneModuleCompletion(module.completion),
  } as unknown as T;
}

export function transitionReleaseState<T extends VersionedAudited>(
  value: T,
  nextState: ReleaseState,
  actorId: string,
  now: string,
): T {
  if (value.state === nextState) return value;
  if (!releaseTransitions[value.state].includes(nextState)) {
    throw new Error(`cannot transition ${value.state} to ${nextState}`);
  }
  assertNonEmpty(actorId, "actorId");
  assertIsoDate(now, "now");
  assertMonotonicUpdate(value.audit.updatedAt, now, "now");
  return {
    ...cloneVersionedValue(value),
    state: nextState,
    revision: value.revision + 1,
    audit: { ...value.audit, updatedBy: actorId, updatedAt: now },
  };
}

export function orderModuleItems(items: readonly ModuleItem[]): ModuleItem[] {
  return [...items].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
}

export function reorderModules(
  modules: readonly Module[],
  orderedIds: readonly ModuleId[],
  actorId: string,
  now: string,
): Module[] {
  const courseIds = new Set(modules.map((module) => module.courseId));
  if (courseIds.size > 1) {
    throw new Error("reorderModules accepts one course at a time");
  }
  assertNonEmpty(actorId, "actorId");
  assertIsoDate(now, "now");
  if (
    modules.some(
      (module) =>
        assertIsoDate(now, "now") <
        assertIsoDate(module.audit.updatedAt, "audit.updatedAt"),
    )
  ) {
    throw new Error("now must not move a module audit backwards");
  }
  if (
    orderedIds.length !== modules.length ||
    new Set(orderedIds).size !== orderedIds.length
  ) {
    throw new Error("orderedIds must contain each module exactly once");
  }
  const byId = new Map(modules.map((module) => [module.id, module]));
  if (orderedIds.some((id) => !byId.has(id))) {
    throw new Error("orderedIds contains an unknown module");
  }
  return orderedIds.map((id, position) => {
    const module = byId.get(id)!;
    return {
      ...module,
      position,
      availability: cloneAvailability(module.availability),
      prerequisiteModuleIds: [...module.prerequisiteModuleIds],
      completion: cloneModuleCompletion(module.completion),
      revision: module.revision + 1,
      audit: { ...module.audit, updatedBy: actorId, updatedAt: now },
    };
  });
}

/** Accessible Move-To equivalent for module drag/reorder UIs. */
export function moveModule(
  modules: readonly Module[],
  moduleId: ModuleId,
  targetPosition: number,
  actorId: string,
  now: string,
): Module[] {
  const ordered = [...modules].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
  const currentIndex = ordered.findIndex((module) => module.id === moduleId);
  if (currentIndex < 0) throw new Error("module not found");
  if (
    !Number.isInteger(targetPosition) ||
    targetPosition < 0 ||
    targetPosition >= ordered.length
  ) {
    throw new Error("targetPosition is outside the course");
  }
  const next = [...ordered];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(targetPosition, 0, moved);
  return reorderModules(
    next,
    next.map((module) => module.id),
    actorId,
    now,
  );
}

export function reorderModuleItems(
  items: readonly ModuleItem[],
  orderedIds: readonly ModuleItemId[],
  actorId: string,
  now: string,
): ModuleItem[] {
  const courseIds = new Set(items.map((item) => item.courseId));
  const moduleIds = new Set(items.map((item) => item.moduleId));
  if (courseIds.size > 1 || moduleIds.size > 1) {
    throw new Error("reorderModuleItems accepts one course module at a time");
  }
  assertNonEmpty(actorId, "actorId");
  assertIsoDate(now, "now");
  if (
    items.some(
      (item) =>
        assertIsoDate(now, "now") <
        assertIsoDate(item.audit.updatedAt, "audit.updatedAt"),
    )
  ) {
    throw new Error("now must not move an item audit backwards");
  }
  if (
    orderedIds.length !== items.length ||
    new Set(orderedIds).size !== orderedIds.length
  ) {
    throw new Error("orderedIds must contain each module item exactly once");
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  if (orderedIds.some((id) => !byId.has(id))) {
    throw new Error("orderedIds contains an unknown module item");
  }
  return orderedIds.map((id, position) => {
    const item = byId.get(id)!;
    return {
      ...item,
      position,
      availability: cloneAvailability(item.availability),
      prerequisiteItemIds: [...item.prerequisiteItemIds],
      completion: cloneItemCompletion(item.completion),
      revision: item.revision + 1,
      audit: { ...item.audit, updatedBy: actorId, updatedAt: now },
    };
  });
}

/** Accessible Move-To equivalent for drag/reorder UIs. */
export function moveModuleItem(
  items: readonly ModuleItem[],
  itemId: ModuleItemId,
  targetPosition: number,
  actorId: string,
  now: string,
): ModuleItem[] {
  const ordered = orderModuleItems(items);
  const currentIndex = ordered.findIndex((item) => item.id === itemId);
  if (currentIndex < 0) throw new Error("module item not found");
  if (
    !Number.isInteger(targetPosition) ||
    targetPosition < 0 ||
    targetPosition >= ordered.length
  ) {
    throw new Error("targetPosition is outside the module");
  }
  const next = [...ordered];
  const [moved] = next.splice(currentIndex, 1);
  next.splice(targetPosition, 0, moved);
  return reorderModuleItems(
    next,
    next.map((item) => item.id),
    actorId,
    now,
  );
}

export function isAvailable(
  state: ReleaseState,
  availability: AvailabilityWindow,
  context: AvailabilityContext,
  prerequisiteIds: readonly string[] = [],
  completedIds?: ReadonlySet<string>,
): boolean {
  if (state !== "published") return false;
  const now = assertIsoDate(context.now, "context.now");
  const completed =
    completedIds ?? context.completedItemIds ?? context.completedModuleIds;
  if (prerequisiteIds.some((id) => !completed?.has(id))) return false;
  const startsAt = availability.startsAt
    ? assertIsoDate(availability.startsAt, "availability.startsAt")
    : null;
  const endsAt = availability.endsAt
    ? assertIsoDate(availability.endsAt, "availability.endsAt")
    : null;
  if (startsAt !== null && now < startsAt) return false;
  if (endsAt !== null && now >= endsAt) return false;
  return true;
}

export function isItemComplete(
  rule: ItemCompletionRule,
  context: CompletionContext,
): boolean {
  assertItemCompletion(rule);
  switch (rule.type) {
    case "view":
      return Boolean(context.viewed);
    case "submit":
      return Boolean(context.submitted);
    case "manual":
      return Boolean(context.manuallyMarked);
    case "score":
      return (
        typeof context.score === "number" &&
        Number.isFinite(context.score) &&
        context.score >= rule.minimumScore
      );
  }
}

export function validateCourseModel(model: CourseModel): string[] {
  const issues: string[] = [];
  const moduleIds = new Set<ModuleId>();
  const itemIds = new Set<ModuleItemId>();
  const modulesById = new Map<ModuleId, Module>();
  const itemsById = new Map<ModuleItemId, ModuleItem>();

  try {
    assertNonEmpty(model.course.id, "course.id");
    assertNonEmpty(model.course.title, "course.title");
    assertNonEmpty(model.course.subject, "course.subject");
    assertRevision(model.course.revision);
    assertAudit(model.course.audit, "course.audit");
    if (!["draft", "active", "archived"].includes(model.course.status)) {
      throw new Error("course.status is invalid");
    }
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "invalid course");
  }

  for (const module of model.modules) {
    if (moduleIds.has(module.id))
      issues.push(`duplicate module id: ${module.id}`);
    moduleIds.add(module.id);
    modulesById.set(module.id, module);
    try {
      assertNonEmpty(module.id, "module.id");
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : "invalid module identity",
      );
    }
    try {
      assertNonEmpty(module.title, `module ${module.id}.title`);
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : "invalid module title",
      );
    }
    if (module.courseId !== model.course.id)
      issues.push(`module ${module.id} belongs to another course`);
    if (!releaseStates.includes(module.state))
      issues.push(`module ${module.id} has an invalid state`);
    if (!Number.isInteger(module.position) || module.position < 0)
      issues.push(`module ${module.id} has an invalid position`);
    try {
      assertAvailability(module.availability);
      assertRevision(module.revision);
      assertModuleCompletion(
        module.completion,
        `module ${module.id}.completion`,
      );
      assertAudit(module.audit, `module ${module.id}.audit`);
    } catch (error) {
      issues.push(
        error instanceof Error
          ? `module ${module.id}: ${error.message}`
          : `invalid module ${module.id}`,
      );
    }
    if (module.prerequisiteModuleIds.includes(module.id))
      issues.push(`module ${module.id} cannot require itself`);
  }

  for (const module of model.modules) {
    for (const prerequisiteId of module.prerequisiteModuleIds) {
      if (!modulesById.has(prerequisiteId))
        issues.push(`module ${module.id} requires an unknown module`);
    }
  }

  const modulePositions = model.modules.map((module) => module.position);
  const sortedModulePositions = [...modulePositions].sort((a, b) => a - b);
  if (
    new Set(modulePositions).size !== modulePositions.length ||
    sortedModulePositions.some((position, index) => position !== index)
  ) {
    issues.push("course modules must have unique contiguous positions");
  }
  if (
    hasDependencyCycle(
      model.modules.map((module) => module.id),
      (id) => modulesById.get(id)?.prerequisiteModuleIds ?? [],
    )
  ) {
    issues.push("course module prerequisites contain a cycle");
  }

  for (const item of model.items) {
    if (itemIds.has(item.id))
      issues.push(`duplicate module item id: ${item.id}`);
    itemIds.add(item.id);
    itemsById.set(item.id, item);
    try {
      assertNonEmpty(item.id, "module item.id");
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : "invalid item identity",
      );
    }
    try {
      assertNonEmpty(item.title, `item ${item.id}.title`);
    } catch (error) {
      issues.push(
        error instanceof Error ? error.message : "invalid item title",
      );
    }
    if (item.courseId !== model.course.id)
      issues.push(`item ${item.id} belongs to another course`);
    if (!modulesById.has(item.moduleId))
      issues.push(`item ${item.id} references an unknown module`);
    if (!itemTypes.includes(item.type))
      issues.push(`item ${item.id} has an invalid type`);
    if (!releaseStates.includes(item.state))
      issues.push(`item ${item.id} has an invalid state`);
    if (!Number.isInteger(item.position) || item.position < 0)
      issues.push(`item ${item.id} has an invalid position`);
    try {
      assertAvailability(item.availability);
      assertRevision(item.revision);
      assertNonEmpty(item.revisionId, `item ${item.id}.revisionId`);
      assertItemCompletion(item.completion, `item ${item.id}.completion`);
      assertAudit(item.audit, `item ${item.id}.audit`);
    } catch (error) {
      issues.push(
        error instanceof Error
          ? `item ${item.id}: ${error.message}`
          : `invalid item ${item.id}`,
      );
    }
    if (item.prerequisiteItemIds.includes(item.id))
      issues.push(`item ${item.id} cannot require itself`);
  }

  for (const item of model.items) {
    for (const prerequisiteId of item.prerequisiteItemIds) {
      if (!itemsById.has(prerequisiteId))
        issues.push(`item ${item.id} requires an unknown item`);
    }
  }

  if (
    hasDependencyCycle(
      model.items.map((item) => item.id),
      (id) => itemsById.get(id)?.prerequisiteItemIds ?? [],
    )
  ) {
    issues.push("module item prerequisites contain a cycle");
  }

  for (const module of model.modules) {
    const positions = model.items
      .filter((item) => item.moduleId === module.id)
      .map((item) => item.position);
    const sortedPositions = [...positions].sort((a, b) => a - b);
    if (
      new Set(positions).size !== positions.length ||
      sortedPositions.some((position, index) => position !== index)
    ) {
      issues.push(`module ${module.id} contains non-contiguous item positions`);
    }
  }
  return issues;
}

export function assertValidCourseModel(model: CourseModel): void {
  const issues = validateCourseModel(model);
  if (issues.length) throw new Error(issues.join("; "));
}

export function projectCourse(
  model: CourseModel,
  role: DomainRole,
  context: AvailabilityContext,
): CourseProjection {
  assertValidCourseModel(model);
  const nowMs = assertIsoDate(context.now, "context.now");
  const visibleModules = orderModules(model.modules).filter((module) => {
    if (role === "teacher") return module.state !== "archived";
    if (model.course.status !== "active") return false;
    return isAvailable(
      module.state,
      module.availability,
      context,
      module.prerequisiteModuleIds,
      context.completedModuleIds,
    );
  });
  const modules = visibleModules.map((module, visibleModulePosition) => {
    const orderedItems = orderModuleItems(
      model.items.filter((item) => item.moduleId === module.id),
    );
    const visibleItems = orderedItems.filter((item) =>
      role === "teacher"
        ? item.state !== "archived"
        : isAvailable(
            item.state,
            item.availability,
            context,
            item.prerequisiteItemIds,
            context.completedItemIds,
          ),
    );
    const lockedItems =
      role === "student"
        ? orderedItems.filter((item) => {
            if (item.state !== "scheduled" && item.state !== "published") {
              return false;
            }
            const startsAt = item.availability.startsAt
              ? assertIsoDate(
                  item.availability.startsAt,
                  "availability.startsAt",
                )
              : null;
            const endsAt = item.availability.endsAt
              ? assertIsoDate(item.availability.endsAt, "availability.endsAt")
              : null;
            if (endsAt !== null && endsAt <= nowMs) return false;
            const prerequisiteLocked = item.prerequisiteItemIds.some(
              (id) => !context.completedItemIds?.has(id),
            );
            const futureRelease = startsAt !== null && startsAt > nowMs;
            return (
              item.state === "scheduled" || futureRelease || prerequisiteLocked
            );
          })
        : [];
    const nextAvailableAt =
      lockedItems
        .map((item) => item.availability.startsAt)
        .filter(
          (value): value is string =>
            value !== null && assertIsoDate(value, "nextAvailableAt") > nowMs,
        )
        .sort(
          (a, b) =>
            assertIsoDate(a, "nextAvailableAt") -
            assertIsoDate(b, "nextAvailableAt"),
        )[0] ?? null;
    const hasScheduledLock = lockedItems.some((item) => {
      const startsAt = item.availability.startsAt
        ? assertIsoDate(item.availability.startsAt, "availability.startsAt")
        : null;
      return (
        item.state === "scheduled" || (startsAt !== null && startsAt > nowMs)
      );
    });
    const hasPrerequisiteLock = lockedItems.some((item) =>
      item.prerequisiteItemIds.some((id) => !context.completedItemIds?.has(id)),
    );
    const lockedReason: CourseProjection["modules"][number]["lockedReason"] =
      hasScheduledLock && hasPrerequisiteLock
        ? "mixed"
        : hasScheduledLock
          ? "scheduled"
          : hasPrerequisiteLock
            ? "prerequisite"
            : null;
    return {
      id: module.id,
      title: module.title,
      position: role === "teacher" ? module.position : visibleModulePosition,
      state: module.state,
      lockedItemCount: lockedItems.length,
      nextAvailableAt,
      lockedReason,
      items: visibleItems.map((item, visibleItemPosition) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        position: role === "teacher" ? item.position : visibleItemPosition,
        state: item.state,
        completion: cloneItemCompletion(item.completion),
      })),
    };
  });
  return {
    role,
    course: {
      id: model.course.id,
      title: model.course.title,
      subject: model.course.subject,
      status: model.course.status,
    },
    modules,
    capabilities: {
      canEdit: role === "teacher",
      canPublish: role === "teacher",
      canViewEvidence: role === "teacher",
    },
  };
}

function orderModules(modules: readonly Module[]): Module[] {
  return [...modules].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
}
