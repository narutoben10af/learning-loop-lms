# Learning Loop LMS

[![CI](https://github.com/narutoben10af/learning-loop-lms/actions/workflows/ci.yml/badge.svg)](https://github.com/narutoben10af/learning-loop-lms/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

[Open the public synthetic-data prototype](https://narutoben10af.github.io/learning-loop-lms/).

Learning Loop is an experimental, learning-first LMS growing from one validated Economics learning loop into a practical course workspace. The current public build connects a student's prediction, constrained graph interaction, explanation, and reflection to a teacher's authoring and marking view; the active reset now adds the course dashboard, role-aware course shell, roster, announcements, and media foundation expected of a recognisable LMS.

> **Prototype warning:** this repository is not production ready. It currently uses synthetic demo data and local browser storage. It does not provide production authentication, tenant isolation, secure enrolment, server persistence, or a student-data processing agreement.

## Current scope

- Responsive web prototype using original, synthetic Economics content.
- A reusable, declarative Economics graph renderer, initially exercised with a supply-shift scenario.
- An accurately labelled predefined **Supply and demand explorer** template. Its title/supporting text are editable today; the non-AI declarative template builder is a planned focused slice, not a fake live control.
- Equivalent pointer, keyboard, button, and table-based interactions.
- Separate student activity and teacher evidence/marking experiences. A clearly labelled preview switch exists only for author/demo QA.
- A role-projected **My workspace** course dashboard with teacher course creation/selection and a clean student course list. New courses begin as private local drafts.
- An original responsive course workspace with stable role-aware navigation, a teaching-action Home, integrated Modules authoring/student learning, and truthful scoped states for course operations still to come.
- A functional synthetic People surface with profile-linked course memberships, teacher roster search/filter, local pending-record creation without email, and a private student self-projection.
- A functional local Announcements surface with explicit audience, draft/scheduled/published/archive states, deliberate release, and a student feed that excludes private or future notices.
- A teacher-only Module Composer with contextual editing for pages, learning blocks, resources, videos, and honest draft-only assessment handoffs.
- Minimal private mastery evidence tied to demonstrated outcomes, not time, streaks, or public ranking.

The current build starts at **My workspace**, supports local multi-course creation/selection, and opens each selected course into a recognisable Home/Modules/People/Announcements workspace. It is still not a complete LMS: Files/media is the next functional shell slice, while the remaining named course areas disclose their current limits. See the [canonical master product plan](docs/MASTER_PRODUCT_PLAN.md) for the honest gap assessment, information architecture, and phase boundaries.

Not included: payments, live AI or model-provider calls, a live MCP server, native Flutter apps, Canvas integration, parent access, attendance, public registration, remote proctoring, Python execution, or copied exam content.

## Product principles

1. Students and teachers are co-equal participants in a learning loop.
2. Interactions must serve a learning purpose, return feedback, save state, work responsively, and have a keyboard/non-drag equivalent.
3. Production permissions are enforced server-side. Client-side preview state is never authorization.
4. Collect the minimum disclosed learning evidence; engagement is not proof of attention or comprehension.
5. Future AI output is optional, transparent, draft-only, schema-validated, and reviewed by a named human.

## Architecture

The first slice is a TypeScript web application with local synthetic state. Later phases add tenant-aware domain services and backend-enforced permissions before production identity, agent adapters, or integrations.

```text
responsive web UI
  -> role-projected workspace/course catalogue
  -> typed course, module, activity and graph domain state
  -> versioned local prototype persistence

later: web / Flutter
  -> tenant-aware LMS domain API
     -> authorised persistence and audit
     -> optional MCP adapter (never direct database access)
     -> optional premium AI-job service (draft-only provider adapters)
```

See the [master product plan](docs/MASTER_PRODUCT_PLAN.md), [architecture decisions](docs/ARCHITECTURE_DECISIONS.md), [integration boundaries](docs/INTEGRATION_BOUNDARIES.md), [interactive template authoring contract](docs/INTERACTIVE_TEMPLATE_CONTRACT.md), the [approved Economics UX contract](docs/ECONOMICS_VERTICAL_SLICE_UX_BRIEF.md), the [teacher authoring/operations track](docs/TEACHER_AUTHORING_OPERATIONS.md), the [current Module Composer authoring slice](docs/AUTHORING.md), and the [PR delivery register](docs/PR_PLAN.md).

## Local setup

Requirements: Node.js 22 LTS and npm 10+.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. Quality commands:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

The public demo is a static build deployed from a green `main` commit through GitHub Pages. It has the same prototype warning and local-only synthetic state as the local build; deployment does not add authentication, a backend, or cloud persistence.

## Privacy and security

Do not enter real student information into the prototype. The pilot requires no student email or phone number. Future activation uses private, single-use student codes created from a teacher-managed roster; teachers never set or see passwords. Read [privacy and data boundaries](docs/PRIVACY_AND_DATA_BOUNDARIES.md) and [security reporting](SECURITY.md) before contributing.

## Roadmap

Delivery is deliberately split into small PRs. The active milestone is now the real LMS shell: workspace/course domain, course dashboard and creation, course overview/navigation, People, Announcements, Files/media, and integration of the existing Modules/Economics work. Self-service interactive templates, organisation-level question bank and assessments, detailed marking, a real Gradebook, safe course rollover, roster/attendance, and communications follow as focused slices. Production auth/storage, plugins, analytics, mobile, parents, MCP, and premium AI remain later phases after permissions and domain APIs are validated.

## Contributing and licence

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Original contributions are licensed under [Apache License 2.0](LICENSE). Apache-2.0 was selected for permissive reuse with an explicit patent grant; this is a project choice, not legal advice. Do not copy Canvas code or other AGPL/copyrighted assessment content.
