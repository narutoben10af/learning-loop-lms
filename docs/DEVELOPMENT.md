# Development and Validation

## Supported toolchain

- Node.js 22 LTS
- npm 10+
- React, TypeScript, and Vite
- ESLint, Prettier, and Vitest

Use `npm ci` from the committed lockfile. Do not commit `node_modules`, `dist`, coverage output, secrets, or local browser state.

## Required checks

`npm run check` runs formatting, lint, type checking, deterministic unit tests, and a production build. CI runs the same commands on pull requests and `main` using Node 22.

For UI changes, also record manual evidence at desktop, 375px, 320px, keyboard-only navigation, and 200% text/zoom where relevant. Graph work must run geometry assertions for clipping/overlap plus multiple scenario fixtures; screenshots alone are insufficient.

## State and content

Keep immutable scenario definitions separate from learner state. All demo records and copy must be synthetic and original. A UI role preview must never be reused as a permission check.

## Public prototype deployment

GitHub Pages deploys only after the `CI` workflow succeeds on `main` (or a maintainer explicitly dispatches the deployment workflow). The build uses `VITE_BASE_PATH=/learning-loop-lms/` so assets resolve under the repository Pages path. Local development keeps `/` as its base.

The Pages site is a static evaluation surface, not a production environment. It must not receive real student data, secrets, provider keys, analytics scripts, backend credentials, or claims of production authentication/cloud persistence.
