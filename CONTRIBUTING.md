# Contributing

Thanks for helping build Learning Loop LMS. This public prototype is intentionally small and learning-first.

## Workflow

1. Create a short-lived branch from current `main`, such as `feat/graph-keyboard-controls`.
2. Keep the pull request single-purpose and use conventional commits.
3. Add or update tests and documentation with the behavior.
4. Run `npm run check` before pushing.
5. Complete the pull-request template, attach responsive screenshots for UI work, and wait for required checks.
6. Prefer a squash merge into `main`; do not push changes directly to `main`.

## Quality contract

- Preserve pointer, keyboard, and non-drag parity for interactive learning tasks.
- Test data-driven behavior, error/empty states, state restoration, and relevant viewport/zoom sizes.
- Treat the client-side preview switch as author/demo tooling, never authorization.
- Use only original or properly licensed content. Do not copy past papers, Canvas source, branding, or trade dress.
- Do not commit secrets, student data, production credentials, screenshots containing personal data, or provider keys.
- AI-generated material, if a future phase permits it, remains a draft until schema validation and named human review.

## Commits and PRs

Use concise conventional titles such as `feat: add constrained supply shifts` or `docs: clarify retention boundary`. State scope, non-goals, acceptance criteria, tests, documentation impact, privacy/security impact, and follow-ups in every PR.

By contributing, you agree that your contribution is licensed under Apache-2.0.
