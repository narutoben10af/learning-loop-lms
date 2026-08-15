# Teacher Authoring and Operations Track

Status: active course-workspace product track. The first Module Composer slice is shipped; the course dashboard, course shell, roster, announcements, and media foundation now precede deeper assessment/gradebook delivery.

## Outcome

A teacher should be able to organise a course, publish a learning sequence, preview exactly what students receive, review submissions, and return useful feedback from either a laptop or phone. The design may learn from established LMS workflow patterns, but all information architecture, interface, copy, code, and trade dress must be independently authored.

## Canvas workflow observation and differentiated direction

An authorised observation of an authenticated Canvas instructor course found these useful workflow primitives: course-level **Add Module**, per-module **Add Content**, module visibility/publish controls, drag/reorder plus an accessible **Move To** alternative, requirement/progression cues, recognisable item types (subheaders, pages/files, external resources/video, assignments, discussions, and quizzes), and per-item management.

These findings are requirements evidence, not a screen to clone. Learning Loop's differentiated direction is a quieter structured composer inside the module itself: add a learning block, assessment, or resource in context; edit essential title/instructions/outcome fields inline; set visibility, schedule, prerequisites, and completion rules without modal churn; preview through the real student renderer; and jump directly to the relevant submissions or gradebook column. The learning sequence and next teacher move remain primary, with advanced administration progressively disclosed instead of reproducing Canvas-style density.

### Capability map, not a clone list

The observed course shell surfaced home, announcements, modules, assignments, quizzes, discussions, grades, people, pages, syllabus, files, rubrics, outcomes, settings, student view, and progress. Learning Loop will now expose a recognisable, original course shell covering those underlying jobs. Destinations may share services and progressively disclose complexity, but visible navigation cannot be dead or pretend to be complete. The canonical state of each destination is recorded in [the master product plan](MASTER_PRODUCT_PLAN.md).

- **Core first-party path:** course home, module composer, assessment/question bank, submissions/human marking, gradebook, roster, simple attendance, communication, resources, rubrics/outcomes, and student preview/progress.
- **Later integration boundary:** external video/collaboration apps, specialised analytics, badges, accessibility extensions, and other plugins. These are not mandatory first-party clones.
- **Production role boundary:** teachers, students, teaching assistants, parents/guardians, organisation administrators, and platform owners receive separately authorised workspaces and data scopes.

## Core workflow

1. **Course home** — show the next teaching actions, current module, work awaiting review, and learner signals rather than a generic file dashboard.
2. **Modules** — build the student learning sequence from pages, assignments, quizzes, authorised resources, and external video links.
3. **Quick organise** — add an item in place, reorder with pointer or keyboard controls, duplicate intentionally, and publish/unpublish without leaving the sequence. Batch actions must be reversible and clearly scoped.
4. **Author/edit** — use typed content/item schemas, original resources, preview validation, accessibility checks, and explicit draft/published state.
5. **Schedule and rules** — set availability, due dates, prerequisites, and completion requirements with timezone-safe summaries and conflict warnings.
6. **Student preview** — render the exact authorised student experience and disclose that preview mode is author/QA tooling, not role switching.
7. **Submissions and marking** — move quickly through one learner or one question at a time, inspect attempts/evidence, apply a transparent rubric, comment, save a draft, return for another try, or release feedback. Learning evidence and next teaching action remain more prominent than grading throughput.
8. **Gradebook** — provide assignment/question columns, student rows, status labels, filters, comments, missing/late/excused distinctions, and controlled return/notify flows. Bulk changes require explicit scope, preview, confirmation, and audit.

## Module Composer product requirement

The named teacher authoring surface is **Module Composer**. It must support adding a learning block, assessment, or resource directly in context; inline essentials with an advanced panel; batch scheduling/publishing; templates and duplicate-week actions; module/item search; real student preview; quick links to relevant submissions/gradebook; and keyboard-accessible order management. State is always visible as **draft**, **scheduled**, **published**, **closed**, or **hidden**, with prerequisite and learner-progress cues. Learning evidence and review workload should be visible without turning the composer into a dense grade-administration page.

## Assessment and gradebook integrity

