# Learning Loop Architecture Decisions

Status: Phase 0/Phase 1 planning contracts; no live AI, MCP, or Gemma integration in the first UI vertical slice.

Integration adapters follow the shared permission, audit, replacement, and
teacher-comprehensibility contract in
[Integration Boundaries](INTEGRATION_BOUNDARIES.md). No adapter may widen the
domain services below.

## ADR-006 — Profile-linked People projection without production identity

Decision: keep profile records distinct from workspace membership records.
Membership remains the authority for an actor's organisation/course role;
profiles provide the minimum display identity needed by People, attendance,
submissions, and grades. The local prototype persists a separately versioned,
strictly validated fictional profile snapshot.

- Teacher and authorised school-role projections may view a course roster;
  student projection returns only the actor's own course profile.
- An assigned teacher may create a course-scoped pending student or teaching
  assistant membership. They cannot grant organisation roles or add members to
  another course.
- Local Add people captures a fictional display name and role only. It does not
  create credentials, send an invite, or generate a real activation secret.
- Production activation remains roster -> private single-use code -> name
  confirmation -> learner-chosen credentials. Teachers never set or see
  passwords; recovery is verified in person and issues a fresh code.
- Unknown profile fields fail closed and role projections reconstruct an exact
  allowlist, preventing local/private metadata from crossing to students.

### Acceptance criteria

1. Every projected course person is linked by stable profile and workspace
   membership identity; display-only orphan rows are not accepted.
2. Teacher search/filter and pending-record creation work without email, phone,
   public registration, or a shared course code.
3. A student cannot enumerate another learner, teacher roster metadata, or Add
   people capabilities through route state or the People projection.
4. Persisted malformed, stale, duplicate, cross-organisation, or unknown-field
   profile data falls back safely and does not cross the UI boundary.
5. Attendance, submissions, and grades later reference profile plus course
   membership identity rather than copying a display name.

## ADR-007 — Announcements are audited release records, not generic pages

**Decision:** keep course announcements in a strict, versioned organisation snapshot and expose them only through course-scoped projections. Draft, scheduled, published, and archived are explicit lifecycle states. Audience is explicit (`all-course-members`, `students-only`, or `staff-only`), and editing a released notice returns the changed revision to draft until deliberate publication.

**Why:** communication content can reveal course activity or staff context. A generic page plus a visual "published" badge would not enforce recipient, timing, or revision boundaries. Domain projections make the student feed incapable of receiving drafts, staff-only content, archived content, or a schedule that has not reached its release instant.

**Prototype boundary:** storage is local and synthetic. No email, push notification, contact import, delivery receipt, or production enrolment is implemented. A later notification connector must consume an authorised release event through a replaceable, audited adapter; it cannot infer recipients from client UI state.

### Acceptance criteria

1. Only an assigned teacher or authorised organisation administrator can author
   or release a notice for a course.
2. Students receive only released course-member/student notices for their own
   active course relationship; draft, archived, staff-only, and future content
   is omitted rather than masked in the UI.
3. Editing a published notice creates an explicit private draft revision that
   requires another release action.
4. Strict persisted-state validation rejects unknown fields, malformed roles,
   invalid timestamps, duplicate identities, and stale schema versions.
5. Local authoring never claims external delivery, contacts recipients, or
   crosses a provider boundary.

## ADR-008 — Media metadata is separate from byte storage

**Decision:** model course media as strict, versioned metadata records while a
replaceable storage adapter owns file bytes. Validated HTTPS links and YouTube
IDs may move from draft to published. Browser-selected files use a deliberately
ephemeral local adapter: only allowlisted metadata persists and the record
cannot publish until a separately authorised durable storage adapter exists.

The local UI may create a same-session object URL for an image preview. That URL
is component state, is revoked on removal/unmount, and is never written to the
domain snapshot. Student projections reconstruct an allowlist and omit every
device-local record, file handle, local path, byte payload, provider ID, and
unknown field. YouTube embeds load only after a learner-triggered action.

### Acceptance criteria

1. Only HTTPS links and supported YouTube URL shapes enter the resource model;
   unsafe schemes and malformed video IDs fail validation.
2. Local file selection exposes an honest preview and metadata summary without
   storing bytes or claiming upload durability.
3. A device-local file cannot publish and never appears in a student
   projection; a persisted malformed published local record fails closed.
4. Editing published external media returns it to a private draft until another
   explicit publish action.
5. A future durable adapter can replace the local implementation without
   changing course, module, or student-safe projection contracts; server-side
   permission checks, scanning, quotas, retention, revocation, and audit remain
   mandatory before production use.

