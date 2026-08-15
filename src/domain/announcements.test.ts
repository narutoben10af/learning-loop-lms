import { describe, expect, it } from "vitest";
import { createCourse } from "./course";
import {
  ANNOUNCEMENTS_STORAGE_KEY,
  addAnnouncementDraft,
  archiveAnnouncement,
  createAnnouncementRecord,
  createAnnouncementSnapshot,
  loadAnnouncementSnapshot,
  projectCourseAnnouncements,
  releaseAnnouncement,
  reviseAnnouncement,
} from "./announcements";
import {
  addWorkspaceMembership,
  createCourseInWorkspace,
  createWorkspace,
  createWorkspaceSnapshot,
  transitionWorkspaceCourse,
  type WorkspaceActor,
  type WorkspaceMembership,
  type WorkspaceSnapshot,
} from "./workspace";

const now = "2026-08-15T09:00:00.000Z";
const organizationId = "school-1";
const owner: WorkspaceActor = {
  principalId: "owner-1",
  organizationId,
};
const teacher: WorkspaceActor = {
  principalId: "teacher-1",
  organizationId,
};
const student: WorkspaceActor = {
  principalId: "student-1",
  organizationId,
};
const guardian: WorkspaceActor = {
  principalId: "guardian-1",
  organizationId,
};
const administrator: WorkspaceActor = {
  principalId: "administrator-1",
  organizationId,
};

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
    revision: 1,
    audit: {
      createdBy: owner.principalId,
      createdAt: now,
      updatedBy: owner.principalId,
      updatedAt: now,
    },
  };
}

function buildWorkspace(): WorkspaceSnapshot {
  let snapshot = createWorkspaceSnapshot(
    createWorkspace({
      organizationId,
      organizationName: "Demo School",
      actorId: owner.principalId,
      actorRole: "platform-owner",
      actorMembershipId: "membership-owner",
      now,
    }),
  );
  snapshot = addWorkspaceMembership(
    snapshot,
    owner,
    membership("membership-teacher-org", teacher.principalId, "teacher", null),
    now,
  );
  const course = createCourse({
    id: "econ-10a",
    title: "Economics 10A",
    subject: "Economics",
    actorId: teacher.principalId,
    now,
  });
  snapshot = createCourseInWorkspace(
    snapshot,
    teacher,
    { course, modules: [], items: [] },
    {
      code: "ECON-10A",
      term: "Term 1",
      section: "10A",
      visibility: "enrolled-members",
      creatorMembershipId: "membership-teacher-course",
      now,
    },
  );
  snapshot = transitionWorkspaceCourse(
    snapshot,
    teacher,
    "econ-10a",
    "active",
    now,
  );
  return addWorkspaceMembership(
    snapshot,
    owner,
    membership(
      "membership-student-course",
      student.principalId,
      "student",
      "econ-10a",
    ),
    now,
  );
}

function withCourseState(
  snapshot: WorkspaceSnapshot,
  lifecycle: "draft" | "active" | "archived",
  visibility: "private" | "enrolled-members",
): WorkspaceSnapshot {
  const next = structuredClone(snapshot);
  const catalogueCourse = next.workspace.courses.find(
    (course) => course.id === "econ-10a",
  );
  const model = next.courseModels.find(
    (candidate) => candidate.course.id === "econ-10a",
  );
  if (!catalogueCourse || !model) throw new Error("Fixture course missing");
  catalogueCourse.lifecycle = lifecycle;
  catalogueCourse.visibility = visibility;
  model.course.status = lifecycle;
  return next;
}

