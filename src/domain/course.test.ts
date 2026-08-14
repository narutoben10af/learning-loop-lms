import { describe, expect, it } from "vitest";
import {
  assertValidCourseModel,
  createCourse,
  createModule,
  createModuleItem,
  isAvailable,
  isItemComplete,
  moveModuleItem,
  projectCourse,
  reorderModuleItems,
  reviseModuleItem,
  transitionReleaseState,
  validateCourseModel,
  type CourseModel,
  type ModuleItem,
} from "./course";

const now = "2026-08-15T09:00:00.000Z";

function item(
  id: string,
  moduleId: string,
  position: number,
  state: ModuleItem["state"] = "draft",
): ModuleItem {
  return createModuleItem({
    id,
    courseId: "econ-10a",
    moduleId,
    type: "page",
    title: id,
    position,
    state,
    actorId: "teacher-1",
    now,
  });
}

function model(): CourseModel {
  const course = createCourse({
    id: "econ-10a",
    title: "Economics 10A",
    subject: "Economics",
    actorId: "teacher-1",
    now,
  });
  const module = createModule({
    id: "market-shifts",
    courseId: course.id,
    title: "Market shifts",
    position: 0,
    state: "published",
    actorId: "teacher-1",
    now,
  });
  const activity = item("activity", module.id, 1, "published");
  return {
    course: { ...course, status: "active" },
    modules: [module],
    items: [
      item("notice", module.id, 0, "published"),
      { ...activity, prerequisiteItemIds: ["notice"] },
    ],
  };
}

