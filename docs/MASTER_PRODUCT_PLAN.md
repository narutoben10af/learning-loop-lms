# Learning Loop LMS — Master Product Plan

Status: canonical product and delivery plan

Last reconciled: 2026-08-15

## Honest starting point

Learning Loop first proved one strong idea: a student can predict, manipulate a reusable Economics graph, explain the result, and send evidence into a teacher review loop. It now also has a role-projected course dashboard, private local course creation, a course shell, Modules authoring, a synthetic profile-linked People roster, deliberate course Announcements, a transparent local Files/media library, and an end-to-end objective quiz loop over an organisation question bank. The product is not yet a complete day-to-day LMS because human marking, Gradebook, attendance, identity, production storage, and broader assessment workflows are still being delivered. Comparing the remaining gap with a mature LMS exposes a product-system gap, not a polish issue.

The reset keeps the validated Economics learning loop and builds the course operating system around it. Canvas workflow observations inform the jobs that must be supported; Learning Loop will not copy Canvas code, language, visual trade dress, navigation density, or course content. Its original differentiator is a quieter workspace organised around the next teaching action and the learner evidence it will create.

## Product promise

Learning Loop helps a school run a course as one visible loop:

1. a teacher plans a coherent learning sequence;
2. a student encounters the right resource or activity at the right time;
3. the student practises and makes reasoning visible;
4. feedback and human marking return a useful next step;
5. the teacher sees class evidence and adapts the next lesson.

Content management, grading, communication, and administration support this loop; they are not the centre of the product by themselves.

## Original information architecture

### Workspace level

The signed-in landing surface is **My workspace**, not an isolated activity.

- **Courses** — active, draft, archived, and invited courses that the user may access.
- **Teaching signals** — work needing review, unpublished changes, upcoming releases, and learner-support signals appropriate to the role.
- **Create course** — teacher/administrator flow with title, code, term, subject, section, visibility, and an explicit draft state.
- **Calendar** — authorised course dates and teaching schedule across courses.
- **Account and help** — personal preferences, accessibility settings, privacy explanation, and support.

Students see their courses, due/available work, feedback, and private progress. They never see course creation, teacher queues, roster controls, or an author-preview switch. Parents/guardians and administrators later receive separate, permission-scoped workspaces rather than a client-side role toggle.

### Course level

Every course uses one original, role-aware shell with these destinations:

| Destination   | Teacher job                                                                                      | Student job                                                                  | First implementation state                                       |
| ------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Home          | See teaching priorities, current learning sequence, draft/release issues, and review workload    | See the next learning action, recent feedback, and course progress           | Functional in the immediate course-shell milestone               |
| Announcements | Draft, schedule, publish, edit, and archive course notices                                       | Read published notices in chronological context                              | Functional local/synthetic slice                                 |
| Modules       | Compose, order, schedule, preview, and publish the learning sequence                             | Follow authorised items and completion requirements                          | Existing composer and Economics launch integrated into the shell |
| Assignments   | Find canonical assessments, author settings/content, and manage release                          | See authorised assignment instructions, status, due dates, and attempts      | Honest roadmap surface until assessment core lands               |
| Quizzes       | Build MCQ/TF quizzes from reviewed bank versions, set attempts/availability, and release once    | Start/resume/submit authorised attempts and receive policy-released feedback | Functional local pilot; human marking and broader types follow   |
| Grades        | Enter the needs-marking queue, mark with context, and control feedback release                   | See only released grades, feedback, and next actions                         | Honest roadmap surface until submissions/gradebook lands         |
| People        | View authorised course membership and roles; later invite/activate through safe roster workflows | See only the class information policy permits                                | Functional local/synthetic roster slice                          |
| Pages         | Find and edit learner-facing pages without losing module context                                 | Read published pages in the course navigator                                 | Initial entries route to the real Module Composer/editor         |
| Files         | Add, organise, preview, replace, and remove permissioned course media                            | Open only student-safe published file projections                            | Functional local-demo media library plus future storage contract |
| Discussions   | Create structured prompts and moderation settings                                                | Participate within course policy                                             | Honest roadmap surface until communications delivery             |
| Calendar      | Schedule releases, due dates, lessons, and exceptions                                            | See authorised course dates and availability                                 | Readable course schedule first; full editing later               |
| Settings      | Manage course identity, term, status, visibility, policies, and approved integrations            | No teacher settings                                                          | Functional course essentials first; advanced policy later        |

