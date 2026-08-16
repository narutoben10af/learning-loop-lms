import { describe, expect, it } from "vitest";
import { createCourse } from "./course";
import {
  ASSESSMENT_STORAGE_KEY,
  addBankQuestionToAssessment,
  answerAssessmentItem,
  createAssessmentSnapshot,
  createCourseAssessment,
  loadAssessmentSnapshot,
  projectTeacherAssessments,
  projectStudentAssessments,
  projectStudentAttempt,
  publishAssessment,
  removeAssessmentQuestion,
  reviseAssessmentDraft,
  startAssessmentAttempt,
  submitAssessmentAttempt,
} from "./assessment";
import {
  QUESTION_BANK_STORAGE_KEY,
  createQuestion,
  createQuestionBankSnapshot,
  createQuestionRevision,
  loadQuestionBankSnapshot,
  projectQuestionBank,
  publishQuestion,
  requestQuestionReview,
  reviseQuestionDraft,
  type QuestionBankSnapshot,
  type QuestionContent,
} from "./questionBank";
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

const organizationId = "school-1";
const now = "2026-08-16T09:00:00.000Z";
const later = "2026-08-16T10:00:00.000Z";
const owner: WorkspaceActor = { principalId: "owner-1", organizationId };
const admin: WorkspaceActor = { principalId: "admin-1", organizationId };
const teacher: WorkspaceActor = { principalId: "teacher-1", organizationId };
const otherTeacher: WorkspaceActor = {
  principalId: "teacher-2",
  organizationId,
};
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
      organizationName: "Learning Loop Demo School",
      actorId: owner.principalId,
      actorRole: "platform-owner",
      actorMembershipId: "membership-owner",
      now,
    }),
  );
  snapshot = addWorkspaceMembership(
    snapshot,
    owner,
    membership(
      "membership-admin",
      admin.principalId,
      "organization-administrator",
      null,
    ),
    now,
  );
  snapshot = addWorkspaceMembership(
    snapshot,
    owner,
    membership("membership-teacher-org", teacher.principalId, "teacher", null),
    now,
  );
  snapshot = addWorkspaceMembership(
    snapshot,
    owner,
    membership(
      "membership-other-teacher",
      otherTeacher.principalId,
      "teacher",
      null,
    ),
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

function questionInput(
  id: string,
  content: QuestionContent,
  sharing: "private" | "organization-authors" = "organization-authors",
) {
  return {
    id,
    sharing,
    metadata: {
      subject: "Economics",
      topic: "Markets",
      level: "IGCSE",
      standards: ["Synthetic pilot standard"],
      tags: ["equilibrium", "markets"],
    },
    content,
    feedback: {
      correct: "Correct — the released answer rule matches.",
      incorrect: "Revisit how the market changes before trying again.",
    },
    provenance: {
      kind: "synthetic" as const,
      sourceLabel: "Original Learning Loop pilot content",
      sourceUrl: null,
    },
    now,
  };
}

function publishBankQuestion(
  bank: QuestionBankSnapshot,
  workspace: WorkspaceSnapshot,
  id: string,
  content: QuestionContent,
): QuestionBankSnapshot {
  const authoredAt = bank.audit.updatedAt;
  let next = createQuestion(bank, workspace, teacher, {
    ...questionInput(id, content),
    now: authoredAt,
  });
  next = requestQuestionReview(next, workspace, teacher, id, authoredAt);
  return publishQuestion(next, workspace, admin, id, later);
}

function buildPublishedBank(
  workspace: WorkspaceSnapshot,
): QuestionBankSnapshot {
  let bank = createQuestionBankSnapshot(organizationId, owner.principalId, now);
  bank = publishBankQuestion(bank, workspace, "question-mcq", {
    type: "multiple-choice",
    prompt: "What happens to equilibrium price when supply shifts right?",
    options: [
      { id: "falls", text: "It falls" },
      { id: "rises", text: "It rises" },
      { id: "same", text: "It stays unchanged" },
    ],
    correctOptionId: "falls",
  });
  return publishBankQuestion(bank, workspace, "question-tf", {
    type: "true-false",
    prompt:
      "A rightward supply shift increases equilibrium quantity, ceteris paribus.",
    correctAnswer: true,
  });
}

function buildReleasedObjectiveAssessment(
  workspace: WorkspaceSnapshot,
  bank = buildPublishedBank(workspace),
) {
  let assessments = createAssessmentSnapshot(
    organizationId,
    owner.principalId,
    now,
  );
  assessments = createCourseAssessment(assessments, workspace, teacher, {
    id: "quiz-1",
    courseId: "econ-10a",
    title: "Market adjustment check",
    instructions: "Answer both questions using the released scenario.",
    availability: { opensAt: null, dueAt: null, closesAt: null },
    attemptPolicy: { maxAttempts: 1, resultRelease: "immediate" },
    now,
  });
  for (const [itemId, questionId, points] of [
    ["item-1", "question-mcq", 2],
    ["item-2", "question-tf", 1],
  ] as const) {
    assessments = addBankQuestionToAssessment(
      assessments,
      bank,
      workspace,
      teacher,
      {
        assessmentId: "quiz-1",
        itemId,
        questionId,
        reuseMode: "linked-version",
        points,
        now,
      },
    );
  }
  return publishAssessment(assessments, workspace, teacher, "quiz-1", later);
}

describe("organisation question bank", () => {
  it("requires a different named organization reviewer before publication", () => {
    const workspace = buildWorkspace();
    let bank = createQuestionBankSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    bank = createQuestion(
      bank,
      workspace,
      teacher,
      questionInput("question-1", {
        type: "true-false",
        prompt: "Demand slopes downward in the pilot model.",
        correctAnswer: true,
      }),
    );
    bank = requestQuestionReview(bank, workspace, teacher, "question-1", now);
    expect(() =>
      publishQuestion(bank, workspace, teacher, "question-1", later),
    ).toThrow(/organization reviewer/);
    const published = publishQuestion(
      bank,
      workspace,
      admin,
      "question-1",
      later,
    );
    expect(published.questions[0].publishedVersion).toBe(1);
    expect(published.questions[0].versions[0].review).toEqual(
      expect.objectContaining({
        requestedBy: teacher.principalId,
        reviewedBy: admin.principalId,
      }),
    );
  });

  it("preserves a published version when an owner starts a new draft revision", () => {
    const workspace = buildWorkspace();
    let bank = publishBankQuestion(
      createQuestionBankSnapshot(organizationId, owner.principalId, now),
      workspace,
      "question-1",
      {
        type: "true-false",
        prompt: "The original released statement.",
        correctAnswer: true,
      },
    );
    bank = createQuestionRevision(
      bank,
      workspace,
      teacher,
      "question-1",
      later,
    );
    const revised = questionInput("ignored", {
      type: "true-false",
      prompt: "The revised draft statement.",
      correctAnswer: false,
    });
    bank = reviseQuestionDraft(bank, workspace, teacher, {
      questionId: "question-1",
      sharing: "organization-authors",
      metadata: revised.metadata,
      content: revised.content,
      feedback: revised.feedback,
      provenance: revised.provenance,
      now: later,
    });
    expect(bank.questions[0].publishedVersion).toBe(1);
    expect(bank.questions[0].versions).toHaveLength(2);
    expect(bank.questions[0].versions[0].content).toEqual(
      expect.objectContaining({ prompt: "The original released statement." }),
    );
    expect(bank.questions[0].versions[1].state).toBe("draft");
    expect(
      projectQuestionBank(bank, workspace, otherTeacher).questions[0].current,
    ).toEqual(
      expect.objectContaining({
        version: 1,
        state: "published",
        content: expect.objectContaining({
          prompt: "The original released statement.",
        }),
      }),
    );
    expect(() =>
      reviseQuestionDraft(bank, workspace, teacher, {
        questionId: "question-1",
        sharing: "private",
        metadata: revised.metadata,
        content: revised.content,
        feedback: revised.feedback,
        provenance: revised.provenance,
        now: later,
      }),
    ).toThrow(/separate permission workflow/);
  });

  it("keeps private drafts out of other teachers' discovery and blocks students", () => {
    const workspace = buildWorkspace();
    let bank = createQuestionBankSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    bank = createQuestion(
      bank,
      workspace,
      teacher,
      questionInput(
        "private-question",
        {
          type: "short-answer",
          prompt: "Explain one cause of a supply shift.",
          markingGuidance: "Award for a valid determinant and causal chain.",
        },
        "private",
      ),
    );
    expect(
      projectQuestionBank(bank, workspace, otherTeacher).questions,
    ).toEqual([]);
    expect(
      projectQuestionBank(bank, workspace, teacher).questions,
    ).toHaveLength(1);
    expect(() => projectQuestionBank(bank, workspace, student)).toThrow(
      /authorised authors/,
    );
  });

  it("rejects unsupported content and malformed stored envelopes", () => {
    const workspace = buildWorkspace();
    const fallback = createQuestionBankSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    expect(() =>
      createQuestion(fallback, workspace, teacher, {
        ...questionInput("bad", {
          type: "multiple-choice",
          prompt: "Invalid answer key",
          options: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
          ],
          correctOptionId: "missing",
        }),
      }),
    ).toThrow(/Correct option/);
    const storage = {
      getItem: (key: string) =>
        key === QUESTION_BANK_STORAGE_KEY
          ? JSON.stringify({ ...fallback, secret: "student-data" })
          : null,
      setItem: () => undefined,
    };
    expect(loadQuestionBankSnapshot(storage, fallback)).toEqual(fallback);
  });
});

