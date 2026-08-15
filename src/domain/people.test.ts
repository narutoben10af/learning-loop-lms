import { describe, expect, it } from "vitest";
import { createCourse } from "./course";
import {
  PEOPLE_STORAGE_KEY,
  addCoursePerson,
  createPeopleSnapshot,
  createPersonProfile,
  loadPeopleSnapshot,
  projectCoursePeople,
  type AddCoursePersonInput,
  type PeopleSnapshot,
} from "./people";
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
  status: WorkspaceMembership["status"] = "active",
): WorkspaceMembership {
  return {
    id,
    organizationId,
    courseId,
    principalId,
    role,
    status,
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
  snapshot = addWorkspaceMembership(
    snapshot,
    owner,
    membership(
      "membership-student-course",
      student.principalId,
      "student",
      course.id,
    ),
    now,
  );
  return snapshot;
}

function buildPeople(): PeopleSnapshot {
  return createPeopleSnapshot(organizationId, owner.principalId, now, [
    createPersonProfile({
      id: teacher.principalId,
      organizationId,
      displayName: "Amina Yusuf",
      status: "active",
      actorId: owner.principalId,
      now,
    }),
    createPersonProfile({
      id: student.principalId,
      organizationId,
      displayName: "Maya Chen",
      preferredName: "Maya",
      status: "active",
      actorId: owner.principalId,
      now,
    }),
  ]);
}

describe("course people domain", () => {
  it("projects a full roster to the teacher and only self to the student", () => {
    const workspace = buildWorkspace();
    const people = buildPeople();

    const teacherView = projectCoursePeople(
      people,
      workspace,
      teacher,
      "econ-10a",
    );
    expect(teacherView.people.map((person) => person.displayName)).toEqual([
      "Amina Yusuf",
      "Maya Chen",
    ]);
    expect(teacherView.capabilities).toEqual({
      canAddPeople: true,
      canViewFullRoster: true,
    });

    const studentView = projectCoursePeople(
      people,
      workspace,
      student,
      "econ-10a",
    );
    expect(studentView.people).toHaveLength(1);
    expect(studentView.people[0]).toMatchObject({
      profileId: student.principalId,
      displayName: "Maya Chen",
      role: "student",
    });
    expect(studentView.capabilities.canViewFullRoster).toBe(false);
    expect(studentView.capabilities.canAddPeople).toBe(false);
  });

  it("lets an assigned teacher add a local pending roster record without an email", () => {
    const result = addCoursePerson(buildPeople(), buildWorkspace(), teacher, {
      profileId: "student-2",
      membershipId: "membership-student-2-course",
      courseId: "econ-10a",
      displayName: "Jordan Lee",
      preferredName: null,
      role: "student",
      now,
    });

    expect(result.people.profiles).toContainEqual(
      expect.objectContaining({
        id: "student-2",
        displayName: "Jordan Lee",
        status: "pending-activation",
      }),
    );
    expect(result.workspace.workspace.memberships).toContainEqual(
      expect.objectContaining({
        principalId: "student-2",
        courseId: "econ-10a",
        role: "student",
        status: "invited",
      }),
    );

    const assistantResult = addCoursePerson(
      buildPeople(),
      buildWorkspace(),
      teacher,
      {
        profileId: "assistant-1",
        membershipId: "membership-assistant-1-course",
        courseId: "econ-10a",
        displayName: "Rina Das",
        role: "teaching-assistant",
        now,
      },
    );
    expect(assistantResult.workspace.workspace.memberships).toContainEqual(
      expect.objectContaining({
        principalId: "assistant-1",
        courseId: "econ-10a",
        role: "teaching-assistant",
        status: "invited",
      }),
    );
  });

  it("does not let a student add or inspect another course member", () => {
    expect(() =>
      addCoursePerson(buildPeople(), buildWorkspace(), student, {
        profileId: "student-2",
        membershipId: "membership-student-2-course",
        courseId: "econ-10a",
        displayName: "Jordan Lee",
        role: "student",
        now,
      }),
    ).toThrow(/not authorised/);
  });

  it("does not treat an unassigned organization teacher as course-roster access", () => {
    const unassignedTeacher: WorkspaceActor = {
      principalId: "teacher-2",
      organizationId,
    };
    const workspace = addWorkspaceMembership(
      buildWorkspace(),
      owner,
      membership(
        "membership-teacher-2-org",
        unassignedTeacher.principalId,
        "teacher",
        null,
      ),
      now,
    );

    expect(() =>
      projectCoursePeople(
        buildPeople(),
        workspace,
        unassignedTeacher,
        "econ-10a",
      ),
    ).toThrow(/not authorised/);
    expect(() =>
      addCoursePerson(buildPeople(), workspace, unassignedTeacher, {
        profileId: "student-2",
        membershipId: "membership-student-2-course",
        courseId: "econ-10a",
        displayName: "Jordan Lee",
        role: "student",
        now,
      }),
    ).toThrow(/not authorised/);

    const elevatedRole = {
      profileId: "teacher-3",
      membershipId: "membership-teacher-3-course",
      courseId: "econ-10a",
      displayName: "Elevated Teacher",
      role: "teacher",
      now,
    } as unknown as AddCoursePersonInput;
    expect(() =>
      addCoursePerson(buildPeople(), workspace, teacher, elevatedRole),
    ).toThrow(/not authorised/);
  });

  it("fails closed when persisted people data has unknown private fields", () => {
    const fallback = buildPeople();
    const malformed = structuredClone(fallback) as unknown as {
      profiles: Array<Record<string, unknown>>;
    };
    malformed.profiles[0].email = "must-not-survive@example.test";
    const storage = {
      getItem: (key: string) =>
        key === PEOPLE_STORAGE_KEY ? JSON.stringify(malformed) : null,
      setItem: () => undefined,
    };

    const loaded = loadPeopleSnapshot(storage, fallback);
    expect(loaded).toEqual(fallback);
    expect(loaded.profiles[0]).not.toHaveProperty("email");
  });
});
