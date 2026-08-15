import { describe, expect, it } from "vitest";
import { createCourse, type CourseModel } from "./course";
import {
  WORKSPACE_SCHEMA_VERSION,
  WORKSPACE_STORAGE_KEY,
  addWorkspaceMembership,
  assertValidWorkspaceSnapshot,
  createCourseInWorkspace,
  createWorkspace,
  createWorkspaceSnapshot,
  loadWorkspaceSnapshot,
  migrateLegacyCourseModel,
  projectWorkspace,
  saveWorkspaceSnapshot,
  selectWorkspaceCourse,
  transitionWorkspaceCourse,
  validateWorkspaceSnapshot,
  type StorageLike,
  type WorkspaceActor,
  type WorkspaceMembership,
  type WorkspaceSnapshot,
} from "./workspace";

const now = "2026-08-15T09:00:00.000Z";
const later = "2026-08-15T10:00:00.000Z";
const organizationId = "icons-school-demo";
const teacher: WorkspaceActor = {
  principalId: "teacher-1",
  organizationId,
};

function courseModel(
  id: string,
  title: string,
  subject = "Economics",
): CourseModel {
  return {
    course: createCourse({
      id,
      title,
      subject,
      actorId: teacher.principalId,
      now,
    }),
    modules: [],
    items: [],
  };
}

function emptySnapshot(): WorkspaceSnapshot {
  return createWorkspaceSnapshot(
    createWorkspace({
      organizationId,
      organizationName: "Learning Loop Demo School",
      actorId: teacher.principalId,
      actorRole: "teacher",
      actorMembershipId: "membership-org-teacher-1",
      now,
    }),
  );
}

function withCourse(id = "econ-10a", code = "ECON-10A"): WorkspaceSnapshot {
  return createCourseInWorkspace(
    emptySnapshot(),
    teacher,
    courseModel(id, "Economics 10A"),
    {
      code,
      term: "Term 1 · 2026",
      section: "10A",
      creatorMembershipId: `membership-${id}-teacher-1`,
      now,
    },
  );
}