Navigation labels may be combined or progressively disclosed on phones, but no visible destination may be a dead control or pretend to be complete. A roadmap destination explains what exists now, what does not, and links to the closest real workflow.

## Canvas-informed workflow findings

The authorised, sanitised workflow study establishes capability coverage, not a clone specification.

- **Dashboard and course creation:** a teacher needs a reliable course list, clear status/term context, and a deliberate course-creation path. Learning Loop improves this with teaching signals and obvious draft ownership rather than a grid of undifferentiated tiles.
- **Course home:** course identity and navigation must remain stable while the centre prioritises the next teaching action, learner evidence, and release risks.
- **Modules and authoring:** support course-level module creation; contextual add; typed pages, resources, video, assignment, quiz, discussion, and subheader/learning-block items; visible lifecycle; prerequisites; progression; pointer reorder plus Move-To parity; and item management. Learning Loop keeps essential editing in context and puts advanced controls behind a deliberate panel.
- **People and enrolment:** roster and roles are first-class. Production identity is teacher-created roster to private one-time activation, never open registration or a shared enrolled-course code.
- **Announcements and communication:** teachers need draft/scheduled/published notice states and recipient clarity; students need a calm, ordered feed. Later direct messaging and discussions follow separate moderation and notification policies.
- **Assignments, quizzes, and question bank:** preserve search, grouping, schedule, points, attempts, and module linkage while preventing duplicate/temporary grade columns. The reusable question bank belongs to the organisation/school, not an individual course: ownership, permissioned sharing, subject/topic/level/standard tags, type, source/provenance, immutable versions, review/publish state, and explicit link-versus-copy semantics are first-class. One immutable assessment identity owns its versions, parts, attempts, and gradebook projection.
- **Marking and grades:** retain both a quick spreadsheet-like overview and detailed human marking. The Gradebook uses students as rows and canonical graded items as columns, with weights/totals/visibility, pending and ungraded states, search/filter/sort, keyboard cells, a responsive accessible alternate layout, and explicit edit/save/cancel for controlled grade changes. Every override validates its scale/range and records who, when, and why; no silent overwrite is allowed. Detailed review supplies rubric, attempt, feedback, return/release, and notification context.
- **Course reuse:** a deliberate duplicate/rollover command previews what will copy into a new private course identity and term. Structure, modules, safe content, settings templates, and assessment definitions/references may copy; memberships, submissions, grades, feedback, attendance, private drafts, credentials, and prior audit history never do. Announcements copy only by explicit selection. Shared-bank questions require an explicit reference-or-copy policy.
- **Files, media, and pages:** media belongs to permissioned course content, not an unstructured public drive. Reuse, replacement, accessible descriptions, ownership, storage status, and student-safe projection are visible.
- **Discussions, calendar, and settings:** these are real course operations, but they do not need to be fully built before the course shell can truthfully expose their delivery status and safe handoffs.
- **External tools:** video, conferencing, specialised analytics, badges, and accessibility extensions use a typed plugin boundary. They are not mandatory first-party clones.
- **Interactive authoring:** ordinary teachers need a self-service template registry and declarative configuration editor; AI is an optional draft source, never the dependency. The current Supply and demand explorer is a predefined pilot configuration and is labelled accurately until the builder lands.

### Sanitised structural re-audit — 2026-08-15

A fresh read-only review of an authenticated institutional Canvas instructor surface confirmed the following structure. No Canvas record was changed; no student name, course content, file name, asset, or screenshot is tracked or published in this repository.

