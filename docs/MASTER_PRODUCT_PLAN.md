# Learning Loop LMS — Master Product Plan

Status: canonical product and delivery plan

Last reconciled: 2026-08-15

## Honest starting point

Learning Loop currently proves one strong idea: a student can predict, manipulate a reusable Economics graph, explain the result, and send evidence into a teacher review loop. It also has a small Module Composer. That is a useful vertical slice, but it is not yet a recognisable, day-to-day LMS. The deployed first screen does not provide a course dashboard, multi-course management, roster, announcements, media library, or a complete course workspace. Comparing that narrow slice with a mature LMS therefore exposes a real experience gap, not a polish issue.

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

| Destination   | Teacher job                                                                                      | Student job                                                             | First implementation state                                       |
| ------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Home          | See teaching priorities, current learning sequence, draft/release issues, and review workload    | See the next learning action, recent feedback, and course progress      | Functional in the immediate course-shell milestone               |
| Announcements | Draft, schedule, publish, edit, and archive course notices                                       | Read published notices in chronological context                         | Functional local/synthetic slice                                 |
| Modules       | Compose, order, schedule, preview, and publish the learning sequence                             | Follow authorised items and completion requirements                     | Existing composer and Economics launch integrated into the shell |
| Assignments   | Find canonical assessments, author settings/content, and manage release                          | See authorised assignment instructions, status, due dates, and attempts | Honest roadmap surface until assessment core lands               |
| Quizzes       | Build versioned quizzes from the question bank and validate preview/release                      | Complete authorised attempts and receive configured feedback            | Honest roadmap surface until question-bank core lands            |
| Grades        | Enter the needs-marking queue, mark with context, and control feedback release                   | See only released grades, feedback, and next actions                    | Honest roadmap surface until submissions/gradebook lands         |
| People        | View authorised course membership and roles; later invite/activate through safe roster workflows | See only the class information policy permits                           | Functional synthetic roster; no production enrolment             |
| Pages         | Find and edit learner-facing pages without losing module context                                 | Read published pages in the course navigator                            | Initial entries route to the real Module Composer/editor         |
| Files         | Add, organise, preview, replace, and remove permissioned course media                            | Open only student-safe published file projections                       | Functional local-demo media library plus future storage contract |
| Discussions   | Create structured prompts and moderation settings                                                | Participate within course policy                                        | Honest roadmap surface until communications delivery             |
| Calendar      | Schedule releases, due dates, lessons, and exceptions                                            | See authorised course dates and availability                            | Readable course schedule first; full editing later               |
| Settings      | Manage course identity, term, status, visibility, policies, and approved integrations            | No teacher settings                                                     | Functional course essentials first; advanced policy later        |

Navigation labels may be combined or progressively disclosed on phones, but no visible destination may be a dead control or pretend to be complete. A roadmap destination explains what exists now, what does not, and links to the closest real workflow.

## Canvas-informed workflow findings

The authorised, sanitised workflow study establishes capability coverage, not a clone specification.

- **Dashboard and course creation:** a teacher needs a reliable course list, clear status/term context, and a deliberate course-creation path. Learning Loop improves this with teaching signals and obvious draft ownership rather than a grid of undifferentiated tiles.
- **Course home:** course identity and navigation must remain stable while the centre prioritises the next teaching action, learner evidence, and release risks.
- **Modules and authoring:** support course-level module creation; contextual add; typed pages, resources, video, assignment, quiz, discussion, and subheader/learning-block items; visible lifecycle; prerequisites; progression; pointer reorder plus Move-To parity; and item management. Learning Loop keeps essential editing in context and puts advanced controls behind a deliberate panel.
- **People and enrolment:** roster and roles are first-class. Production identity is teacher-created roster to private one-time activation, never open registration or a shared enrolled-course code.
- **Announcements and communication:** teachers need draft/scheduled/published notice states and recipient clarity; students need a calm, ordered feed. Later direct messaging and discussions follow separate moderation and notification policies.
- **Assignments, quizzes, and question bank:** preserve search, grouping, schedule, points, attempts, and module linkage while preventing duplicate/temporary grade columns. One immutable assessment identity owns its versions, parts, attempts, and gradebook projection.
- **Marking and grades:** improve on dense grade administration with one needs-marking entry, learner/question navigation, rubric and attempt context, interruption-safe drafts, controlled return/release/notify, and auditable bulk operations with undo where safe.
- **Files, media, and pages:** media belongs to permissioned course content, not an unstructured public drive. Reuse, replacement, accessible descriptions, ownership, storage status, and student-safe projection are visible.
- **Discussions, calendar, and settings:** these are real course operations, but they do not need to be fully built before the course shell can truthfully expose their delivery status and safe handoffs.
- **External tools:** video, conferencing, specialised analytics, badges, and accessibility extensions use a typed plugin boundary. They are not mandatory first-party clones.

