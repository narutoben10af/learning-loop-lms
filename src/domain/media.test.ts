import { describe, expect, it } from "vitest";
import { createCourse } from "./course";
import {
  MEDIA_STORAGE_KEY,
  addMediaDraft,
  createMediaSnapshot,
  loadMediaSnapshot,
  normalizeHttpsUrl,
  normalizeYouTubeSource,
  projectCourseMedia,
  publishMedia,
} from "./media";
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
const owner: WorkspaceActor = { principalId: "owner-1", organizationId };
const teacher: WorkspaceActor = { principalId: "teacher-1", organizationId };
const student: WorkspaceActor = { principalId: "student-1", organizationId };

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
      "membership-student",
      student.principalId,
      "student",
      "econ-10a",
    ),
    now,
  );
}

describe("course media domain", () => {
  it("projects an external resource only after deliberate publication", () => {
    const workspace = buildWorkspace();
    let media = createMediaSnapshot(organizationId, owner.principalId, now);
    media = addMediaDraft(media, workspace, teacher, {
      id: "resource-1",
      courseId: "econ-10a",
      title: "Elasticity reference",
      description: "Original demo reading link.",
      source: { kind: "link", url: "https://example.edu/elasticity" },
      now,
    });
    expect(
      projectCourseMedia(media, workspace, student, "econ-10a").assets,
    ).toEqual([]);

    media = publishMedia(media, workspace, teacher, "resource-1", now);
    expect(
      projectCourseMedia(media, workspace, student, "econ-10a").assets,
    ).toEqual([
      expect.objectContaining({
        id: "resource-1",
        state: "published",
        storageStatus: "external",
      }),
    ]);
  });

  it("keeps device-local file metadata private and never publishes it", () => {
    const workspace = buildWorkspace();
    let media = createMediaSnapshot(organizationId, owner.principalId, now);
    media = addMediaDraft(media, workspace, teacher, {
      id: "file-1",
      courseId: "econ-10a",
      title: "Original diagram",
      description: "Local image preview.",
      altText: "A synthetic supply curve diagram",
      source: {
        kind: "local-file",
        fileName: "diagram.png",
        mimeType: "image/png",
        sizeBytes: 1234,
        lastModified: 100,
      },
      now,
    });
    expect(() =>
      publishMedia(media, workspace, teacher, "file-1", now),
    ).toThrow(/cannot be published/);
    expect(
      projectCourseMedia(media, workspace, student, "econ-10a").assets,
    ).toEqual([]);
    expect(
      projectCourseMedia(media, workspace, teacher, "econ-10a").assets[0],
    ).toEqual(
      expect.objectContaining({
        storageStatus: "device-local-draft",
        source: {
          kind: "local-file",
          fileName: "diagram.png",
          mimeType: "image/png",
          sizeBytes: 1234,
          lastModified: 100,
        },
      }),
    );
  });

  it("rejects unsafe URLs and normalizes supported YouTube links", () => {
    expect(() => normalizeHttpsUrl("javascript:alert(1)")).toThrow(/HTTPS/);
    expect(normalizeYouTubeSource("https://youtu.be/abcdefghijk")).toEqual({
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      videoId: "abcdefghijk",
    });
    expect(() => normalizeYouTubeSource("https://video.example/test")).toThrow(
      /valid YouTube/,
    );
  });

  it("denies an unassigned teacher and a learner in a private course", () => {
    const workspace = buildWorkspace();
    const media = createMediaSnapshot(organizationId, owner.principalId, now);
    expect(() =>
      projectCourseMedia(
        media,
        workspace,
        { principalId: "other-teacher", organizationId },
        "econ-10a",
      ),
    ).toThrow(/not authorised/);
    const privateWorkspace = structuredClone(workspace);
    privateWorkspace.workspace.courses[0].visibility = "private";
    expect(() =>
      projectCourseMedia(media, privateWorkspace, student, "econ-10a"),
    ).toThrow(/not authorised/);
  });

  it("falls back from unknown persisted fields and never retains bytes", () => {
    const fallback = createMediaSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    const storage = {
      getItem: (key: string) =>
        key === MEDIA_STORAGE_KEY
          ? JSON.stringify({
              ...fallback,
              assets: [
                {
                  id: "file-1",
                  organizationId,
                  courseId: "econ-10a",
                  title: "Unsafe",
                  description: "Unsafe",
                  altText: null,
                  source: {
                    kind: "local-file",
                    fileName: "secret.pdf",
                    mimeType: "application/pdf",
                    sizeBytes: 10,
                    lastModified: 100,
                    bytes: "SECRET",
                  },
                  state: "draft",
                  revision: 1,
                  audit: fallback.audit,
                },
              ],
            })
          : null,
      setItem: () => undefined,
    };
    expect(loadMediaSnapshot(storage, fallback)).toEqual(fallback);
  });
});