- The dashboard makes courses, global calendar, and grades reachable, but this institutional account did not expose a clear teacher Create Course action. Learning Loop therefore owns an obvious permission-aware Create Course flow instead of assuming institution provisioning.
- Course Home combines editable home content with course publication, home-page choice, activity stream, and announcement entry. Learning Loop separates course status from page authoring and makes the next teaching actions the primary hierarchy.
- Modules expose course-level add, expand/collapse, progress, per-module/per-item management, release state, and ordering. Learning Loop keeps these jobs but uses the in-context Module Composer and one accessible ordering contract.
- People exposes add, search, role filtering, groups, and per-person management. Learning Loop's first roster is synthetic/readable; production add/activation waits for backend identity and audit.
- Announcements expose a dedicated searchable course feed and authoring entry. Learning Loop models draft, schedule, audience, publish, edit, and archive explicitly rather than treating an announcement as a generic page.
- Files exposes a folder/list library, upload, search, sort, selection, bulk actions, status, and per-item management. Learning Loop's local milestone provides a much smaller safe media library, but preserves the storage/status/ownership seams required for durable files later.
- Assignments and Quizzes expose distinct searchable authoring lists, settings, grouping, lifecycle, and module linkage. Learning Loop keeps separate navigation while enforcing one canonical assessment identity and a shared question/attempt engine beneath it.
- The individual Gradebook exposes section and assignment sorting, learner/assignment selectors, ungraded-as-zero, hidden-name and notes options, history, and previous/next marking context. Learning Loop prioritises a needs-marking queue and safer release/audit before administrative density.
- Discussions expose a dedicated create/manage surface; Calendar combines multiple course calendars and undated work; Settings separates course details, sections, navigation, integrations/apps, feature options, student view, and course lifecycle actions. Learning Loop keeps each as a named course operation but stages the editable depth by milestone.

Evidence limit: screenshots were deliberately not tracked or published because the authorised task permits only sanitised structural notes. Visual treatment and accessibility implementation were therefore not copied or claimed as audit evidence; Learning Loop's UI remains independently designed and must pass its own browser and assistive-technology checks.

## Delivery milestones

### Milestone 1 — Usable course workspace now

Goal: make the public prototype recognisable and useful as an LMS shell while keeping all data synthetic and device-local.

Current status: the workspace/course contract, My workspace dashboard, selected-course navigation shell, teaching-focused Home, Modules integration, profile-linked synthetic People roster, role-safe Announcements, local Files/media, organisation question bank, teacher MCQ/TF authoring/assembly/release, and private student attempts/results are implemented. The immediate usable course shell and first objective assessment loop are therefore concrete. Detailed human marking and Gradebook are the next assessment-focused slices. Other named course operations stay visible with honest scope and a useful adjacent action rather than pretend functionality.

Deliver in focused PRs:

1. **Workspace and course domain** — versioned organisation/workspace state, course list, role memberships, course status, create/select/archive-safe contracts, local migration and fail-closed validation.
2. **Course dashboard** — first screen with active/draft courses, recent teaching signals, and a validated Create Course flow. Teachers receive author actions; students receive only authorised courses and learning signals.
3. **Course shell and overview** — stable original navigation plus functional Home, Modules integration, and honest scoped destinations.
4. **People and profiles** — fictional profile and course-membership projections for teacher, teaching assistant, student, and parent/guardian roles; search/filter; clear Add people scope; no-email roster-to-private-activation contract; recovery/privacy/audit boundaries. The local slice creates only pending synthetic records and never implies a production invitation, account, or enrolment.
5. **Announcements** — local draft/schedule/publish/archive behavior, explicit audience, and student projection only after release.
6. **Files and local media** — media-library entry, link/embed and browser-file draft metadata, image thumbnail preview where the browser provides an object URL, replace/remove, student-safe projection, and a storage adapter boundary.

Immediate acceptance criteria:

- Opening the app starts at My workspace and a user can create, see, select, and return between multiple local synthetic courses.
- A teacher enters a selected course and can use Home, Modules, People, Announcements, and Files/media. Links and YouTube resources have explicit draft/publish boundaries; device-local file bytes never masquerade as durable school storage.
- Assignments, Quizzes, Grades, Pages, Discussions, Calendar, and Settings are reachable, truthful about delivery state, and link to a working adjacent action where one exists.
- Student and teacher projections are separate routes/surfaces. A student cannot reveal teacher navigation or raw data through client state.
- The Economics activity remains launchable from its module and its completion evidence returns to the course view.
- State survives reload through a versioned, validated local schema. Malformed or old state fails safely without exposing raw fields or bricking Reset.
- Keyboard-only operation, focus restoration, 44px targets, semantic status messages, and no horizontal overflow pass at 320px, 375px, desktop, and 200% zoom.

