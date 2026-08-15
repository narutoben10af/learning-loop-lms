# Integration Boundaries

Status: contract-ready roadmap; no live integrations in the public prototype

Learning Loop must connect to a school's wider ecosystem without turning the
course experience into a provider settings screen. Integrations are replaceable
adapters over authorised LMS application services. They do not receive direct
database access, silently expand a user's permissions, or become required for
the core learning loop.

## Shared integration contract

Every inbound or outbound adapter must bind:

- organisation/tenant and installed integration ID;
- user or service principal, role, scopes, and current revocation state;
- course/class and exact object IDs where applicable;
- declared action and purpose;
- allowlisted input/output schema and data classification;
- idempotency/correlation ID, rate limit, quota, and timeout;
- confirmation token for material actions;
- immutable allow/deny/result audit event and retention policy.

Adapters call public LMS domain/application services. They never query raw
tables, bypass the same permission checks used by the web app, or expose
provider credentials to web/Flutter clients, logs, screenshots, analytics, Git,
or MCP resources. Provider-specific IDs and payloads stay behind the adapter.

The teacher-facing integration panel must explain, in plain language: what the
tool can do, which courses and data it can access, whether information leaves
the LMS, who enabled it, cost/availability status, last successful action,
errors, and how to disable or revoke it. Installation or broader data sharing
requires an authorised administrator and any required school privacy review.

## Seam map

| Seam                         | Core LMS contract                                                                                                                 | Later adapter responsibility                                                                                              | Default safeguards                                                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| LTI / external tools         | Stable course, membership, content-link, assignment, launch-purpose, and result-service commands                                  | Standards-version negotiation, signed launches, deep linking, names/roles and results services when separately authorised | Per-install scopes; course allowlist; minimal claims; nonce/replay protection; no blanket roster or grade access                         |
| Interactive templates        | Registered template/schema versions, declarative activity versions, validation/preview/review/release and learner-safe projection | Replaceable renderer/editor plugins that consume typed parameters rather than arbitrary code                              | Works without AI; no client secrets or direct DB access; accessible-equivalent required; unknown fields/versions fail closed             |
| Media and YouTube            | Versioned resource/media record, learner-safe projection, description/caption, release state, disclosed engagement events         | URL/video validation, embed policy, player events, captions and provider availability                                     | `https:` only; no provider key in client; engagement is not attention/comprehension; no raw off-LMS browsing                             |
| File/object storage          | Media metadata, ownership, course/item linkage, lifecycle, access decision and storage-adapter interface                          | Upload, type/size checks, malware scanning, durable object ID, signed delivery, replacement, retention and deletion       | Tenant-scoped keys; no local path/file handle in projection; quotas; audit; revocation; secrets server-side                              |
| Calendar and schedule        | Course events, due/availability windows, timezone, audience, recurrence reference and conflict result                             | Calendar provider sync, subscription/export, webhook reconciliation and conflict handling                                 | Least-scope calendar access; explicit calendars; idempotent sync; visible source/last sync; safe disconnect                              |
| Video and collaboration      | Lesson/resource records, participant capability request and authorised join context                                               | Meeting/recording provider creation, join links, captions and recording retention                                         | Teacher/admin enablement; no automatic recording; recipient clarity; provider status and retention visible                               |
| Communication                | Announcement/discussion/message/notification intent, audience and release state                                                   | Email, push, SMS or collaboration-channel delivery and bounce/failure feedback                                            | Preview exact recipients; opt/policy checks; rate limits; no silent bulk send; content and delivery audits separated                     |
| SSO and identity             | Principal, organisation, membership, role, activation/recovery and session-policy services                                        | OIDC/SAML federation, directory mapping and lifecycle events after school approval                                        | No open registration; safe account linking; role mappings reviewed; just-in-time access fails closed; recovery stays controlled          |
| Grade passback/import/export | Canonical assessment, attempt, grade/status, release and audit services                                                           | Standards/provider mapping, import validation, reconciliation and export delivery                                         | Preview/dry run; immutable source/version; no duplicate columns; conflict report; confirmation and rollback where safe                   |
| Notifications                | Typed notification intent linked to the originating domain event                                                                  | Channel routing, templates, preferences, delivery/retry and provider feedback                                             | Domain action commits before delivery; duplicate suppression; recipient/purpose checks; no secrets or private payload in logs            |
| Analytics                    | Authorised learning evidence, aggregation, metric definitions and retention                                                       | Warehouse/BI export or reporting adapter when approved                                                                    | Field minimisation; tenant/course/role scope; no attention claims, public ranking or raw browsing; deletion/revocation propagation       |
| AI and MCP                   | Authorised contextual retrieval, draft/validate/review services and typed material-action commands                                | Model-provider jobs or MCP transport over the same services                                                               | Premium entitlement for AI; no direct DB/code execution; source citations; human-reviewed drafts; material actions confirmed and audited |

## Install and capability lifecycle

An integration moves through explicit states:

1. `available` — supported by the platform but not installed;
2. `requested` — an authorised user has proposed course/organisation scope;
3. `policy-review` — terms, data classes, region, retention, cost, and owner are
   reviewed where required;
4. `enabled` — credentials exist server-side and the granted capabilities are
   visible;
5. `limited` — quota, provider, permission, or policy limits block some actions;
6. `disabled` — no new calls; retained mappings remain readable where policy
   requires;
7. `revoked` — credentials and grants are invalidated and queued work fails
   closed;
8. `removed` — provider linkage is removed after retention/export obligations.

Feature flags are not authorization. A client may display availability, but the
backend re-authorises every call and returns a teacher-comprehensible reason
when a capability is unavailable.

## Testing contract before any live adapter

- fake adapters prove provider replacement without changing course, content,
  assessment, grade, membership, or evidence schemas;
- allow/deny matrices cover platform owner, organisation administrator,
  teacher, teaching assistant, student, and guardian scopes;
- cross-tenant, wrong-course, revoked, expired, replayed, over-quota, malformed,
  unknown-field, provider-timeout, and partial-failure fixtures fail safely;
- import/passback fixtures detect duplicates, version conflicts, invalid
  identities and unexpected gradebook effects before mutation;
- notification and calendar retries remain idempotent;
- secret scans cover client bundles, logs, errors, screenshots, fixtures and MCP
  resources;
- disconnect/revocation tests prove cached permissions, indexes, webhooks and
  queued jobs cannot continue using stale access;
- teacher-facing previews show exact scope, data, recipient/provider, material
  effect, cost state, and required confirmation.

The public local prototype implements none of these external calls, provider
accounts, credentials, webhooks, imports, passback, or student-data exchange.