## ADR-005 — Workspace, course membership, and storage-adapter boundaries

Decision: expand the prototype around a versioned workspace aggregate rather
than placing more unrelated state in the existing single-course component.
Workspace services own the course catalogue and memberships; course services
own teaching content and operations; a separate storage adapter owns media
bytes. UI routes consume role-bound projections from these services.

- A workspace contains stable course references and membership relationships,
  not embedded credentials or raw person records.
- Course creation starts in `draft` and records immutable course ID, title,
  code, subject, term/section, owner membership, lifecycle, version, and audit.
- A person's ability to list or open a course comes from an active membership
  projection. Client-side route state cannot grant access to a course.
- The local prototype uses versioned browser persistence and fictional data;
  malformed, stale, or unknown records fail closed to a safe fixture.
- Announcements, media, pages, assessments, submissions, and grades remain
  distinct domain records even when a course screen composes them together.
- `MediaStorageAdapter` separates content metadata from binary storage. The
  local demo adapter may expose an ephemeral same-session preview but never
  persists bytes or claims durable upload.
- Student media projections use an explicit allowlist and omit local paths,
  file handles, object URLs, teacher notes, provider IDs, and unknown fields.
- A durable provider such as Supabase Storage or R2 is a later, separately
  authorised adapter. It must add tenant-scoped keys, signed access,
  server-side permission checks, file/type scanning, quotas, retention,
  deletion/revocation, audit, and secret management.

### Acceptance criteria

1. Workspace/course/membership IDs and audit fields validate deterministically;
   course create/select/archive-safe commands do not mutate their inputs.
2. Teacher, student, assistant, guardian, and administrator fixtures list only
   courses and signals their active relationships permit.
3. Unknown roles, cross-organisation relationships, malformed lifecycle state,
   duplicate IDs, invalid timestamps, and stale schema versions fail closed.
4. A local file draft cannot transition to a durable published student file.
5. Media metadata cloning/projection reconstructs an exact allowlist, strips
   private local fields, and never serialises browser file bytes.
6. Replacing the local storage adapter with a fake durable adapter requires no
   change to course, module, or learner-facing content schemas.

## ADR-004 — Course/module domain as the authoring foundation

Decision: represent a course shell, ordered modules, and module items as
versioned domain values before building the Module Composer UI. The domain
owns identity, ordering, release state, availability, prerequisites, and
completion rules; a future tenant-aware service will own persistence and
permission enforcement around these values.

- Course, module, and module-item IDs are immutable. Reordering changes only
  position; editing content creates a new revision and returns that item to
  `draft` until a teacher releases it again.
- Module items use the shared taxonomy needed by the composer:
  `learning-block`, `page`, `resource`, `video`, `assignment`, `quiz`, and
  `discussion`.
- Release state is explicit: `draft`, `scheduled`, `published`, `closed`,
  `hidden`, or terminal `archived`. Availability windows and prerequisite IDs
  are validated before a model is accepted.
- `moveModuleItem` is the domain equivalent of an accessible Move-To command;
  drag-and-drop UIs must call the same reorder contract.
- Teacher and student projections are separate views over the same model.
  Teacher projections include authoring/release capabilities and draft items;
  student projections include only currently published, available items and
  never expose teacher controls. This is a projection boundary, not production
  authentication; backend role enforcement remains a later service concern.
- Completion is evidence-based (`view`, `submit`, `manual`, or threshold
  `score`) and is not inferred from time spent, streaks, or attention.

### Domain acceptance criteria

1. Identity, revision, audit, lifecycle, and availability invariants fail
   closed with deterministic validation errors.
2. Reorder and Move-To preserve all IDs, return contiguous positions, and do
   not mutate the input collection.
3. Illegal release transitions and edits to archived items are rejected.
4. Prerequisite and completion contracts are typed and testable without a
   database, browser state, or external integration.
5. Teacher/student projections have explicit capabilities and cannot leak draft
   or hidden content into the student view.

## ADR-001 — Domain-first API with an authorised MCP adapter

Decision: build tenant-aware LMS domain services and APIs first. A later Model Context Protocol (MCP) server adapts those same services for authorised agents. It is never a database backdoor, alternate permission system, or route around human approval.

### Boundaries