### Sanitised structural re-audit — 2026-08-15

A fresh read-only review of the authenticated Temple Canvas instructor surface confirmed the following structure. No Canvas record was changed; no student name, course content, file name, asset, or screenshot is retained in this repository.

- The dashboard makes courses, global calendar, and grades reachable, but this institutional account did not expose a clear teacher Create Course action. Learning Loop therefore owns an obvious permission-aware Create Course flow instead of assuming institution provisioning.
- Course Home combines editable home content with course publication, home-page choice, activity stream, and announcement entry. Learning Loop separates course status from page authoring and makes the next teaching actions the primary hierarchy.
- Modules expose course-level add, expand/collapse, progress, per-module/per-item management, release state, and ordering. Learning Loop keeps these jobs but uses the in-context Module Composer and one accessible ordering contract.
- People exposes add, search, role filtering, groups, and per-person management. Learning Loop's first roster is synthetic/readable; production add/activation waits for backend identity and audit.
- Announcements expose a dedicated searchable course feed and authoring entry. Learning Loop models draft, schedule, audience, publish, edit, and archive explicitly rather than treating an announcement as a generic page.
- Files exposes a folder/list library, upload, search, sort, selection, bulk actions, status, and per-item management. Learning Loop's local milestone provides a much smaller safe media library, but preserves the storage/status/ownership seams required for durable files later.
- Assignments and Quizzes expose distinct searchable authoring lists, settings, grouping, lifecycle, and module linkage. Learning Loop keeps separate navigation while enforcing one canonical assessment identity and a shared question/attempt engine beneath it.
- The individual Gradebook exposes section and assignment sorting, learner/assignment selectors, ungraded-as-zero, hidden-name and notes options, history, and previous/next marking context. Learning Loop prioritises a needs-marking queue and safer release/audit before administrative density.
- Discussions expose a dedicated create/manage surface; Calendar combines multiple course calendars and undated work; Settings separates course details, sections, navigation, integrations/apps, feature options, student view, and course lifecycle actions. Learning Loop keeps each as a named course operation but stages the editable depth by milestone.

Evidence limit: screenshots were deliberately not retained because the authorised task permits only sanitised structural notes. Visual treatment and accessibility implementation were therefore not copied or claimed as audit evidence; Learning Loop's UI remains independently designed and must pass its own browser and assistive-technology checks.

## Delivery milestones

### Milestone 1 — Usable course workspace now

Goal: make the public prototype recognisable and useful as an LMS shell while keeping all data synthetic and device-local.

Deliver in focused PRs:

1. **Workspace and course domain** — versioned organisation/workspace state, course list, role memberships, course status, create/select/archive-safe contracts, local migration and fail-closed validation.
2. **Course dashboard** — first screen with active/draft courses, recent teaching signals, and a validated Create Course flow. Teachers receive author actions; students receive only authorised courses and learning signals.
3. **Course shell and overview** — stable original navigation plus functional Home, Modules integration, and honest scoped destinations.
4. **People and announcements** — synthetic roster projections with roles; local announcement draft/schedule/publish/archive behavior; student projection only after release.
5. **Files and local media** — media-library entry, link/embed and browser-file draft metadata, image thumbnail preview where the browser provides an object URL, replace/remove, student-safe projection, and a storage adapter boundary.

