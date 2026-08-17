# Assessment and Organisation Question Bank Contract

Status: implemented local pilot contract plus first visible objective quiz
surface. Teachers can author, review, publish, assemble, and release original
multiple-choice and true/false questions; students can start, resume, submit,
and privately view policy-released deterministic results. This is not a
production assessment service and does not add gradebook, external import, AI
authoring, real student data, or short-answer marking.

## Why this boundary exists

Learning Loop must let a teacher build and run an assessment without Codex,
an AI provider, or a third-party LMS. Questions are reusable organisation
assets, while an assessment is a course-owned release assembled from explicit
question versions. A visual list or copied question text is not sufficient:
identity, authorization, response evidence, grading method, and release state
must remain traceable.

## Organisation question bank

Each question has:

- a stable organisation-scoped ID and named owner;
- `private` or `organization-authors` discovery scope;
- subject, topic, level, standards, and tags;
- original, synthetic, or licensed provenance with an optional validated HTTPS
  source reference;
- immutable numbered content versions and mutable record revisions;
- draft -> in review -> published lifecycle with a different named reviewer;
- exact, allowlisted storage and role-bound author projections.

An organisation-shared question is visible to another authorised teacher only
after publication. If the owner starts a later draft, other teachers continue
to see the current published version rather than the unreleased revision.
Changing the sharing scope of already published content is deliberately outside
the pilot command set because it needs a separate permission and impact review.

The supported content types in this first contract are:

1. multiple choice with one deterministic released answer key;
2. true/false with one deterministic released answer key;
3. short answer with teacher marking guidance and no pseudo-autograding.

Matching, multiple response, fill/cloze, numeric/calculation, ordering, table,
labelling, graph response, essay, media-rich, accounting-layout, pseudocode,
and Python questions remain schema-and-UX work for later focused PRs. The UI
must never present them as live before authoring, validation, response, and
marking behavior exist end to end.

## Course assessment release

A course assessment has its own stable ID, course/organisation scope, owner,
draft, availability window, attempt policy, lifecycle, audit, and immutable
released versions. A draft deliberately adds a published bank version by one of
two modes:

- `linked-version`: retain the bank identity and exact selected version;
- `copied-snapshot`: freeze an independent snapshot with its provenance.

Both modes freeze the complete selected question content in the assessment
release. A future bank revision cannot silently change a released attempt.
Publishing requires an active course, at least one valid question, a deliberate
availability/attempt policy, and a teacher release action. The pilot permits a
single immutable release; amendment/regrade policy is a later explicit workflow,
not an in-place overwrite.

Student projections require an active student course membership and an active,
non-private course. They omit drafts and answer keys, reveal question content
only while the released assessment is open, and bind every attempt to the exact
course membership, assessment version, question IDs/versions, and response
timestamps.

## Grading evidence

Multiple-choice and true/false answers are scored deterministically against the
released key by a versioned system method. The attempt retains item-level
correctness, points, feedback, and an immutable grade event. Short-answer
responses enter `submitted`/human-review state with no inferred correctness or
released result. A later human-marking PR will add rubric decisions, feedback,
safe corrections, and explicit release; it may not rewrite the submitted
response or released assessment evidence.

The later Gradebook consumes profile plus active course-membership identity and
canonical assessment/attempt records. It must not create orphan display-name
rows or duplicate temporary grade columns. Student cross-course summaries,
report cards, attendance, and exports consume separately permissioned released
projections; they do not read raw assessment snapshots.

## Security, storage, and integration boundaries

- The current adapter is versioned browser-local synthetic persistence. Unknown
  fields, stale schemas, cross-organisation values, broken references, invalid
  timestamps, or inconsistent totals fail closed to a safe fixture.
- Import/export is a future audited adapter. It must preserve identity,
  provenance, version, permissions, and link/copy intent; no live provider or
  copied copyrighted question source is included here.
- AI assistance is optional future draft support only. Ordinary question and
  assessment authoring cannot depend on AI. No client secrets, provider calls,
  automatic publication, student-data transfer, or model-decided grades are in
  this slice.
- A later MCP adapter calls the same authorised domain service. It cannot read
  the database directly, widen bank/course access, publish, regrade, or release
  results without the required role, scope, audit, and human confirmation.

## Acceptance criteria

1. IDs, revisions, versions, lifecycle, audit, scope, availability, references,
   totals, responses, and grade events validate deterministically and unknown
   fields fail closed.
2. Private drafts and newer owner drafts do not leak through organisation bank
   discovery; students cannot query the author bank.
3. Publication requires named independent review of the exact question version.
4. Linked and copied assessment items preserve their selected bank version and
   source/provenance in an immutable assessment release.
5. Student projection requires active authorised membership and never includes
   an objective answer key, teacher guidance, other learners, or unreleased
   content.
6. MCQ/true-false scoring is deterministic and evidence-preserving; short
   answers remain pending human review and unreleased.
7. Closing/expiry prevents new answers or submission, attempt limits are
   enforced, and malformed persisted state cannot crash or widen access.
8. The first visible course-assessment surface that follows this contract must
   complete teacher authoring/assembly/release and student attempt/result paths
   at desktop, 375 px, 320 px, keyboard-only, and 200% reflow before claiming
   those types usable.

## Implemented visible slice

- The teacher Quizzes area separates course quiz assembly, the organisation
  bank, and an explicitly labelled author/QA reviewer checkpoint. A normal
  teacher cannot silently self-approve their own question version.
- The editor exposes only MCQ and true/false. Save creates a private draft;
  request review and named reviewer publication are separate actions.
- Quiz assembly selects a published question, exact link-or-copy policy,
  points, availability, and one-to-three attempts. This pilot releases one
  immutable version and uses immediate results only because every selectable
  question is deterministic.
- The student Quizzes area receives only role-safe projections. It supports
  local start/resume, one response per item, explicit submission, and private
  released item feedback. It never receives bank keys or another learner's
  attempt.
- Browser persistence is versioned and fail-closed. The UI is an original,
  synthetic demonstration; organisation reviewer identity, notifications,
  production storage, human marking, amendments, regrades, and Gradebook
  release remain later focused workflows.