describe("course assessment and attempt domain", () => {
  it("supports auditable draft editing and teacher-only composition projection", () => {
    const workspace = buildWorkspace();
    const bank = buildPublishedBank(workspace);
    let assessments = createAssessmentSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    assessments = createCourseAssessment(assessments, workspace, teacher, {
      id: "quiz-draft",
      courseId: "econ-10a",
      title: "Initial title",
      instructions: "Initial instructions",
      availability: { opensAt: null, dueAt: null, closesAt: null },
      attemptPolicy: { maxAttempts: 1, resultRelease: "manual" },
      now,
    });
    assessments = reviseAssessmentDraft(assessments, workspace, teacher, {
      assessmentId: "quiz-draft",
      title: "Revised market check",
      instructions: "Use the evidence from the graph.",
      availability: { opensAt: null, dueAt: null, closesAt: null },
      attemptPolicy: { maxAttempts: 2, resultRelease: "immediate" },
      now: later,
    });
    assessments = addBankQuestionToAssessment(
      assessments,
      bank,
      workspace,
      teacher,
      {
        assessmentId: "quiz-draft",
        itemId: "draft-item",
        questionId: "question-mcq",
        reuseMode: "copied-snapshot",
        points: 2,
        now: later,
      },
    );
    const teacherView = projectTeacherAssessments(
      assessments,
      workspace,
      teacher,
      "econ-10a",
    )[0];
    expect(teacherView).toEqual(
      expect.objectContaining({
        state: "draft",
        draft: expect.objectContaining({ title: "Revised market check" }),
        capabilities: expect.objectContaining({
          canEdit: true,
          canPublish: true,
        }),
      }),
    );
    expect(() =>
      projectTeacherAssessments(assessments, workspace, student, "econ-10a"),
    ).toThrow(/authorised/);
    assessments = removeAssessmentQuestion(
      assessments,
      workspace,
      teacher,
      "quiz-draft",
      "draft-item",
      later,
    );
    expect(assessments.assessments[0].draft.items).toEqual([]);
  });

  it("freezes published bank versions and removes answer keys from student projection", () => {
    const workspace = buildWorkspace();
    const bank = buildPublishedBank(workspace);
    let assessments = createAssessmentSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    assessments = createCourseAssessment(assessments, workspace, teacher, {
      id: "quiz-1",
      courseId: "econ-10a",
      title: "Market adjustment check",
      instructions: "Answer both questions using the released scenario.",
      availability: { opensAt: null, dueAt: null, closesAt: null },
      attemptPolicy: { maxAttempts: 1, resultRelease: "immediate" },
      now,
    });
    assessments = addBankQuestionToAssessment(
      assessments,
      bank,
      workspace,
      teacher,
      {
        assessmentId: "quiz-1",
        itemId: "item-1",
        questionId: "question-mcq",
        reuseMode: "linked-version",
        points: 2,
        now,
      },
    );
    assessments = addBankQuestionToAssessment(
      assessments,
      bank,
      workspace,
      teacher,
      {
        assessmentId: "quiz-1",
        itemId: "item-2",
        questionId: "question-tf",
        reuseMode: "copied-snapshot",
        points: 1,
        now,
      },
    );
    assessments = publishAssessment(
      assessments,
      workspace,
      teacher,
      "quiz-1",
      later,
    );
    const projection = projectStudentAssessments(
      assessments,
      workspace,
      student,
      "econ-10a",
      later,
    )[0];
    expect(projection.items).toHaveLength(2);
    expect(JSON.stringify(projection)).not.toContain("correctOptionId");
    expect(JSON.stringify(projection)).not.toContain("correctAnswer");
    expect(assessments.assessments[0].releasedVersions[0].items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceQuestionId: "question-mcq",
          sourceQuestionVersion: 1,
          reuseMode: "linked-version",
        }),
        expect.objectContaining({ reuseMode: "copied-snapshot" }),
      ]),
    );
  });

  it("deterministically grades released MCQ and true-false evidence", () => {
    const workspace = buildWorkspace();
    let assessments = buildReleasedObjectiveAssessment(workspace);
    assessments = startAssessmentAttempt(assessments, workspace, student, {
      id: "attempt-1",
      assessmentId: "quiz-1",
      now: later,
    });
    assessments = answerAssessmentItem(assessments, workspace, student, {
      attemptId: "attempt-1",
      itemId: "item-1",
      response: { kind: "option", optionId: "falls" },
      now: later,
    });
    assessments = answerAssessmentItem(assessments, workspace, student, {
      attemptId: "attempt-1",
      itemId: "item-2",
      response: { kind: "boolean", value: false },
      now: later,
    });
    assessments = submitAssessmentAttempt(
      assessments,
      workspace,
      student,
      "attempt-1",
      later,
    );
    const attempt = assessments.attempts[0];
    expect(attempt.state).toBe("released");
    expect(attempt.studentMembershipId).toBe("membership-student");
    expect(attempt.earnedPoints).toBe(2);
    expect(attempt.results).toEqual([
      expect.objectContaining({
        itemId: "item-1",
        correct: true,
        earnedPoints: 2,
      }),
      expect.objectContaining({
        itemId: "item-2",
        correct: false,
        earnedPoints: 0,
      }),
    ]);
    expect(attempt.gradeEvents[0]).toEqual(
      expect.objectContaining({
        actorId: "system:deterministic-v1",
        actorKind: "system",
      }),
    );
    expect(
      projectStudentAttempt(assessments, workspace, student, "attempt-1"),
    ).toEqual(
      expect.objectContaining({
        state: "released",
        earnedPoints: 2,
        maxPoints: 3,
      }),
    );
    const orphanedEvidence = structuredClone(assessments);
    orphanedEvidence.attempts[0].studentMembershipId = "membership-other";
    expect(() =>
      projectStudentAttempt(orphanedEvidence, workspace, student, "attempt-1"),
    ).toThrow(/membership evidence/);
    expect(() =>
      startAssessmentAttempt(assessments, workspace, student, {
        id: "attempt-2",
        assessmentId: "quiz-1",
        now: later,
      }),
    ).toThrow(/attempt limit/);
  });

  it("routes short answers to human review instead of pseudo-autograding", () => {
    const workspace = buildWorkspace();
    let bank = createQuestionBankSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    bank = publishBankQuestion(bank, workspace, "question-short", {
      type: "short-answer",
      prompt: "Explain why equilibrium quantity changes.",
      markingGuidance: "Look for a valid causal chain using supply and demand.",
    });
    let assessments = createAssessmentSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    assessments = createCourseAssessment(assessments, workspace, teacher, {
      id: "quiz-short",
      courseId: "econ-10a",
      title: "Explain the adjustment",
      instructions: "Write one causal chain.",
      availability: { opensAt: null, dueAt: null, closesAt: null },
      attemptPolicy: { maxAttempts: 1, resultRelease: "manual" },
      now,
    });
    assessments = addBankQuestionToAssessment(
      assessments,
      bank,
      workspace,
      teacher,
      {
        assessmentId: "quiz-short",
        itemId: "item-short",
        questionId: "question-short",
        reuseMode: "linked-version",
        points: 4,
        now,
      },
    );
    assessments = publishAssessment(
      assessments,
      workspace,
      teacher,
      "quiz-short",
      later,
    );
    assessments = startAssessmentAttempt(assessments, workspace, student, {
      id: "attempt-short",
      assessmentId: "quiz-short",
      now: later,
    });
    assessments = answerAssessmentItem(assessments, workspace, student, {
      attemptId: "attempt-short",
      itemId: "item-short",
      response: {
        kind: "text",
        value: "Higher supply lowers price and raises quantity.",
      },
      now: later,
    });
    assessments = submitAssessmentAttempt(
      assessments,
      workspace,
      student,
      "attempt-short",
      later,
    );
    expect(assessments.attempts[0]).toEqual(
      expect.objectContaining({ state: "submitted", earnedPoints: null }),
    );
    expect(assessments.attempts[0].results[0]).toEqual(
      expect.objectContaining({
        correct: null,
        earnedPoints: null,
        gradingMethod: "human-review",
      }),
    );
    expect(
      projectStudentAttempt(assessments, workspace, student, "attempt-short")
        .results,
    ).toBeNull();
  });

  it("enforces release and availability boundaries and fails closed on persistence", () => {
    const workspace = buildWorkspace();
    let assessments = createAssessmentSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    assessments = createCourseAssessment(assessments, workspace, teacher, {
      id: "quiz-future",
      courseId: "econ-10a",
      title: "Future quiz",
      instructions: "Not released yet.",
      availability: {
        opensAt: "2026-08-17T09:00:00+09:00",
        dueAt: "2026-08-18T09:00:00+09:00",
        closesAt: "2026-08-18T10:00:00+09:00",
      },
      attemptPolicy: { maxAttempts: 1, resultRelease: "after-close" },
      now,
    });
    expect(
      projectStudentAssessments(
        assessments,
        workspace,
        student,
        "econ-10a",
        now,
      ),
    ).toEqual([]);

    const fallback = createAssessmentSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    expect(
      loadAssessmentSnapshot(
        {
          getItem: (key: string) =>
            key === ASSESSMENT_STORAGE_KEY
              ? JSON.stringify({ ...fallback, attempts: "malformed" })
              : null,
          setItem: () => undefined,
        },
        fallback,
      ),
    ).toEqual(fallback);
  });

  it("stops in-progress responses after an assessment closes", () => {
    const workspace = buildWorkspace();
    const bank = buildPublishedBank(workspace);
    let assessments = createAssessmentSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    assessments = createCourseAssessment(assessments, workspace, teacher, {
      id: "quiz-window",
      courseId: "econ-10a",
      title: "Timed market check",
      instructions: "Submit during the stated window.",
      availability: {
        opensAt: "2026-08-16T09:00:00.000Z",
        dueAt: "2026-08-16T10:15:00.000Z",
        closesAt: "2026-08-16T10:30:00.000Z",
      },
      attemptPolicy: { maxAttempts: 1, resultRelease: "immediate" },
      now,
    });
    assessments = addBankQuestionToAssessment(
      assessments,
      bank,
      workspace,
      teacher,
      {
        assessmentId: "quiz-window",
        itemId: "window-item",
        questionId: "question-tf",
        reuseMode: "linked-version",
        points: 1,
        now,
      },
    );
    assessments = publishAssessment(
      assessments,
      workspace,
      teacher,
      "quiz-window",
      later,
    );
    assessments = startAssessmentAttempt(assessments, workspace, student, {
      id: "attempt-window",
      assessmentId: "quiz-window",
      now: "2026-08-16T10:15:00.000Z",
    });
    expect(() =>
      answerAssessmentItem(assessments, workspace, student, {
        attemptId: "attempt-window",
        itemId: "window-item",
        response: { kind: "boolean", value: true },
        now: "2026-08-16T10:30:00.000Z",
      }),
    ).toThrow(/no longer open/);
    assessments = answerAssessmentItem(assessments, workspace, student, {
      attemptId: "attempt-window",
      itemId: "window-item",
      response: { kind: "boolean", value: true },
      now: "2026-08-16T10:20:00.000Z",
    });
    expect(() =>
      submitAssessmentAttempt(
        assessments,
        workspace,
        student,
        "attempt-window",
        "2026-08-16T10:30:00.000Z",
      ),
    ).toThrow(/no longer open/);
  });

  it("fails closed for cross-organization actors and unknown nested evidence", () => {
    const workspace = buildWorkspace();
    const assessments = buildReleasedObjectiveAssessment(workspace);
    expect(() =>
      projectStudentAssessments(
        assessments,
        workspace,
        { principalId: student.principalId, organizationId: "school-2" },
        "econ-10a",
        later,
      ),
    ).toThrow(/outside the actor organization/);

    const malformed = structuredClone(assessments) as unknown as {
      assessments: {
        releasedVersions: { items: Record<string, unknown>[] }[];
      }[];
    };
    malformed.assessments[0].releasedVersions[0].items[0].secretAnswer =
      "must-not-persist";
    const fallback = createAssessmentSnapshot(
      organizationId,
      owner.principalId,
      now,
    );
    expect(
      loadAssessmentSnapshot(
        {
          getItem: () => JSON.stringify(malformed),
          setItem: () => undefined,
        },
        fallback,
      ),
    ).toEqual(fallback);

    let inProgress = startAssessmentAttempt(assessments, workspace, student, {
      id: "attempt-malformed",
      assessmentId: "quiz-1",
      now: later,
    });
    inProgress = structuredClone(inProgress);
    inProgress.attempts[0].responses = [
      {
        itemId: "item-1",
        questionId: "question-mcq",
        questionVersion: 1,
        response: { kind: "text", value: "wrong response shape" },
        answeredAt: later,
      },
    ];
    expect(
      loadAssessmentSnapshot(
        {
          getItem: () => JSON.stringify(inProgress),
          setItem: () => undefined,
        },
        fallback,
      ),
    ).toEqual(fallback);
  });
});