- The core domain model and services are vendor-neutral; Codex and other authorised MCP clients use the same contracts.
- Every MCP request is bound to organisation/tenant, user or service principal, role/scopes, course scope, declared purpose, request ID, and audit event.
- Domain services perform authorisation and policy checks. The MCP layer may narrow access further but may never widen it.
- Responses minimise student and staff data for the stated purpose. An agent connection does not make student data portable outside the authorised tenant/course scope.
- Support rate limits, per-principal quotas, revocation, key/session rotation, and an auditable deny-by-default policy.
- Treat user-authored instructions, resource text, submissions, URLs, and embedded documents as untrusted content. They may supply learning context but may not grant permissions or override tool policy.

### MCP primitives

Use typed, versioned resources, prompts, and tools with stable IDs, explicit schemas, purpose descriptions, error models, pagination, and deprecation policy.

Safe read resources may expose, when the caller is authorised:

- organisation/course metadata appropriate to scope;
- question-bank item schemas and permitted content;
- activity and graph-scenario schemas/configurations;
- learning progress, response evidence, and aggregate analytics appropriate to the caller;
- review status, provenance, and audit-safe metadata.

Graduated capability tiers:

1. **Read/search** — list and inspect scoped resources with minimised fields.
2. **Create draft** — produce a draft question, activity, resource summary, or declarative graph scenario; never publish.
3. **Validate/preview** — run schema, copyright/provenance, accessibility, graph-geometry, and content-policy checks; return a non-published preview.
4. **Request human review** — route a validated draft to a named authorised reviewer with provenance and diff.
5. **Material actions** — publish, grade, enrol, invite, or change attendance only through separately scoped, audited, approval-gated workflows with explicit human confirmation at the material action boundary.

Forbidden by default:

- direct assessment publication by an agent;
- grade or attendance mutation without correct role/scope and explicit human confirmation;
- user invitation, enrolment, account activation, or recovery without correct scoped workflow and confirmation;
- private student-data export beyond authorised purpose/scope;
- arbitrary code execution or Python execution;
- direct database queries or unrestricted storage access;
- secrets, provider credentials, raw access tokens, or private keys in MCP resources.

### Contract fixtures for the first repository

The first vertical slice does not run an MCP server. Later platform work may begin only after domain API and permission contracts are validated. Planning fixtures should define:

- versioned resource and tool JSON Schemas;
- representative tenant/course/principal scope claims;
- allow/deny matrices for owner, organisation administrator, teacher, teaching assistant, student, and future guardian roles;
- draft → validate → preview → request-review → human-approved-publish state transitions;
- audit event shapes and correlation IDs;
- prompt-injection fixtures in user-authored questions, submissions, article text, and tool outputs;
- data-minimisation fixtures that verify field-level redaction by role and purpose;
- rate-limit, quota, revocation, expired-scope, cross-tenant, and replay failure cases.

### Technical acceptance criteria

1. MCP handlers call public application/domain services; static analysis and integration tests fail any handler importing database repositories or raw database clients directly.
2. Every resource/tool schema is versioned and rejects unknown or invalid material fields before domain execution.
3. Every call requires tenant, principal, course/purpose scope where applicable, and produces an immutable audit event for allow and deny outcomes.
4. Cross-tenant, wrong-course, revoked-principal, expired-scope, and privilege-escalation fixtures are denied without returning sensitive existence signals.
5. Read responses are field-minimised for the caller and purpose; snapshot tests cover teacher, assistant, student, and administrator differences.
6. Draft tools cannot transition content to published state. Publish/grade/enrol/attendance tools require distinct scopes plus explicit human-confirmation tokens tied to the exact pending action and expiry.
7. User-authored content is isolated as untrusted data; injection fixtures cannot alter tool selection, scope, approval requirements, or system instructions.
8. Rate limits, user/course quotas, idempotency keys, replay protection, revocation, and audit correlation are tested.
9. MCP resources never include application/provider secrets, raw credentials, or database connection information.
10. The core domain and schemas contain no dependency on a specific model vendor or agent client.

## ADR-002 — Optional and transparent AI assistance

Decision: AI assistance is optional, clearly labelled, and bounded to the authorised task. No user must rely on AI to complete or review the core learning loop.

- AI-generated learning content remains a draft until schema/content validation and named human review.
- The UI identifies when a draft or suggestion is AI-assisted, shows provenance where relevant, and makes the human decision owner clear.
- Connecting an agent never broadens data access, retention, or transfer. Student information stays within tenant/course/purpose policy.
- No autonomous high-stakes grading, attendance, enrolment, discipline, or student profiling.
- The first coded vertical slice contains no live model provider, AI assistant, or simulated AI output.

## ADR-003 — Vendor-neutral server-side AI jobs with Gemma provider options