### Milestone 2 — Core teaching and assessment delivery

Goal: make a course teachable end to end without duplicate assessment state or fake grading.

- Module Composer clarity and depth: a collapsed course outline with one active selection; ordering controls revealed on demand; one primary Add action with an accessible type picker; concise item summaries and secondary actions; one contextual edit panel; templates, deliberate duplication, batch schedule/publish with preview and audit, and direct evidence links. Move-To parity and lifecycle/availability remain visible without being repeated on every row.
- Interactive template authoring: the four explicit capability classes—Rich content, Configurable interactive template, Imported/embed resource, and AI-assisted draft—plus a non-AI declarative builder for supply–demand, AS–AD, IS–LM, PPC/PPF, and pedagogical budget-constraint/indifference-curve activities. Shift activities retain a baseline and show the active curve/outcome separately. See the [interactive template contract](INTERACTIVE_TEMPLATE_CONTRACT.md).
- Organisation question bank and assessment core: school-owned reusable questions with ownership/share permissions, metadata taxonomy, type, provenance, immutable versions, draft/review/publish workflow, import/export contract, and explicit linked-versus-copied course references. Canonical assessments add parts, attempts, grading-group projection, validation, preview isolation, and a release checklist. Objective MCQ, true/false, matching, fill/cloze, and calculation rules may autograde only against the released question version; short answers and essays remain in human review. Attempt policy, response/version evidence, regrade policy, and grade release are explicit. Any later rubric-backed AI suggestion is advisory until a teacher confirms it.

  The first shipped assessment contract intentionally supports only usable multiple-choice and true/false deterministic scoring plus a short-answer human-review boundary. Matching, fill/cloze, calculation, essay, and other types remain planned until each has complete authoring, validation, response, marking, and accessibility behavior. See [Assessment and Organisation Question Bank Contract](ASSESSMENT_QUESTION_BANK_CONTRACT.md).

- Submissions and detailed human marking: needs-marking queue, learner/question navigation, rubric, annotations/comments, interruption-safe draft save, retry/return, feedback release and notification.
- Gradebook overview and controlled edits: course-membership/profile-linked students as rows and canonical assessed items as columns, totals/weights/visibility, pending/ungraded status, filters/sort/search, keyboard cells, accessible responsive alternative, and clear handoff to detailed marking. Grade adjustments require edit/save/cancel, range/scale validation, reason, immutable history, release state, and actor/time audit. No display-only name or orphan grade record is accepted.
- Grade export contract: an authorised teacher may later preview and deliberately export an Excel-compatible CSV/XLSX snapshot for one course. The export defines fields, timestamp/timezone, weights/formula provenance, released/withheld state, and personal-data minimisation, then audits the export action. No third-party exchange or silent background export exists in the prototype.
- Private learner reporting: a later **My learning / grades** workspace aggregates only the signed-in student's own active course memberships, released course grades and feedback, missing/upcoming work, and a clearly scoped aggregate. It never exposes another learner or an unpublished/withheld grade. Teacher Gradebook remains course-scoped by default; only specifically authorised school roles may later receive cohort/reporting projections. A parent/guardian sees only an explicitly authorised linked child's approved summary.
- Formal report cards: organisation policy and accessible templates produce a versioned snapshot of authorised grades, attendance, teacher comments, and calculation provenance. A teacher reviews it before an authorised release; correction, retention, withdrawal/revocation, and accessible PDF generation are explicit lifecycle events. The platform never invents or automatically finalises a grade without the organisation's stated policy.
- Course duplication and rollover: preview an explicit safe-copy manifest, create a new private course identity/owner/audit/term, and verify source/destination isolation. Never copy memberships, submissions, grades, feedback, attendance, credentials, private drafts, or old audit history.
- Course schedule: course-scoped recurrence/frequency, weekday set, start/end time, term date range, timezone, holiday/no-class exceptions, one-off cancellation/reschedule/makeup events, and manual ad-hoc sessions generate expected sessions predictably. Holiday and cancelled exceptions generate no class. Institution policy later supplies holiday sources and attendance calculations; local/sample schedules remain visibly synthetic. A replaceable audited calendar connector may synchronise later but is never required for core scheduling.
- Roster and attendance: after People/membership contracts, a teacher opens an actual scheduled or manual course session and marks the profile-linked roster present, late, absent, excused, or remote, with notes, actor/time audit, and safe correction history. Students see only their own attendance; a parent/guardian later sees only an authorised linked child's approved attendance. No global timetable may blend unrelated course data.
- Communications and resources: discussions, messaging/notifications, authorised article/video resources, disclosed engagement evidence and retention.