describe("course/module domain", () => {
  it("creates immutable identities with explicit revision and audit metadata", () => {
    const course = createCourse({
      id: "econ-10a",
      title: "Economics 10A",
      subject: "Economics",
      actorId: "teacher-1",
      now,
    });
    const moduleItem = createModuleItem({
      id: "graph-activity",
      courseId: course.id,
      moduleId: "market-shifts",
      type: "quiz",
      title: "Supply shock activity",
      position: 0,
      actorId: "teacher-1",
      now,
    });

    expect(course).toMatchObject({
      id: "econ-10a",
      revision: 1,
      status: "draft",
    });
    expect(moduleItem).toMatchObject({
      id: "graph-activity",
      revision: 1,
      revisionId: "graph-activity:r1",
    });
    expect(moduleItem.audit).toEqual({
      createdBy: "teacher-1",
      createdAt: now,
      updatedBy: "teacher-1",
      updatedAt: now,
    });
  });

  it("revises content without changing item identity and returns it to draft", () => {
    const original = item("activity", "market-shifts", 0, "published");
    const revised = reviseModuleItem(
      original,
      {
        title: "Supply shock graph activity",
        type: "quiz",
        completion: { type: "submit" },
        availability: { startsAt: null, endsAt: null },
        prerequisiteItemIds: [],
      },
      "teacher-2",
      "2026-08-15T10:00:00.000Z",
    );

    expect(revised.id).toBe(original.id);
    expect(revised.revision).toBe(2);
    expect(revised.revisionId).toBe("activity:r2");
    expect(revised.state).toBe("draft");
    expect(revised.audit.createdBy).toBe("teacher-1");
    expect(revised.audit.updatedBy).toBe("teacher-2");
    expect(original.title).toBe("activity");
  });

  it("supports drag reorder and the accessible Move-To equivalent", () => {
    const items = [
      item("one", "market-shifts", 0),
      item("two", "market-shifts", 1),
      item("three", "market-shifts", 2),
    ];
    const reordered = reorderModuleItems(
      items,
      ["three", "one", "two"],
      "teacher-1",
      now,
    );
    const moved = moveModuleItem(items, "one", 2, "teacher-1", now);

    expect(reordered.map((entry) => [entry.id, entry.position])).toEqual([
      ["three", 0],
      ["one", 1],
      ["two", 2],
    ]);
    expect(moved.map((entry) => entry.id)).toEqual(["two", "three", "one"]);
    expect(reordered.every((entry) => entry.revision === 2)).toBe(true);
    expect(reordered[0].audit.updatedBy).toBe("teacher-1");
    reordered[0].availability.startsAt = "2026-08-20T10:00:00.000Z";
    reordered[0].prerequisiteItemIds.push("later");
    expect(items[2].availability.startsAt).toBeNull();
    expect(items[2].prerequisiteItemIds).toEqual([]);
    expect(items.map((entry) => entry.id)).toEqual(["one", "two", "three"]);
    expect(() =>
      reorderModuleItems(items, ["one", "one", "two"], "teacher-1", now),
    ).toThrow(/exactly once/);
  });

  it("enforces release transitions and keeps archived content terminal", () => {
    const draft = item("activity", "market-shifts", 0);
    expect(
      transitionReleaseState(draft, "scheduled", "teacher-1", now).state,
    ).toBe("scheduled");
    expect(
      transitionReleaseState(draft, "published", "teacher-1", now),
    ).toMatchObject({ state: "published", revision: 2 });
    expect(() =>
      transitionReleaseState(draft, "closed", "teacher-1", now),
    ).toThrow(/cannot transition/);
    const archived = transitionReleaseState(
      draft,
      "archived",
      "teacher-1",
      now,
    );
    expect(() =>
      transitionReleaseState(archived, "published", "teacher-1", now),
    ).toThrow(/cannot transition/);
  });

  it("gates release by schedule and completion by the declared rule", () => {
    const availability = {
      startsAt: "2026-08-15T10:00:00.000Z",
      endsAt: "2026-08-20T10:00:00.000Z",
    };
    expect(isAvailable("published", availability, { now })).toBe(false);
    expect(
      isAvailable("published", availability, {
        now: "2026-08-16T10:00:00.000Z",
      }),
    ).toBe(true);
    expect(
      isAvailable(
        "published",
        {
          startsAt: "2026-08-15T10:00:00+09:00",
          endsAt: "2026-08-15T11:00:00+09:00",
        },
        { now: "2026-08-15T01:30:00.000Z" },
      ),
    ).toBe(true);
    expect(
      isAvailable("hidden", availability, { now: "2026-08-16T10:00:00.000Z" }),
    ).toBe(false);
    expect(
      isAvailable(
        "published",
        { startsAt: null, endsAt: null },
        { now, completedItemIds: new Set(["notice"]) },
        ["notice"],
      ),
    ).toBe(true);
    expect(
      isAvailable("published", { startsAt: null, endsAt: null }, { now }, [
        "notice",
      ]),
    ).toBe(false);
    expect(isItemComplete({ type: "view" }, { viewed: true })).toBe(true);
    expect(isItemComplete({ type: "submit" }, { viewed: true })).toBe(false);
    expect(
      isItemComplete({ type: "score", minimumScore: 70 }, { score: 69 }),
    ).toBe(false);
    expect(
      isItemComplete({ type: "score", minimumScore: 70 }, { score: 70 }),
    ).toBe(true);
    expect(
      isItemComplete({ type: "score", minimumScore: 70 }, { score: Infinity }),
    ).toBe(false);
  });

  it("projects separate teacher and student views from the same model", () => {
    const source = model();
    const teacher = projectCourse(source, "teacher", { now });
    const student = projectCourse(source, "student", { now });

    expect(teacher.modules[0].items.map((entry) => entry.id)).toEqual([
      "notice",
      "activity",
    ]);
    expect(student.modules[0].items.map((entry) => entry.id)).toEqual([
      "notice",
    ]);
    expect(
      projectCourse(source, "student", {
        now,
        completedItemIds: new Set(["notice"]),
      }).modules[0].items.map((entry) => entry.id),
    ).toEqual(["notice", "activity"]);
    expect(teacher.capabilities).toEqual({
      canEdit: true,
      canPublish: true,
      canViewEvidence: true,
    });
    expect(student.capabilities).toEqual({
      canEdit: false,
      canPublish: false,
      canViewEvidence: false,
    });
    Object.assign(teacher.modules[0].items[0].completion, {
      type: "score",
      minimumScore: 90,
    });
    expect(source.items[0].completion).toEqual({ type: "view" });
    expect(
      projectCourse(
        { ...source, course: { ...source.course, status: "draft" } },
        "student",
        { now },
      ).modules,
    ).toEqual([]);
    expect(
      projectCourse(
        { ...source, course: { ...source.course, status: "archived" } },
        "student",
        { now },
      ).modules,
    ).toEqual([]);
  });

  it("fails closed for cross-course links, unknown prerequisites, and duplicate positions", () => {
    const source = model();
    const invalid: CourseModel = {
      ...source,
      modules: [
        { ...source.modules[0], prerequisiteModuleIds: ["missing-module"] },
        { ...source.modules[0], id: "second", position: 1 },
      ],
      items: [
        { ...source.items[0], courseId: "other-course", position: 0 },
        { ...source.items[1], moduleId: "second", position: 0 },
        {
          ...source.items[1],
          id: "duplicate-position",
          moduleId: "second",
          position: 0,
        },
      ],
    };
    const issues = validateCourseModel(invalid);
    expect(issues).toEqual(
      expect.arrayContaining([
        "module market-shifts requires an unknown module",
        "item notice belongs to another course",
        "module second contains non-contiguous item positions",
      ]),
    );
    expect(() => assertValidCourseModel(invalid)).toThrow(/unknown module/);
  });

  it("rejects module and item prerequisite cycles and invalid thresholds", () => {
    const source = model();
    const invalid: CourseModel = {
      ...source,
      modules: [
        {
          ...source.modules[0],
          prerequisiteModuleIds: ["second"],
          completion: { type: "percentage", minimumPercent: Number.NaN },
        },
        {
          ...source.modules[0],
          id: "second",
          position: 1,
          prerequisiteModuleIds: ["market-shifts"],
        },
      ],
      items: [
        {
          ...source.items[0],
          prerequisiteItemIds: ["activity"],
          completion: { type: "score", minimumScore: Number.POSITIVE_INFINITY },
        },
        { ...source.items[1], prerequisiteItemIds: ["notice"] },
      ],
    };
    const issues = validateCourseModel(invalid);
    expect(issues).toEqual(
      expect.arrayContaining([
        "course module prerequisites contain a cycle",
        "module item prerequisites contain a cycle",
      ]),
    );
    expect(issues.some((issue) => issue.includes("minimumPercent"))).toBe(true);
    expect(issues.some((issue) => issue.includes("minimumScore"))).toBe(true);
  });

  it("clones nested input values so later caller mutation cannot bypass revision", () => {
    const availability: { startsAt: string | null; endsAt: string | null } = {
      startsAt: null,
      endsAt: null,
    };
    const completion = { type: "score" as const, minimumScore: 70 };
    const created = createModuleItem({
      id: "immutable-input",
      courseId: "econ-10a",
      moduleId: "market-shifts",
      type: "assignment",
      title: "Calculation",
      position: 0,
      availability,
      completion,
      actorId: "teacher-1",
      now,
    });
    availability.endsAt = "2026-08-20T10:00:00.000Z";
    completion.minimumScore = 0;
    expect(created.availability.endsAt).toBeNull();
    expect(created.completion).toEqual({ type: "score", minimumScore: 70 });
  });

  it("rejects blank identities and invalid audit chronology", () => {
    const source = model();
    const invalid: CourseModel = {
      ...source,
      modules: [
        {
          ...source.modules[0],
          title: "",
          audit: {
            ...source.modules[0].audit,
            updatedAt: "not-a-date",
          },
        },
      ],
      items: [
        {
          ...source.items[0],
          id: "",
          title: "",
          audit: {
            ...source.items[0].audit,
            updatedAt: "2026-08-14T09:00:00.000Z",
          },
        },
      ],
      course: {
        ...source.course,
        audit: {
          ...source.course.audit,
          createdAt: "2026-08-16T09:00:00.000Z",
          updatedAt: "2026-08-15T09:00:00.000Z",
        },
      },
    };
    const issues = validateCourseModel(invalid);
    expect(issues).toEqual(
      expect.arrayContaining([
        "module market-shifts.title must not be empty",
        "item .title must not be empty",
        "course.audit.updatedAt must not be before createdAt",
      ]),
    );
    expect(
      issues.some((issue) => issue.includes("module market-shifts.audit")),
    ).toBe(true);
  });
});
