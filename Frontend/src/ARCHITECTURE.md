# Frontend Structure (Production Baseline)

This project follows a **feature-first** structure with shared UI and app-wide services.

## Top-Level

- `src/components/`: Reusable UI/shared layout used across multiple features.
- `src/features/`: Domain modules (analytics, chat, task, invoice, etc.).
- `src/pages/`: Route-level pages (entry screens for each module).
- `src/services/`: App-wide API clients and token/auth infrastructure.
- `src/redux/`: Global state slices and store setup.
- `src/hooks/`: Cross-feature hooks.
- `src/assets/`: Static images/icons.
- `src/config/`: Static app config.
- `src/utils/`: Small generic utilities only.

## Feature Module Pattern

Inside each `src/features/<module>/`:

- `components/`: UI pieces specific to that module.
- `hooks/`: Module-specific state/data hooks.
- `services/`: Module API/service wrappers.
- `utils/`: Module helper functions.

Example:

`src/features/task/components`
`src/features/task/hooks`
`src/features/task/services`

## Page Pattern

- Keep route orchestration in `src/pages/**`.
- Move reusable logic/UI from pages to `src/features/**` or `src/components/**`.
- Pages should stay thin: fetch + compose + route actions.

## Naming Rules

- Components: `PascalCase.jsx` (example: `TaskQuickView.jsx`).
- Hooks: `camelCase` with `use` prefix (example: `useTaskData.js`).
- Services: `<domain>Service.js` (example: `taskService.js`).
- Avoid ambiguous file names (`temp`, `new1`, `test2`, etc.).

## Import Rules

- Prefer alias imports: `@/features/...`, `@/components/...`.
- Avoid deep relative chains like `../../../../`.
- Keep one source of truth for API/token services in `src/services/`.

## Cleanup Policy

- Remove dead files/components not used by routes or imports.
- Remove duplicate utility/service implementations.
- Keep lint/build clean before merging.
