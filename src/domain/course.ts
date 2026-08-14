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

function assertIsoDate(value: string, field: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be an ISO date`);
  }
}

function assertRevision(revision: number): void {
  if (!Number.isInteger(revision) || revision < 1) {
    throw new Error("revision must be a positive integer");
  }
}

function assertAvailability(window: AvailabilityWindow): void {
  if (window.startsAt) assertIsoDate(window.startsAt, "availability.startsAt");
  if (window.endsAt) assertIsoDate(window.endsAt, "availability.endsAt");
  if (window.startsAt && window.endsAt && window.endsAt <= window.startsAt) {
    throw new Error("availability.endsAt must be after startsAt");
  }
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
  return {
    id: input.id,
    courseId: input.courseId,
    title: input.title,
    position: input.position,
    state: input.state ?? "draft",
    availability,
    prerequisiteModuleIds: [...(input.prerequisiteModuleIds ?? [])],
    completion: input.completion ?? { type: "all-items" },
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
  if (completion.type === "score" && completion.minimumScore < 0) {
    throw new Error("completion.minimumScore must not be negative");
  }
  return {
    id: input.id,
    courseId: input.courseId,
    moduleId: input.moduleId,
    type: input.type,
    title: input.title,
    position: input.position,
    state: input.state ?? "draft",
    availability,
    prerequisiteItemIds: [...(input.prerequisiteItemIds ?? [])],
    completion,
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
    changes.completion.minimumScore < 0
  ) {
    throw new Error("completion.minimumScore must not be negative");
  }
  assertNonEmpty(revisionId, "revisionId");
  assertNonEmpty(actorId, "actorId");
  assertIsoDate(now, "now");
  const nextRevision = item.revision + 1;
  assertRevision(nextRevision);
  return {
    ...item,
    ...changes,
    state: "draft",
    revision: nextRevision,
    revisionId,
    prerequisiteItemIds: [...changes.prerequisiteItemIds],
    audit: { ...item.audit, updatedBy: actorId, updatedAt: now },
  };
}

export function transitionReleaseState<T extends { state: ReleaseState }>(
  value: T,
  nextState: ReleaseState,
): T {
  if (value.state === nextState) return value;
  if (!releaseTransitions[value.state].includes(nextState)) {
    throw new Error(`cannot transition ${value.state} to ${nextState}`);
  }
  return { ...value, state: nextState };
}

export function orderModuleItems(items: readonly ModuleItem[]): ModuleItem[] {
  return [...items].sort(
    (a, b) => a.position - b.position || a.id.localeCompare(b.id),
  );
}

export function reorderModuleItems(
  items: readonly ModuleItem[],
  orderedIds: readonly ModuleItemId[],
): ModuleItem[] {
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
  return orderedIds.map((id, position) => ({ ...byId.get(id)!, position }));
}

/** Accessible Move-To equivalent for drag/reorder UIs. */
export function moveModuleItem(
  items: readonly ModuleItem[],
  itemId: ModuleItemId,
  targetPosition: number,
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
  assertIsoDate(context.now, "context.now");
  const completed =
    completedIds ?? context.completedItemIds ?? context.completedModuleIds;
  if (prerequisiteIds.some((id) => !completed?.has(id))) return false;
  if (availability.startsAt && context.now < availability.startsAt)
    return false;
  if (availability.endsAt && context.now >= availability.endsAt) return false;
  return true;
}

export function isItemComplete(
  rule: ItemCompletionRule,
  context: CompletionContext,
): boolean {
  switch (rule.type) {
    case "view":
      return Boolean(context.viewed);
    case "submit":
      return Boolean(context.submitted);
    case "manual":
      return Boolean(context.manuallyMarked);
    case "score":
      return (
        typeof context.score === "number" && context.score >= rule.minimumScore
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
    assertRevision(model.course.revision);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : "invalid course");
  }

  for (const module of model.modules) {
    if (moduleIds.has(module.id))
      issues.push(`duplicate module id: ${module.id}`);
    moduleIds.add(module.id);
    modulesById.set(module.id, module);
    if (module.courseId !== model.course.id)
      issues.push(`module ${module.id} belongs to another course`);
    if (!releaseStates.includes(module.state))
      issues.push(`module ${module.id} has an invalid state`);
    if (!Number.isInteger(module.position) || module.position < 0)
      issues.push(`module ${module.id} has an invalid position`);
    try {
      assertAvailability(module.availability);
      assertRevision(module.revision);
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

  for (const item of model.items) {
    if (itemIds.has(item.id))
      issues.push(`duplicate module item id: ${item.id}`);
    itemIds.add(item.id);
    itemsById.set(item.id, item);
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
  const visibleModules = orderModules(model.modules).filter((module) => {
    if (role === "teacher") return module.state !== "archived";
    return isAvailable(
      module.state,
      module.availability,
      context,
      module.prerequisiteModuleIds,
      context.completedModuleIds,
    );
  });
  const modules = visibleModules.map((module) => ({
    id: module.id,
    title: module.title,
    position: module.position,
    state: module.state,
    items: orderModuleItems(
      model.items.filter((item) => item.moduleId === module.id),
    )
      .filter((item) =>
        role === "teacher"
          ? item.state !== "archived"
          : isAvailable(
              item.state,
              item.availability,
              context,
              item.prerequisiteItemIds,
              context.completedItemIds,
            ),
      )
      .map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        position: item.position,
        state: item.state,
        completion: item.completion,
      })),
  }));
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
