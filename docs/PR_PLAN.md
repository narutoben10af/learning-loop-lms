# Pull Request Delivery Plan

Status: approved and in delivery. The public repository is active; each completed, checked PR is merged into `main` through the workflow below.

Delivery objective: preserve the validated Economics learning loop while turning the public prototype into a recognisable, original LMS. The immediate sequence delivers My workspace, multi-course creation/selection, a role-aware course shell, roster, announcements, safe local media, and Modules integration. Assessment, marking, gradebook, attendance, communications, and later production services then extend the same learning loop. The [master product plan](MASTER_PRODUCT_PLAN.md) is the canonical scope and phase boundary.

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

| Order | Planned branch / PR                                                                                            | Scope                                                                                                                                                                                            | Depends on                                 | Status           | Acceptance gate                                                                                                                            |
| ----: | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
|     0 | [`foundation/repository-governance` — PR #1](https://github.com/narutoben10af/learning-loop-lms/pull/1)        | Public repo metadata, README, Apache-2.0 license, contributing/conduct/security/privacy docs, architecture docs, PR templates, initial TypeScript web toolchain, stable CI, branch settings      | Corrected visual approval                  | Merged `2ed2bc5` | Repository public; checks green; `main` protected; no product feature breadth                                                              |
|     1 | [`feat/economics-learning-loop` — PR #5](https://github.com/narutoben10af/learning-loop-lms/pull/5)            | Responsive activity shell, author-only **Preview as** control, synthetic persisted state, student journey, teacher evidence/marking view                                                         | PR 0                                       | Merged `b832c22` | Production roles separated; prediction/explanation/reflection loop; persistence and accessibility tests                                    |
|     2 | [`feat/data-driven-economics-graph` — PR #6](https://github.com/narutoben10af/learning-loop-lms/pull/6)        | Reusable declarative graph schema, measured layout/scales/ticks/collision engine, e-bike scenario, constrained pointer/keyboard/native controls                                                  | PR 1                                       | Merged `41cf3cd` | Graph acceptance criteria 23–29; responsive visual and geometry tests                                                                      |
|    2a | [`ci/public-prototype-pages` — PR #7](https://github.com/narutoben10af/learning-loop-lms/pull/7)               | Static GitHub Pages deployment from a green `main` commit, repository-path build configuration, public-demo/privacy documentation                                                                | PR 2                                       | Merged `420a133` | No secrets/backend/analytics; correct asset base; deployed smoke check; prototype warning remains visible                                  |
|    2b | [`fix/economics-graph-handle-affordance` — PR #11](https://github.com/narutoben10af/learning-loop-lms/pull/11) | Follow-up visual polish: make curve adjustment handles unmistakable controls, preserve 44px targets, and verify the amber equilibrium point is the only market-result point                      | PR 6                                       | Merged `6b8a1cb` | No handle/equilibrium ambiguity at desktop/mobile; drag/keyboard/button/table equivalence remains intact                                   |
|     3 | [`feat/course-module-domain` — PR #9](https://github.com/narutoben10af/learning-loop-lms/pull/9)               | Course/module/item schemas, ordering, lifecycle/version state, availability, prerequisites, completion rules, teacher/student projections and audit contracts                                    | PR 0, PR 2                                 | Merged `8e136ba` | Immutable IDs; versioned content; clear draft/scheduled/published/closed/hidden state; permission-ready services                           |
|    3a | [`feat/course-home-module-composer-ui` — PR #10](https://github.com/narutoben10af/learning-loop-lms/pull/10)   | Visible student course home/modules with ordered items, release/availability/progress state and Economics launch; teacher-only Module Composer with add/edit/reorder/publish and student preview | PR 3                                       | Merged `acb53ed` | Role-separated surfaces; domain projection drives student visibility; keyboard Move-To parity; responsive/accessibility evidence           |
|     4 | [`feat/module-composer-authoring` — PR #13](https://github.com/narutoben10af/learning-loop-lms/pull/13)        | Usable contextual authoring: inline page/learning-block editing, validated resources and local metadata-only attachments, and explicit Assignment/Quiz draft handoffs without a live engine      | PR 3a                                      | Merged `ce3f0bc` | Add → edit → save → publish → student rendering; draft/republish boundary; 44px keyboard/mobile controls; no phantom gradebook release     |
|    4b | [`docs/lms-master-plan-reset` — PR #15](https://github.com/narutoben10af/learning-loop-lms/pull/15)            | Honest experience-gap statement, original LMS information architecture, Canvas-informed workflow notes, phased course-shell plan, role/domain/media/security boundaries                          | PR 4                                       | In review        | Canonical docs reconciled; immediate/core/later scope explicit; focused dependencies and acceptance gates review cleanly                   |
|     5 | `feat/workspace-course-domain`                                                                                 | Versioned workspace state, course identity/lifecycle, membership roles, create/select/archive-safe commands, projections, persistence migration                                                  | PR 15                                      | **Next**         | Multiple courses; immutable IDs; teacher/student course projections; malformed state fails safely; synthetic/local boundary                |
|     6 | `feat/workspace-course-dashboard`                                                                              | My workspace first screen, course cards/status, role-appropriate recent teaching signals, accessible Create Course and course selection                                                          | PR 5                                       | Planned          | Teacher can create/select/return; student sees no create/teacher signals; 320/375/desktop; no dead controls                                |
|     7 | `feat/course-workspace-shell`                                                                                  | Original course navigation and functional Home/Modules integration; honest scoped states for Assignments, Quizzes, Grades, Pages, Discussions, Calendar, Settings                                | PR 6, PR 4                                 | Planned          | Stable course context; role-aware navigation; unfinished spaces identify limits and useful next action; Economics launch preserved         |
|     8 | `feat/course-people-announcements`                                                                             | Synthetic course membership/role projections plus announcement draft/schedule/publish/archive flow and student-safe feed                                                                         | PR 5, PR 7                                 | Planned          | No production enrolment; draft/hidden notices never leak; authored state/version/audit tests; clear recipient scope                        |
|     9 | `feat/course-files-local-media`                                                                                | Course media library, validated link/YouTube embed, browser-local image/file draft metadata, preview/replace/remove, storage adapter contract                                                    | PR 5, PR 7                                 | Planned          | No bytes in localStorage; no fake durability; student projection strips local handles/paths/object URLs; future provider remains swappable |
|    10 | `feat/module-composer-depth`                                                                                   | Templates/duplicate week, batch schedule/publish, search, advanced panel and direct submissions/Gradebook links                                                                                  | PR 7–9                                     | Planned          | Keyboard Move-To parity; conflict checks; laptop/phone flow; independently designed UI                                                     |
|    11 | `feat/assessment-question-bank-core`                                                                           | Versioned question schemas plus canonical assessment identity, parts/attempts, taxonomy, grading-group projection, draft/validate/release checklist                                              | PR 7, PR 10                                | Planned          | No duplicate/temporary grade columns; preview isolated; original content; lifecycle/search fixtures                                        |
|    12 | `feat/submissions-marking-gradebook`                                                                           | Filtered needs-marking queue, learner/question navigation, rubric/status/comment context, autosave, safe release/notify, gradebook filters/columns/history                                       | PR 1, PR 11                                | Planned          | Human marking; draft-safe navigation; distinct statuses; scoped bulk undo/audit; one clear marking entry                                   |
|    13 | `feat/roster-attendance`                                                                                       | Teacher-created roster, private activation boundary, lesson sessions, mark-all-present then exceptions, audit                                                                                    | PR 8, backend permission design            | Planned          | No public/shared identity code; present/late/absent/excused/remote; no GPS/biometrics                                                      |
|    14 | `feat/communications-resources`                                                                                | Discussions/messages, authorised article/video resources, disclosed engagement contracts and retention controls                                                                                  | PR 8–9, privacy review                     | Planned          | No hidden surveillance; engagement not comprehension; external browsing not captured                                                       |
|    15 | `feat/auth-storage-and-roles`                                                                                  | Production activation-code onboarding, backend tenant/role enforcement, database and object-storage adapters after provider/policy authorisation                                                 | Validated domain APIs and security review  | Roadmap          | Roles separated server-side; secure storage/scanning/revocation; provider account/cost is separately authorised                            |
|    16 | `feat/plugin-integration-boundary`                                                                             | Typed capability contracts for external video, collaboration, accessibility, badges and other plugins without first-party clones                                                                 | Validated domain APIs/permissions          | Roadmap          | Least privilege; tenant feature flags; revocation/audit; no provider keys in clients                                                       |
|    17 | `feat/analytics-contracts`                                                                                     | Learning evidence and workload analytics over authorised domain data                                                                                                                             | PR 12–15                                   | Roadmap          | Role-scoped/minimised; no attention claims or public ranking                                                                               |
|    18 | `feat/mcp-contract-fixtures`                                                                                   | Typed/versioned MCP resources/tools, scope/approval/audit/injection fixtures; no live server                                                                                                     | Validated domain APIs/permissions          | Roadmap          | ADR-001 criteria; no DB backdoor or direct material actions                                                                                |
|    19 | `feat/ai-job-contracts`                                                                                        | Premium entitlement, authorised retrieval, fake hosted/private Gemma adapters, job/provenance/budget fixtures; no live provider                                                                  | Permissions, policy, entitlement decisions | Roadmap          | ADR-003 criteria; no live model, keys, ingestion, or student-data transfer                                                                 |
|    20 | `discovery/teach-back-lab`                                                                                     | Post-validation product discovery and safety/rubric prototypes only                                                                                                                              | Core loop validated                        | Roadmap          | Transparent simulated learner, teacher review, no claim of understanding                                                                   |

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
