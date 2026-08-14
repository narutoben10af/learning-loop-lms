# Pull Request Delivery Plan

Status: approved and in delivery. The public repository is active; each completed, checked PR is merged into `main` through the workflow below.

Delivery objective: establish a disciplined public foundation, ship the runnable Economics learning-loop prototype, then extend the learning loop with a named teacher authoring, marking, and gradebook sequence informed by observed workflow needs but independently designed.

## Delivery policy

- Public repository: `learning-loop-lms`.
- Default branch `main` is protected from direct pushes. Completed, documented, reviewed PRs with all required checks passing are normally squash-merged into `main`; merged PRs are the required delivery path.
- Work uses short-lived feature branches and small, single-purpose pull requests.
- Prefer squash merge with conventional commit titles (`feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`).
- Every PR states scope, explicit non-goals, linked acceptance criteria, tests run, documentation/update notes, privacy/security impact, screenshots for UI work, and a review/merge checklist.
- Required checks must pass before merge. Reviews and required approvals are configured when repository ownership/collaborators are known.
- After each approved PR merges into `main`, dependent feature branches update from the new `main` before continuing. Do not accumulate completed work on long-lived unmerged branches.
- Do not copy or derive from Canvas source. Use original content, code, branding, and trade dress.

## Planned PR register

