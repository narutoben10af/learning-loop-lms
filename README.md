# Learning Loop LMS

[![CI](https://github.com/narutoben10af/learning-loop-lms/actions/workflows/ci.yml/badge.svg)](https://github.com/narutoben10af/learning-loop-lms/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

Learning Loop is an experimental, learning-first LMS pilot for one Economics class. Its first vertical slice connects a student's prediction, constrained graph interaction, explanation, and reflection to a teacher's view of the same evidence and a human marking loop.

> **Prototype warning:** this repository is not production ready. It currently uses synthetic demo data and local browser storage. It does not provide production authentication, tenant isolation, secure enrolment, server persistence, or a student-data processing agreement.

## Current scope

- Responsive web prototype using original, synthetic Economics content.
- A reusable, declarative Economics graph renderer, initially exercised with a supply-shift scenario.
- Equivalent pointer, keyboard, button, and table-based interactions.
- Separate student activity and teacher evidence/marking experiences. A clearly labelled preview switch exists only for author/demo QA.
- Minimal private mastery evidence tied to demonstrated outcomes, not time, streaks, or public ranking.

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
  -> typed activity and graph domain state
  -> local prototype persistence

later: web / Flutter
  -> tenant-aware LMS domain API
     -> authorised persistence and audit
     -> optional MCP adapter (never direct database access)
     -> optional premium AI-job service (draft-only provider adapters)
```

See [architecture decisions](docs/ARCHITECTURE_DECISIONS.md), the [approved UX contract](docs/ECONOMICS_VERTICAL_SLICE_UX_BRIEF.md), the [teacher authoring/operations track](docs/TEACHER_AUTHORING_OPERATIONS.md), and the [PR delivery register](docs/PR_PLAN.md).

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

## Privacy and security

Do not enter real student information into the prototype. The pilot requires no student email or phone number. Future activation uses private, single-use student codes created from a teacher-managed roster; teachers never set or see passwords. Read [privacy and data boundaries](docs/PRIVACY_AND_DATA_BOUNDARIES.md) and [security reporting](SECURITY.md) before contributing.

## Roadmap

Delivery is deliberately split into small PRs: repository foundation; demo shell and learning loop; reusable Economics graph renderer; question-bank core; submission and human marking; then backend roles, enrolment, teacher authoring/operations, and later integrations. AI/MCP contracts follow validated permissions and domain APIs. The later Teach-back Lab remains discovery work until the core learning loop is validated.

## Contributing and licence

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Original contributions are licensed under [Apache License 2.0](LICENSE). Apache-2.0 was selected for permissive reuse with an explicit patent grant; this is a project choice, not legal advice. Do not copy Canvas code or other AGPL/copyrighted assessment content.