Immediate acceptance criteria:

- Opening the app starts at My workspace and a user can create, see, select, and return between multiple local synthetic courses.
- A teacher enters a selected course and can use Home, People, Announcements, Files, and Modules without dead-end controls.
- Assignments, Quizzes, Grades, Pages, Discussions, Calendar, and Settings are reachable, truthful about delivery state, and link to a working adjacent action where one exists.
- Student and teacher projections are separate routes/surfaces. A student cannot reveal teacher navigation or raw data through client state.
- The Economics activity remains launchable from its module and its completion evidence returns to the course view.
- State survives reload through a versioned, validated local schema. Malformed or old state fails safely without exposing raw fields or bricking Reset.
- Keyboard-only operation, focus restoration, 44px targets, semantic status messages, and no horizontal overflow pass at 320px, 375px, desktop, and 200% zoom.

### Milestone 2 — Core teaching and assessment delivery

Goal: make a course teachable end to end without duplicate assessment state or fake grading.

- Module Composer depth: module/item search, templates, deliberate duplication, batch schedule/publish with preview and audit, and direct evidence links.
- Assessment and question-bank core: versioned common question schemas, canonical assessment identity, taxonomy separate from grading groups, validation, preview isolation, release checklist, parts and attempts.
- Submissions and human marking: needs-marking queue, learner/question navigation, rubric, annotations/comments, draft save, retry/return, feedback release and notification.
- Gradebook: deterministic columns, filters/statuses, released feedback, weighting rules, history, safe imports/exports, and reversible audited bulk actions.
- Roster and attendance: teacher-created roster; private activation contract; present/late/absent/excused/remote lesson records; mark-all-present then exceptions; audit.
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

| Role                       | Default scope                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Platform owner             | Explicit platform operations only; no automatic private submission access                                    |
| Organisation administrator | Organisation configuration, approved reporting, roster administration, and policy within the assigned tenant |
| Teacher                    | Assigned courses, authoring, roster operations, learning evidence, marking, and release controls             |
| Teaching assistant         | Explicit course capabilities delegated by a teacher/administrator; no implicit full-teacher access           |
| Student                    | Enrolled courses, published/available content, own work, own released feedback and private progress          |
| Parent/guardian            | Linked children and only school-approved summaries/resources; no default authoring or class-wide access      |

Every projection and later API call binds organisation, principal, course, relationship, object, action, and purpose. Material actions—publication, grades, attendance, enrolment, invitations, permissions, and file sharing—are scoped and audited; sensitive bulk actions require explicit confirmation.

## Domain boundaries

- **Organisation and workspace:** tenant, academic term, feature flags, entitlement references, workspace membership.
- **Course:** immutable identity, code, title, subject, term, section, lifecycle, ownership, visibility, audit.
- **Membership:** course/person relationship, role, status, source, activation lifecycle; credentials are separate.
- **Learning sequence:** modules, ordered module items, prerequisites, availability, completion, release state, versioned content reference.
- **Content and media:** pages, resources, file/image/video metadata, accessibility descriptions, ownership, storage reference, publication projection.
- **Communication:** announcements, discussion topics/posts, audience, moderation, schedule, notification intent.
- **Assessment:** canonical identity, content versions, taxonomy, grading group, release checklist, attempts and accommodations.
- **Evidence and grading:** submissions, response evidence, rubric decisions, grades/status, feedback release, notification and audit as separate records.
- **Schedule and attendance:** course events, due/availability windows, lesson sessions and auditable attendance records.

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

## Quality and release contract

Each focused PR must include proportionate domain/UI tests, migration and malformed-state fixtures, role-projection tests, documentation updates, privacy/security impact, and named responsive evidence. UI PRs require independent review plus Chrome checks at desktop, 375px, 320px, keyboard-only, and 200% zoom. Required CI—format, lint, typecheck, unit tests, and build—must pass before squash merge through protected `main`.

The course-shell milestone is complete only when the public deployment visibly starts at My workspace, the listed functional destinations work, unfinished destinations are honest and useful, and the Economics learning loop still works without regression.
