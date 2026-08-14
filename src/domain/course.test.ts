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
    const reordered = reorderModuleItems(items, ["three", "one", "two"]);
    const moved = moveModuleItem(items, "one", 2);

    expect(reordered.map((entry) => [entry.id, entry.position])).toEqual([
      ["three", 0],
      ["one", 1],
      ["two", 2],
    ]);
    expect(moved.map((entry) => entry.id)).toEqual(["two", "three", "one"]);
    expect(items.map((entry) => entry.id)).toEqual(["one", "two", "three"]);
    expect(() => reorderModuleItems(items, ["one", "one", "two"])).toThrow(
      /exactly once/,
    );
  });

  it("enforces release transitions and keeps archived content terminal", () => {
    const draft = item("activity", "market-shifts", 0);
    expect(transitionReleaseState(draft, "scheduled").state).toBe("scheduled");
    expect(transitionReleaseState(draft, "published").state).toBe("published");
    expect(() => transitionReleaseState(draft, "closed")).toThrow(
      /cannot transition/,
    );
    const archived = transitionReleaseState(draft, "archived");
    expect(() => transitionReleaseState(archived, "published")).toThrow(
      /cannot transition/,
    );
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
});