### Milestone 3 — Production platform and optional extensions

Goal: move from a public prototype to a policy-reviewed, tenant-safe school platform only after the core workflows and domain APIs are validated.

- backend tenant, role, relationship, object, and purpose enforcement;
- durable database and object storage with malware scanning, retention, access revocation, backups, and incident ownership;
- private activation-code identity and recovery;
- organisation administration, parent/guardian approved summaries, and simple platform operations;
- plugin/integration SDK and selected school integrations;
- analytics that report learning evidence without attention claims;
- native Flutter clients only after responsive-web workflows stabilise;
- MCP adapter over authorised LMS services;
- optional paid-premium AI jobs with authorised contextual retrieval and draft-only human review;
- later transparent Teach-back Lab discovery.

No live AI provider, MCP server, billing, parent portal, public registration, Canvas integration, or broad student-data ingestion belongs in Milestone 1.

## Role and permission policy

Production access is enforced in backend application services. UI projections reduce accidental exposure but are not authorization.

| Role                       | Default scope                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform owner             | Explicit platform operations only; no automatic private submission access                                                                         |
| Organisation administrator | Organisation configuration, approved reporting, roster administration, and policy within the assigned tenant                                      |
| Teacher                    | Assigned courses, authoring, roster operations, learning evidence, marking, and release controls                                                  |
| Teaching assistant         | Explicit course capabilities delegated by a teacher/administrator; no implicit full-teacher access                                                |
| Student                    | Own active memberships, published/available content, own work, own released grades/feedback and private progress; never another learner's records |
| Parent/guardian            | Explicitly linked children and only authorised, school-approved summaries/resources; no default authoring or class-wide access                    |

Every projection and later API call binds organisation, principal, course, relationship, object, action, and purpose. Material actions—publication, grades, attendance, enrolment, invitations, permissions, and file sharing—are scoped and audited; sensitive bulk actions require explicit confirmation.

## Domain boundaries

- **Organisation and workspace:** tenant, academic term, feature flags, entitlement references, workspace membership.
- **Course:** immutable identity, code, title, subject, term, section, lifecycle, ownership, visibility, audit.
- **Membership:** course/person relationship, role, status, source, activation lifecycle; credentials are separate.
- **Learning sequence:** modules, ordered module items, prerequisites, availability, completion, release state, versioned content reference.
- **Interactive templates:** organisation-owned registry entry, compatible schema/renderer/accessibility versions, declarative activity versions, validation/review/provenance, and student-safe published projection; no arbitrary executable lesson code.
- **Content and media:** pages, resources, file/image/video metadata, accessibility descriptions, ownership, storage reference, publication projection.
- **Communication:** announcements, discussion topics/posts, audience, moderation, schedule, notification intent.
- **Question bank and assessment:** organisation-owned question identity/version, ownership/share scope, subject/topic/level/standard/type/source metadata, link/copy reference policy, canonical assessment identity, content versions, taxonomy separate from grading group, release checklist, attempts, accommodations, and import/export mapping.
- **Evidence and grading:** immutable submissions/attempts, released question-version evidence, profile plus active course-membership references, rubric decisions, grade records/status, append-only adjustments with actor/time/reason, totals/weight policy, feedback release, notification and audit as separate records.
- **Learner reporting:** role-scoped released-grade projection across a learner's own active memberships, missing/upcoming work, calculation provenance, and withheld-state filtering; parent and cohort projections are separate authorised contracts.
- **Report cards and exports:** policy/template identity, immutable snapshot and calculation version, reviewer/releaser, correction/revocation lifecycle, accessible PDF artefact reference, retention, minimised export schema, timestamp/timezone, and export audit.
- **Course duplication:** an audited command and copy manifest that creates new identities and selectively references/copies safe definitions while excluding people and historical evidence by construction.
- **Course schedule:** course identity, timezone, recurrence rule, weekday/time, term range, holiday/no-class exception source, one-off cancellation/reschedule/makeup, manual session, expected-session provenance, and immutable occurrence identity. Session generation is deterministic and course-bound.
- **Attendance:** scheduled/manual course-session identity plus active profile/membership reference, present/late/absent/excused/remote status, note policy, calculation policy reference, actor/time audit, and append-only correction. Student and linked-parent projections never cross the course/person relationship.