| Order | Planned branch / PR                                                                                     | Scope                                                                                                                                                                                       | Depends on                                 | Status           | Acceptance gate                                                                                                  |
| ----: | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------- |
|     0 | [`foundation/repository-governance` — PR #1](https://github.com/narutoben10af/learning-loop-lms/pull/1) | Public repo metadata, README, Apache-2.0 license, contributing/conduct/security/privacy docs, architecture docs, PR templates, initial TypeScript web toolchain, stable CI, branch settings | Corrected visual approval                  | Merged `2ed2bc5` | Repository public; checks green; `main` protected; no product feature breadth                                    |
|     1 | [`feat/economics-learning-loop` — PR #5](https://github.com/narutoben10af/learning-loop-lms/pull/5)     | Responsive activity shell, author-only **Preview as** control, synthetic persisted state, student journey, teacher evidence/marking view                                                    | PR 0                                       | Merged `b832c22` | Production roles separated; prediction/explanation/reflection loop; persistence and accessibility tests          |
|     2 | [`feat/data-driven-economics-graph` — PR #6](https://github.com/narutoben10af/learning-loop-lms/pull/6) | Reusable declarative graph schema, measured layout/scales/ticks/collision engine, e-bike scenario, constrained pointer/keyboard/native controls                                             | PR 1                                       | Merged `41cf3cd` | Graph acceptance criteria 23–29; responsive visual and geometry tests                                            |
|    2a | [`ci/public-prototype-pages` — PR #7](https://github.com/narutoben10af/learning-loop-lms/pull/7)        | Static GitHub Pages deployment from a green `main` commit, repository-path build configuration, public-demo/privacy documentation                                                           | PR 2                                       | Review / checks  | No secrets/backend/analytics; correct asset base; deployed smoke check; prototype warning remains visible        |
|     3 | `feat/course-module-domain`                                                                             | Course/module/item schemas, ordering, lifecycle/version state, availability, prerequisites, completion rules and audit contracts                                                            | PR 0, PR 2                                 | Planned          | Immutable IDs; versioned content; clear draft/scheduled/published/closed/hidden state; permission-ready services |
|     4 | `feat/module-composer`                                                                                  | Inline add/edit/reorder, templates/duplicate week, batch schedule/publish, search, advanced panel and direct student-preview/submission links                                               | PR 3                                       | Planned          | Keyboard Move To parity; conflict checks; laptop/phone flow; independently designed UI                           |
|     5 | `feat/assessment-question-bank-core`                                                                    | Versioned question schemas plus canonical assessment identity, parts/attempts, taxonomy, grading-group projection, draft/validate/release checklist                                         | PR 2–4                                     | Planned          | No duplicate/temporary grade columns; preview isolated; original content; lifecycle/search fixtures              |
|     6 | `feat/submissions-marking-gradebook`                                                                    | Filtered needs-marking queue, learner/question navigation, rubric/status/comment context, autosave, safe release/notify, gradebook filters/columns/history                                  | PR 1, PR 5                                 | Planned          | Human marking; draft-safe navigation; distinct statuses; scoped bulk undo/audit; one clear marking entry         |
|     7 | `feat/roster-attendance`                                                                                | Teacher-created roster, future activation boundary, lesson sessions, mark-all-present then exceptions, audit                                                                                | PR 3, backend permission design            | Planned          | No public/shared identity code; present/late/absent/excused/remote; no GPS/biometrics                            |
|     8 | `feat/communications-resources`                                                                         | Course announcements/messages, authorised article/video resources, disclosed engagement contracts and retention controls                                                                    | PR 3, privacy review                       | Planned          | No hidden surveillance; engagement not comprehension; external browsing not captured                             |
|     9 | `feat/auth-and-roles`                                                                                   | Production activation-code onboarding and backend role/tenant enforcement when backend phase is authorised                                                                                  | Domain/API decision                        | Roadmap          | Student/teacher/assistant/guardian/admin/platform permissions separated; password/privacy tests                  |
|    10 | `feat/plugin-integration-boundary`                                                                      | Typed capability contracts for external video, collaboration, accessibility, badges and other plugins without first-party clones                                                            | Validated domain APIs/permissions          | Roadmap          | Least privilege; tenant feature flags; revocation/audit; no provider keys in clients                             |
|    11 | `feat/analytics-contracts`                                                                              | Learning evidence and workload analytics over authorised domain data                                                                                                                        | PR 6–9                                     | Roadmap          | Role-scoped/minimised; no attention claims or public ranking                                                     |
|    12 | `feat/mcp-contract-fixtures`                                                                            | Typed/versioned MCP resources/tools, scope/approval/audit/injection fixtures; no live server                                                                                                | Validated domain APIs/permissions          | Roadmap          | ADR-001 criteria; no DB backdoor or direct material actions                                                      |
|    13 | `feat/ai-job-contracts`                                                                                 | Premium entitlement, authorised retrieval, fake hosted/private Gemma adapters, job/provenance/budget fixtures; no live provider                                                             | Permissions, policy, entitlement decisions | Roadmap          | ADR-003 criteria; no live model, keys, ingestion, or student-data transfer                                       |
|    14 | `discovery/teach-back-lab`                                                                              | Post-validation product discovery and safety/rubric prototypes only                                                                                                                         | Core loop validated                        | Roadmap          | Transparent simulated learner, teacher review, no claim of understanding                                         |

Update this register when a branch/PR is created: add PR link, owner, actual dependencies, check status, review status, merge SHA, and follow-up issues.

## Foundation PR contents

Foundation files approved for delivery:

- `README.md`: pilot scope/non-goals, architecture, exact setup, scripts, roadmap, privacy boundary, prototype warning, license decision, badges.
- `LICENSE`: recommend Apache License 2.0 for permissive reuse plus an explicit patent grant; this is a project recommendation, not legal advice.
- `CONTRIBUTING.md`: branch/commit/PR/test/documentation rules and original-content/copyright policy.
- `CODE_OF_CONDUCT.md`: concise contributor behavior and reporting route.
- `SECURITY.md`: private vulnerability reporting approach, supported versions, student-data escalation.
- `docs/PR_PLAN.md`, UX/design/architecture decisions, and a development/validation guide.
- `.github/pull_request_template.md`, issue templates, ownership/reviewer notes where maintainers are known.
- `.github/workflows/ci.yml`: pull requests and `main`; clean install, formatting check, lint, typecheck, unit tests, and build.
- Toolchain configuration and a small deterministic test baseline sufficient to prove CI, without product feature breadth.

## CI and protection baseline

After the web toolchain is selected, use pinned Node LTS and lockfile-backed `npm ci`, then run repository scripts in this order:

1. `format:check`
2. `lint`
3. `typecheck`
4. `test` in non-watch mode with deterministic fixtures
5. `build`

The required branch-protection check should have a stable name such as `CI / quality`. Protection blocks direct pushes and failing/unreviewed changes, while explicitly allowing approved passing PRs to merge into `main`. Cancel superseded runs for the same PR. Cache only the package-manager download cache, not `node_modules` or generated build output.

Reliable, low-scope security baseline:

- enable GitHub secret scanning and push protection when available for the public repository;
- add weekly Dependabot configuration after the manifest exists;
- add CodeQL for JavaScript/TypeScript after real source exists and the workflow is stable;
- avoid making noisy `npm audit` output a merge gate until severity policy and remediation ownership are agreed.

## PR checklist contract

- [ ] Single purpose and short-lived branch
- [ ] Scope and non-goals stated
- [ ] Acceptance criteria linked and met
- [ ] Format/lint/typecheck/unit/build checks green
- [ ] New behavior covered by proportionate tests
- [ ] UI checked at named desktop/mobile/zoom states with evidence
- [ ] Accessibility and keyboard/non-drag behavior checked where applicable
- [ ] Documentation, roadmap, and this register updated
- [ ] Student-data/privacy, security, copyright, and AI implications stated
- [ ] No secrets, private student data, copied exam content, or generated artifacts accidentally committed
- [ ] Conventional squash title and merge checklist complete
