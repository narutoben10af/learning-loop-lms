import { describe, expect, it } from "vitest";
import { createCourse } from "./course";
import {
  ANNOUNCEMENTS_STORAGE_KEY,
  addAnnouncementDraft,
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
      creatorMembershipId: "membership-teacher-course",
      now,
    },
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