Domain services expose role-bound projections; browser components do not infer visibility from raw records.

## Media storage strategy

Milestone 1 uses a `MediaStorageAdapter` contract with a local demo implementation.

- Browser-selected files remain device-local drafts. The prototype may keep allowlisted metadata and an ephemeral object URL for same-session preview; it must not claim the bytes are uploaded, durable, shared, or recoverable after reload.
- Persist only safe metadata needed for the demo: generated media ID, display name, media type, MIME type allowlist, byte size, alternative text/caption, source kind, owning course/item, and lifecycle. Never persist file bytes in localStorage.
- Link/embed resources validate `https:` URLs. YouTube support stores a validated video ID/URL and learner-facing description; no IFrame telemetry is active until disclosed engagement policy lands.
- Student projections omit local device paths, object URLs, file handles, teacher notes, and unknown metadata. A local-only draft cannot publish as a durable student file.
- The future durable adapter may target Supabase Storage, R2, or another reviewed provider. Selection requires explicit authorization for provider account/terms/cost and must add tenant-scoped object keys, signed access, server-side authorization, malware/type scanning, quotas, retention/deletion, audit, and revocation. The frontend never receives storage provider secrets.

## Security, privacy, and evidence boundaries

- Milestone 1 uses fictional people and original/synthetic course content only. Do not enter real student data.
- No student email or phone is required by the pilot design.
- Local state is convenience persistence, not a secure evidence record or school backup.
- Collect only disclosed learning events that support feedback or a teacher action. Engagement is evidence of interaction, never proof of attention or comprehension.
- No hidden surveillance, raw off-platform browsing, GPS, biometrics, remote proctoring, arbitrary code execution, or provider keys.
- AI remains optional, premium-entitled, backend-only, least-privilege, source-citing, draft-only, and human-reviewed. MCP remains an adapter over the same authorised domain services.
- All content is original or appropriately authorised. Do not ingest copyrighted Canvas course content, past papers, or Canvas AGPL source.

## Integration posture

Integrations are a major platform requirement, but they follow the validated
course, membership, content, evidence, and permission services rather than
shaping those domains around one vendor. LTI/external tools, media/YouTube,
file storage, calendar/video/communication, SSO/identity, grade
passback/import/export, notifications, analytics, AI, and MCP each use a typed,
replaceable, permissioned, audited adapter. The teacher can understand the
scope, data, provider status, material effect, and revocation path before using
map. No live adapter, credential, provider account, paid service, or student-data
exchange is part of the local course-workspace milestone.

## Quality and release contract

Each focused PR must include proportionate domain/UI tests, migration and malformed-state fixtures, role-projection tests, documentation updates, privacy/security impact, and named responsive evidence. UI PRs require independent review plus Chrome checks at desktop, 375px, 320px, keyboard-only, and 200% zoom. Required CI—format, lint, typecheck, unit tests, and build—must pass before squash merge through protected `main`.

The course-shell milestone is complete only when the public deployment visibly starts at My workspace, the listed functional destinations work, unfinished destinations are honest and useful, and the Economics learning loop still works without regression.