The observed Assignments and Quizzes pages support search, add/settings actions, category/group organisation, due/points/publish controls, module linkage, assignment groups with weights/rules, practice/ungraded/extra-credit patterns, and due/available/closed states. The observed individual gradebook also supports section selection, assignment sorting, ungraded-as-zero views, hidden names, student notes, score import/export, history, student/assignment selection, previous/next navigation, and autosave.

Learning Loop should preserve the useful jobs while preventing a common failure mode: duplicate, old, temporary, split, or placeholder items creating ambiguous grade columns.

- Every assessment has one immutable canonical ID and explicit lifecycle/version metadata: draft, published version, revision, superseded, and archived. Titles are never the identity.
- Revisions preserve historical attempts and grade evidence against the exact published version; editing does not silently rewrite earlier evidence.
- One canonical assessment owns its attempts, sections/parts, accommodations, and gradebook projection. Parts do not become duplicate grade columns unless the author explicitly creates separate assessments.
- Test/preview submissions and scores are isolated from the live roster, analytics, notifications, and gradebook.
- Assessment taxonomy (quiz, assignment, practice, discussion response, project, exam) is separate from grading-group/category and weighting rules.
- Search and filters expose lifecycle/version state, module linkage, schedule, grading group, and whether an item creates a gradebook column.
- Publishing uses a release checklist covering identity/version, content validation, accessibility, points/rubric, module placement, availability/due date/timezone, prerequisites, attempts/accommodations, student preview, recipient scope, gradebook effect, and notification choice.
- Archiving is recoverable and never deletes historical attempts or silently removes released grades.
- The gradebook begins with a clear **Needs marking / needs attention** queue and one obvious marking entry point. Rubric, status, comments, release state, and attempt context travel together.
- Bulk score/status/release actions show exact scope and before/after impact, require confirmation for material changes, support undo where safe, and create audit events.
- Temporary columns and ad-hoc final-score placeholders are not ordinary authoring patterns; derived totals are named, rule-backed projections with provenance.

## Mobile and accessibility

- On phones, prioritise quick add, publish status, reordering, due-date changes, submission triage, short comments, and return/notify actions; complex authoring may progressively disclose larger-screen tools.
- Every drag/reorder action has keyboard buttons and screen-reader position announcements.
- Focus order, 44px targets, sticky actions, autosave state, undo, and interruption-safe drafts are required.
- Status and publication state never rely on colour alone.

## Domain seams to preserve now

- Course → module → ordered module item relationships use stable IDs and explicit ordering, availability, prerequisite, completion, and publication state.
- An item references versioned content rather than embedding untyped editor state in the module.
- Preview calls the same permission/presentation services as the student experience, with an explicit author-preview context.
- Submission, attempt, rubric, grade/status, comment, feedback-release, notification, and audit events remain separate records.
- Assessment identity, content version, assessment taxonomy, grading group, and gradebook projection remain separate fields/records.
- Published versions and in-progress drafts are distinguishable; edits do not silently mutate evidence attached to an earlier version.
- Backend permissions ultimately enforce teacher assignments, course scope, material actions, and data minimisation.
- Workspace → course → membership relationships use stable IDs and role-bound projections so a future dashboard never infers access from raw course records.
- Announcements are versioned communication records with audience, lifecycle, schedule, author, and audit state; they are not untyped page blocks.
- Media metadata and binary storage are separate. Local demo files cannot masquerade as durable published resources; a future storage adapter owns authorised upload, scanning, signed access, retention, and revocation.

## Later acceptance criteria

- A teacher can add, reorder, schedule, preview, and publish a five-item module on laptop and phone using pointer or keyboard-only controls.
- Prerequisite/availability conflicts are detected before publish and explained in plain language.
- The student preview matches the student renderer while exposing no teacher-only evidence or controls.
- Marking can move through a filtered submission queue without losing drafts; return/release/notify actions show exact recipients and are audited.
- Gradebook filters and statuses are deterministic, keyboard accessible, and do not conflate missing, late, excused, unsubmitted, and ungraded.
- Preview/test attempts cannot create live gradebook columns, learner records, analytics events, or notifications.
- A release-checklist fixture blocks ambiguous identity/version, accidental duplicate grade projection, missing recipient scope, and unreviewed preview state.
- No workflow copies Canvas code, visual treatment, branded wording, or AGPL-derived implementation.