describe("course announcements domain", () => {
  it("keeps drafts private and projects a released notice to the student", () => {
    const workspace = buildWorkspace();
    let announcements = createAnnouncementSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    announcements = addAnnouncementDraft(announcements, workspace, teacher, {
      id: "notice-1",
      courseId: "econ-10a",
      title: "Bring a calculator",
      body: "We will compare two market equilibria tomorrow.",
      audience: "students-only",
      now,
    });
    expect(
      projectCourseAnnouncements(
        announcements,
        workspace,
        student,
        "econ-10a",
        now,
      ).announcements,
    ).toEqual([]);

    announcements = releaseAnnouncement(announcements, workspace, teacher, {
      id: "notice-1",
      state: "published",
      now,
    });
    expect(
      projectCourseAnnouncements(
        announcements,
        workspace,
        student,
        "econ-10a",
        now,
      ).announcements,
    ).toEqual([
      expect.objectContaining({
        id: "notice-1",
        title: "Bring a calculator",
        state: "released",
      }),
    ]);
  });

  it("releases scheduled notices only after their instant and hides staff-only notices", () => {
    const workspace = buildWorkspace();
    const releaseAt = "2026-08-16T09:00:00.000Z";
    const scheduled = createAnnouncementRecord({
      id: "scheduled-1",
      organizationId,
      courseId: "econ-10a",
      title: "Policy debate groups",
      body: "Your group prompt is ready.",
      audience: "all-course-members",
      state: "scheduled",
      releaseAt,
      actorId: teacher.principalId,
      now,
    });
    const staffOnly = createAnnouncementRecord({
      id: "staff-1",
      organizationId,
      courseId: "econ-10a",
      title: "Moderation note",
      body: "Check the synthetic evidence before class.",
      audience: "staff-only",
      state: "published",
      releaseAt: now,
      actorId: teacher.principalId,
      now,
    });
    const snapshot = createAnnouncementSnapshot(
      organizationId,
      owner.principalId,
      now,
      [scheduled, staffOnly],
    );

    expect(
      projectCourseAnnouncements(snapshot, workspace, student, "econ-10a", now)
        .announcements,
    ).toEqual([]);
    const after = projectCourseAnnouncements(
      snapshot,
      workspace,
      student,
      "econ-10a",
      "2026-08-16T10:00:00.000Z",
    );
    expect(after.announcements.map((item) => item.id)).toEqual(["scheduled-1"]);
  });

  it("returns a published revision to draft until a teacher republishes it", () => {
    const workspace = buildWorkspace();
    const published = createAnnouncementRecord({
      id: "notice-1",
      organizationId,
      courseId: "econ-10a",
      title: "Original",
      body: "Original body",
      audience: "students-only",
      state: "published",
      releaseAt: now,
      actorId: teacher.principalId,
      now,
    });
    const snapshot = createAnnouncementSnapshot(
      organizationId,
      owner.principalId,
      now,
      [published],
    );
    const revised = reviseAnnouncement(snapshot, workspace, teacher, {
      id: "notice-1",
      title: "Revised",
      body: "Revised body",
      audience: "students-only",
      now: "2026-08-15T10:00:00.000Z",
    });

    expect(revised.announcements[0]).toMatchObject({
      state: "draft",
      releaseAt: null,
      revision: 2,
    });
    expect(
      projectCourseAnnouncements(
        revised,
        workspace,
        student,
        "econ-10a",
        "2026-08-15T10:00:00.000Z",
      ).announcements,
    ).toEqual([]);
  });

  it("denies an unassigned organization teacher", () => {
    const unassigned: WorkspaceActor = {
      principalId: "teacher-2",
      organizationId,
    };
    const workspace = addWorkspaceMembership(
      buildWorkspace(),
      owner,
      membership("membership-teacher-2-org", "teacher-2", "teacher", null),
      now,
    );
    const snapshot = createAnnouncementSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    expect(() =>
      projectCourseAnnouncements(
        snapshot,
        workspace,
        unassigned,
        "econ-10a",
        now,
      ),
    ).toThrow(/not authorised/);
    expect(() =>
      addAnnouncementDraft(snapshot, workspace, unassigned, {
        id: "notice-2",
        courseId: "econ-10a",
        title: "Not allowed",
        body: "Not allowed",
        audience: "students-only",
        now,
      }),
    ).toThrow(/not authorised/);
  });

  it("rejects every announcement mutation after a course is archived", () => {
    const active = buildWorkspace();
    let announcements = createAnnouncementSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    announcements = addAnnouncementDraft(announcements, active, teacher, {
      id: "notice-1",
      courseId: "econ-10a",
      title: "Existing draft",
      body: "This course is about to close.",
      audience: "all-course-members",
      now,
    });
    const archived = withCourseState(active, "archived", "enrolled-members");

    expect(() =>
      addAnnouncementDraft(announcements, archived, teacher, {
        id: "notice-2",
        courseId: "econ-10a",
        title: "New draft",
        body: "Not permitted",
        audience: "all-course-members",
        now,
      }),
    ).toThrow(/Archived courses/);
    expect(() =>
      reviseAnnouncement(announcements, archived, teacher, {
        id: "notice-1",
        title: "Changed",
        body: "Not permitted",
        audience: "all-course-members",
        now,
      }),
    ).toThrow(/Archived courses/);
    expect(() =>
      releaseAnnouncement(announcements, archived, teacher, {
        id: "notice-1",
        state: "published",
        now,
      }),
    ).toThrow(/Archived courses/);
    expect(() =>
      archiveAnnouncement(announcements, archived, teacher, "notice-1", now),
    ).toThrow(/Archived courses/);
  });

  it("fails closed for a learner when the course is draft, private, or archived", () => {
    const published = createAnnouncementRecord({
      id: "notice-1",
      organizationId,
      courseId: "econ-10a",
      title: "Private until the course opens",
      body: "This must not cross a closed course boundary.",
      audience: "all-course-members",
      state: "published",
      releaseAt: now,
      actorId: teacher.principalId,
      now,
    });
    const announcements = createAnnouncementSnapshot(
      organizationId,
      owner.principalId,
      now,
      [published],
    );
    const active = buildWorkspace();
    for (const workspace of [
      withCourseState(active, "draft", "enrolled-members"),
      withCourseState(active, "active", "private"),
      withCourseState(active, "archived", "enrolled-members"),
    ]) {
      expect(() =>
        projectCourseAnnouncements(
          announcements,
          workspace,
          student,
          "econ-10a",
          now,
        ),
      ).toThrow(/not authorised/);
    }
  });

  it("applies exact audience rules for students, guardians, and staff", () => {
    let workspace = addWorkspaceMembership(
      buildWorkspace(),
      owner,
      membership(
        "membership-guardian-course",
        guardian.principalId,
        "parent-guardian",
        "econ-10a",
      ),
      now,
    );
    const assistant: WorkspaceActor = {
      principalId: "assistant-1",
      organizationId,
    };
    workspace = addWorkspaceMembership(
      workspace,
      teacher,
      membership(
        "membership-assistant-course",
        assistant.principalId,
        "teaching-assistant",
        "econ-10a",
      ),
      now,
    );
    workspace = addWorkspaceMembership(
      workspace,
      owner,
      membership(
        "membership-administrator-org",
        administrator.principalId,
        "organization-administrator",
        null,
      ),
      now,
    );
    const announcements = createAnnouncementSnapshot(
      organizationId,
      owner.principalId,
      now,
      [
        ["all", "all-course-members"],
        ["students", "students-only"],
        ["staff", "staff-only"],
      ].map(([id, audience]) =>
        createAnnouncementRecord({
          id,
          organizationId,
          courseId: "econ-10a",
          title: id,
          body: `${id} message`,
          audience: audience as
            | "all-course-members"
            | "students-only"
            | "staff-only",
          state: "published",
          releaseAt: now,
          actorId: teacher.principalId,
          now,
        }),
      ),
    );

    expect(
      projectCourseAnnouncements(
        announcements,
        workspace,
        student,
        "econ-10a",
        now,
      ).announcements.map((item) => item.id),
    ).toEqual(["all", "students"]);
    expect(
      projectCourseAnnouncements(
        announcements,
        workspace,
        guardian,
        "econ-10a",
        now,
      ).announcements.map((item) => item.id),
    ).toEqual(["all"]);
    for (const actor of [assistant, teacher, administrator, owner]) {
      expect(
        projectCourseAnnouncements(
          announcements,
          workspace,
          actor,
          "econ-10a",
          now,
        ).announcements.map((item) => item.id),
      ).toEqual(["all", "staff", "students"]);
    }
  });

  it("falls back from unknown persisted fields", () => {
    const fallback = createAnnouncementSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    const malformed = {
      ...fallback,
      announcements: [
        {
          ...createAnnouncementRecord({
            id: "notice-1",
            organizationId,
            courseId: "econ-10a",
            title: "Safe title",
            body: "Safe body",
            audience: "students-only",
            actorId: teacher.principalId,
            now,
          }),
          hiddenRecipients: ["student-secret"],
        },
      ],
    };
    const storage = {
      getItem: (key: string) =>
        key === ANNOUNCEMENTS_STORAGE_KEY ? JSON.stringify(malformed) : null,
      setItem: () => undefined,
    };

    expect(loadAnnouncementSnapshot(storage, fallback)).toEqual(fallback);
  });
});