Decision: future web and Flutter clients submit authorised AI work to an LMS backend AI-job service. That service calls a vendor-neutral provider adapter which may use either a hosted Gemma 4 route through Google’s Gemini API, after explicit provider/account/key/budget approval, or a later privately hosted Gemma inference service. Neither route is implemented in the first vertical slice.

```text
Web / Flutter
    → LMS backend AI-job service
        → hosted Gemma provider adapter (Gemini API)
        OR
        → private Gemma inference adapter
```

The provider model family, endpoint, deployment, and response shape must not leak into the core LMS domain or client contract.

### Request flow

1. An authorised user requests an optional AI-assisted draft from the LMS UI or a separately scoped MCP tool.
2. The backend authorises tenant, principal, role, action, course/object, and declared purpose.
3. The backend selects only approved source objects, minimises/redacts input, rejects disallowed data, validates size/content policy, and applies feature flag plus organisation/class/user quotas.
4. A user-visible confirmation identifies that AI is optional, the provider route/category, the data to be sent, draft-only status, retention policy, and budget/cost boundary.
5. Only after explicit confirmation and an owner-configured manual budget cap does the asynchronous AI-job service invoke the selected adapter.
6. The backend validates output schema/content, stores provenance/audit metadata, and returns an AI-labelled draft for named teacher review. No provider output directly publishes, grades, enrols, marks attendance, or triggers a material action.

### Secrets and deployment

- Provider credentials exist only in deployment secret management/environment available to the backend adapter.
- No student or teacher supplies an ordinary-use provider key. No provider secret may appear in web/Flutter code, browser/mobile storage, logs, Git, screenshots, analytics, error payloads, or MCP resources.
- Hosted use begins only after the user explicitly authorises the provider account/key and manual budget cap.
- Private hosting avoids a hosted-provider key, but requires provisioned hardware/accelerators, capacity planning, scaling, latency targets, monitoring, abuse controls, model/runtime patching, security updates, backups, and incident ownership.
- Neither hosted nor self-hosted inference is described as automatically free. Both have infrastructure, operations, usage, or account costs.

### Premium entitlement boundary

- Gemma 4 AI assistance is a paid premium entitlement checked at organisation/plan level before context retrieval or job creation.
- Use explicit server-side feature flags plus entitlement records. Clients may display entitlement state but may not grant it.
- Support school-level and/or per-seat allowances, with organisation, class/course, user, and time-window quotas enforced by the backend.
- Keep entitlement checks separate from provider choice so a hosted/private route can be replaced without changing plan semantics.
- Define stable states: `not_entitled`, `entitled_disabled`, `entitled_available`, `quota_exhausted`, `budget_paused`, and `provider_unavailable`.
- The first vertical slice implements no billing, checkout, subscription, seat assignment, or upgrade flow. Contracts must remain upgrade-safe so later billing changes entitlements through a dedicated service rather than coupling payment code to learning or AI jobs.
- Never imply that a missing entitlement can be bypassed with a student/teacher provider key.

### Data boundary

- Do not send grades, attendance, private student submissions, student identifiers, or other personal data by default.
- Any exception requires an explicit data-policy/consent decision, documented purpose, minimisation review, retention rule, tenant approval, and data-protection review before implementation.
- Inputs and outputs remain tenant/course/object scoped. Provider use does not expand who may read them.
- Store only necessary AI-job evidence and use configured deletion/retention.

### Authorised contextual retrieval

Gemma never receives indiscriminate access to student data, all tenant files, rendered screens, or browser state. Build an authorised contextual retrieval layer over indexed LMS content and domain APIs; do not screen-scrape.

For every request, the backend must:

1. Resolve actor/service principal, role, organisation, course/class, object, relationship to any student, requested resource types, and declared purpose.
2. Verify premium entitlement, feature flag, actor/course relationship, consent or other recorded data-policy basis, and object-level access.
3. Query only indexed LMS resources the actor could already access for that purpose.
4. Re-check current ACLs at retrieval time, filter by tenant/course/object, apply field-level redaction and least-privilege context limits, and discard unauthorized candidates before prompt assembly.
5. Record source IDs, ACL/policy versions, redaction decisions, context digest, purpose, and provenance in the AI job.
6. Submit only the bounded context to the provider and require output citations to the LMS source IDs used.
7. Instruct and validate that output states when evidence is missing and does not infer or reveal information beyond authorised sources.

Role defaults:

- teachers: assigned classes/courses and resources/submissions they are authorised to review;
- students: their own work, feedback, progress, and course resources available to them;
- parents/guardians: linked children and only summaries/resources approved for guardian access;
- organisation administrators: data within their scoped organisation and administrative purpose, not automatic access to every private submission;
- platform owners/service principals: only the explicitly approved operational scope and purpose, with enhanced audit.