function membership(
  id: string,
  principalId: string,
  role: WorkspaceMembership["role"],
  courseId: string | null,
): WorkspaceMembership {
  return {
    id,
    organizationId,
    courseId,
    principalId,
    role,
    status: "active",
    revision: 99,
    audit: {
      createdBy: "caller-owned",
      createdAt: "2099-01-01T00:00:00.000Z",
      updatedBy: "caller-owned",
      updatedAt: "2099-01-01T00:00:00.000Z",
    },
  };
}

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("workspace and course catalogue domain", () => {
  it("creates a draft course without mutating caller-owned state", () => {
    const before = emptySnapshot();
    const model = courseModel("econ-10a", "Economics 10A");
    const created = createCourseInWorkspace(before, teacher, model, {
      code: "ECON-10A",
      term: "Term 1 · 2026",
      section: "10A",
      creatorMembershipId: "membership-econ-10a-teacher-1",
      now,
    });

    expect(before.workspace.courses).toEqual([]);
    expect(before.courseModels).toEqual([]);
    expect(created.workspace.courses[0]).toMatchObject({
      id: "econ-10a",
      lifecycle: "draft",
      visibility: "private",
      revision: 1,
    });
    expect(created.workspace.memberships.at(-1)).toMatchObject({
      courseId: "econ-10a",
      principalId: teacher.principalId,
      role: "teacher",
    });
    created.courseModels[0].course.title = "Caller mutation";
    expect(model.course.title).toBe("Economics 10A");
  });

  it("keeps course IDs and codes unique and requires organization create authority", () => {
    const first = withCourse();
    expect(() =>
      createCourseInWorkspace(
        first,
        teacher,
        courseModel("econ-copy", "Economics copy"),
        {
          code: "econ-10a",
          term: "Term 1 · 2026",
          section: "10B",
          creatorMembershipId: "membership-copy",
          now: later,
        },
      ),
    ).toThrow(/code.*already exists/i);

    expect(() =>
      createCourseInWorkspace(
        first,
        { principalId: "unrelated", organizationId },
        courseModel("history-9", "History 9", "History"),
        {
          code: "HIST-9",
          term: "Term 1 · 2026",
          section: "9",
          creatorMembershipId: "membership-history",
          now: later,
        },
      ),
    ).toThrow(/not authorised/i);
  });

  it("separates teacher, student, assistant, guardian, and administrator projections", () => {
    let snapshot = withCourse();
    const adminInput = membership(
      "membership-admin",
      "admin-1",
      "organization-administrator",
      null,
    );
    // Seed the administrator relationship to exercise the independently
    // authorised membership command without bypassing its own permission gate.
    snapshot.workspace.memberships.push({
      ...adminInput,
      revision: 1,
      audit: structuredClone(snapshot.workspace.audit),
    });
    assertValidWorkspaceSnapshot(snapshot);

    expect(() =>
      addWorkspaceMembership(
        snapshot,
        { principalId: "admin-1", organizationId },
        membership(
          "membership-escalation",
          "other-admin",
          "platform-owner",
          null,
        ),
        later,
      ),
    ).toThrow(/only a platform owner/i);

    for (const [id, principal, role] of [
      ["membership-student", "student-1", "student"],
      ["membership-assistant", "assistant-1", "teaching-assistant"],
      ["membership-guardian", "guardian-1", "parent-guardian"],
    ] as const) {
      snapshot = addWorkspaceMembership(
        snapshot,
        { principalId: "admin-1", organizationId },
        membership(id, principal, role, "econ-10a"),
        later,
      );
    }

    expect(projectWorkspace(snapshot.workspace, teacher).courses).toHaveLength(
      1,
    );
    expect(
      projectWorkspace(snapshot.workspace, {
        principalId: "student-1",
        organizationId,
      }).courses,
    ).toEqual([]);

    snapshot = transitionWorkspaceCourse(
      snapshot,
      teacher,
      "econ-10a",
      "active",
      later,
    );
    snapshot.workspace.courses[0].visibility = "enrolled-members";
    snapshot.courseModels[0].course.status = "active";
    assertValidWorkspaceSnapshot(snapshot);

    const studentProjection = projectWorkspace(snapshot.workspace, {
      principalId: "student-1",
      organizationId,
    });
    expect(studentProjection.courses[0]).toMatchObject({
      id: "econ-10a",
      role: "student",
      capabilities: {
        canManageCourse: false,
        canViewTeachingSignals: false,
      },
    });
    expect(
      projectWorkspace(snapshot.workspace, {
        principalId: "assistant-1",
        organizationId,
      }).courses[0].capabilities,
    ).toEqual({ canManageCourse: false, canViewTeachingSignals: true });
    expect(
      projectWorkspace(snapshot.workspace, {
        principalId: "guardian-1",
        organizationId,
      }).courses[0].role,
    ).toBe("parent-guardian");
    expect(
      projectWorkspace(snapshot.workspace, {
        principalId: "admin-1",
        organizationId,
      }).capabilities,
    ).toEqual({ canCreateCourse: true, canViewOrganizationSignals: true });
    expect(() =>
      projectWorkspace(snapshot.workspace, {
        principalId: "student-1",
        organizationId: "different-organization",
      }),
    ).toThrow(/not authorised/i);
  });

  it("does not let an organization-scoped teacher infer access to unassigned courses", () => {
    const snapshot = withCourse();
    const other = courseModel("history-9", "History 9", "History");
    snapshot.workspace.courses.push({
      id: other.course.id,
      code: "HIST-9",
      title: other.course.title,
      subject: other.course.subject,
      term: "Term 1 · 2026",
      section: "9",
      lifecycle: "draft",
      visibility: "private",
      revision: 1,
      audit: structuredClone(snapshot.workspace.audit),
    });
    snapshot.courseModels.push(other);
    assertValidWorkspaceSnapshot(snapshot);

    expect(
      projectWorkspace(snapshot.workspace, teacher).courses.map(
        (course) => course.id,
      ),
    ).toEqual(["econ-10a"]);
  });

  it("validates selection and synchronizes lifecycle transitions", () => {
    let snapshot = withCourse();
    expect(
      selectWorkspaceCourse(snapshot.workspace, teacher, "econ-10a"),
    ).toEqual({
      principalId: teacher.principalId,
      courseId: "econ-10a",
    });
    expect(() =>
      selectWorkspaceCourse(
        snapshot.workspace,
        { principalId: "student-1", organizationId },
        "econ-10a",
      ),
    ).toThrow(/not authorised|not available/i);

    snapshot = transitionWorkspaceCourse(
      snapshot,
      teacher,
      "econ-10a",
      "active",
      later,
    );
    expect(snapshot.workspace.courses[0]).toMatchObject({
      lifecycle: "active",
      revision: 2,
    });
    expect(snapshot.courseModels[0].course).toMatchObject({
      status: "active",
      revision: 2,
    });
    const archived = transitionWorkspaceCourse(
      snapshot,
      teacher,
      "econ-10a",
      "archived",
      "2026-08-15T11:00:00.000Z",
    );
    expect(projectWorkspace(archived.workspace, teacher).courses).toEqual([]);
    expect(() =>
      transitionWorkspaceCourse(
        archived,
        teacher,
        "econ-10a",
        "active",
        "2026-08-15T12:00:00.000Z",
      ),
    ).toThrow(/cannot transition/i);
  });

  it("fails closed for malformed, aliased, and cross-boundary snapshot data", () => {
    const snapshot = withCourse();
    const malformed = structuredClone(snapshot) as unknown as Record<
      string,
      unknown
    >;
    malformed.schemaVersion = 99;
    malformed.secret = "must not pass";
    (malformed.workspace as WorkspaceSnapshot["workspace"]).courses[0].title =
      "Mismatch";
    (malformed.courseModels as CourseModel[]).push(
      courseModel("orphan", "Orphan course"),
    );
    expect(validateWorkspaceSnapshot(malformed).join(";")).toMatch(
      /schemaVersion|unsupported fields|does not match|no catalogue record/,
    );
    expect(
      validateWorkspaceSnapshot({
        schemaVersion: 1,
        workspace: null,
        courseModels: [null],
      }),
    ).not.toEqual([]);
  });

  it("persists exact validated data and falls back on malformed or stale JSON", () => {
    const storage = new MemoryStorage();
    const fallback = withCourse();
    saveWorkspaceSnapshot(storage, fallback);
    const loaded = loadWorkspaceSnapshot(storage, {
      fallback: emptySnapshot(),
    });
    expect(loaded).toEqual(fallback);
    loaded.workspace.organization.name = "Caller mutation";
    expect(fallback.workspace.organization.name).toBe(
      "Learning Loop Demo School",
    );

    storage.setItem(
      WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        ...fallback,
        schemaVersion: WORKSPACE_SCHEMA_VERSION + 1,
      }),
    );
    expect(
      loadWorkspaceSnapshot(storage, { fallback: emptySnapshot() }),
    ).toEqual(emptySnapshot());
    storage.setItem(WORKSPACE_STORAGE_KEY, "{valid-json-shape:false}");
    expect(
      loadWorkspaceSnapshot(storage, { fallback: emptySnapshot() }),
    ).toEqual(emptySnapshot());
  });

  it("migrates the existing single-course local record without changing its source", () => {
    const legacy = courseModel("econ-10a", "Economics 10A");
    legacy.course.status = "active";
    const source = structuredClone(legacy);
    const migrated = migrateLegacyCourseModel(legacy, {
      organizationId,
      organizationName: "Learning Loop Demo School",
      actorId: teacher.principalId,
      actorMembershipId: "membership-org-teacher-1",
      courseMembershipId: "membership-econ-10a-teacher-1",
      code: "ECON-10A",
      term: "Term 1 · 2026",
      section: "10A",
      visibility: "enrolled-members",
      now,
    });
    expect(migrated.workspace.courses[0]).toMatchObject({
      id: "econ-10a",
      lifecycle: "active",
    });
    expect(migrated.courseModels[0].course.status).toBe("active");
    expect(legacy).toEqual(source);

    const storage = new MemoryStorage();
    storage.setItem("legacy-course", JSON.stringify(legacy));
    expect(
      loadWorkspaceSnapshot(storage, {
        fallback: emptySnapshot(),
        legacyCourseKey: "legacy-course",
        legacyMigration: {
          organizationId,
          organizationName: "Learning Loop Demo School",
          actorId: teacher.principalId,
          actorMembershipId: "membership-org-teacher-1",
          courseMembershipId: "membership-econ-10a-teacher-1",
          code: "ECON-10A",
          term: "Term 1 · 2026",
          section: "10A",
          now,
        },
      }).workspace.courses[0].id,
    ).toBe("econ-10a");
  });
});