Sensitive actions—grades, attendance, enrolment, publication, user invitation, permission changes, or file sharing—remain typed, scoped, confirmation-required, and audited. Retrieval authority never grants mutation authority.

Indexing requirements:

- encrypt indexes and metadata at rest/in transit, tenant-partition or enforce equivalent isolation, and never index provider secrets;
- attach source ACL/policy/version metadata to every chunk or record;
- apply ACL filters before semantic results are returned to prompt assembly, not only after generation;
- propagate access changes, course removal, relationship changes, deletion, and revocation promptly; stale/unknown ACL state fails closed;
- support reindex/delete by source and tenant plus auditable retention;
- no active ingestion, embedding pipeline, or Gemini/Gemma call is added to the first UI slice.

Persist auditable AI-job metadata:

- tenant/course/object, requester/principal, role/scopes, action/purpose, confirmation, feature/policy version, request/correlation and idempotency IDs;
- approved source IDs, provenance, redaction/minimisation result, input digest, provider route/model/deployment version, and provider job ID where available;
- status history, schema/content validation, reviewer, review decision, resulting draft/version, and linked audit events;
- token/compute/usage or cost fields available from the route, latency, retries, quota/budget decision, failure category, and retention/deletion timestamps.

### MCP/function-action boundary

- AI may propose an MCP or function action only as typed candidate data.
- The LMS backend validates the action schema, resolves the caller, re-authorises tenant/role/scope/action/object at execution time, applies idempotency/rate/budget policy, and obtains explicit human confirmation for material actions.
- Model output never executes arbitrary code, queries a database directly, changes permissions, or receives raw provider/application credentials.
- The same domain service and audit path is used whether a request originates from web, Flutter, MCP, or an internal job.

### Technical acceptance criteria

1. Web/Flutter clients know only the LMS AI-job contract; provider names, credentials, endpoints, and vendor response types are absent from client bundles and domain interfaces.
2. Provider calls can originate only from the backend job service after tenant/principal/role/action/object/purpose, data minimisation, feature flag, quota, manual budget, and explicit-confirmation checks pass.
3. Provider adapters implement one internal interface and are exercised through fake hosted and private adapters; switching adapters does not change domain job state or teacher-review UX.
4. Hosted-provider fixtures require an explicitly configured account/key and budget cap. Missing/expired key, disabled feature, quota exhaustion, or budget exhaustion fails safely and visibly without automatic purchase or recharge.
5. Private-host fixtures cover capacity unavailable, queue saturation, timeout, model/runtime version, health monitoring, and patch-required states; documentation states operational ownership and costs.
6. Student-data and disallowed-field fixtures are rejected or redacted before provider invocation, with safe audit evidence that does not repeat the blocked values.
7. Jobs are asynchronous, idempotent, tenant-scoped, auditable, retry-safe, cancellable where supported, and retain provenance, output, cost/usage, latency, and review metadata.
8. All AI output is labelled draft, schema/content validated, and requires a named teacher reviewer before reuse or publication.
9. AI-proposed MCP/function actions cannot execute until the backend validates the typed action and re-authorises the exact caller/scope/object; arbitrary code and direct database access are impossible through the provider boundary.
10. Secret scans cover Git, built web/Flutter artifacts, browser/mobile storage mocks, logs, screenshots, analytics fixtures, error payloads, and MCP resources.
11. Entitlement tests deny job/context creation for `not_entitled`, disabled, quota-exhausted, budget-paused, and provider-unavailable states; client flags alone cannot enable access.
12. Upgrade-safe contract tests change plan/seat/school entitlements without changing learning records, provider adapters, or historical AI-job provenance; no billing implementation exists in the vertical slice.
13. Retrieval fixtures enforce teacher-assigned-class, student-own-work, guardian-linked-approved-summary, and administrator-scoped-organisation rules at resource and field level.
14. Cross-tenant, wrong-course, unrelated-student, revoked-access, deleted-file, stale-index, and missing-consent/policy fixtures return no context and fail without revealing resource existence.
15. Retrieval output records source IDs/versions, ACL/policy version, redactions, purpose, and context digest; generated drafts cite permitted LMS sources and explicitly flag missing evidence.
16. Index permission changes and revocations invalidate or filter affected records before the next retrieval; tests prove unauthorized chunks cannot reach prompt assembly.
17. AI context comes only from authorised domain retrieval/index services. Tests reject screen scraping, arbitrary file-system access, blanket tenant exports, or direct database access.
