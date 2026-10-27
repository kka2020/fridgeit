# FridgeIt

An Android-first Expo (SDK 57) app that tracks the food and meals you have, each with a
use-by date. It sends local expiry notifications and a "log your shopping" reminder.
It works offline, keeps all data on the device, and has no backend or accounts.

@AGENTS.md
@.specify/memory/constitution.md

## How we work (Spec Kit)

- No feature code without an approved `spec.md`, `plan.md` and `tasks.md` in `specs/<branch>/`.
- The current feature is the folder in `specs/` whose name matches the current git branch,
  e.g. `002-food-inventory`. Read its `spec.md`, `plan.md` and `tasks.md` before changing code.
- Loop: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-analyze` → `/speckit-implement`. Implement one task phase at a time and commit
  after each.
- Roadmap and feature status: `docs/roadmap.md`.
- Stack rationale: `docs/decisions/`. Don't reopen recorded decisions; propose a new ADR
  that supersedes them instead.

## Architecture

- `src/app/`: Expo Router screens and layouts only.
- `src/domain/`: pure TypeScript (expiry rules, `planNotifications`). No React, React
  Native or Expo imports.
- `src/data/`: SQLite repositories (`expo-sqlite` + Drizzle). Schema changes go through
  migrations only.
- `src/platform/`: adapters for notifications and updates, behind interfaces.
- Notifications are derived state: `reconcileNotifications()` rebuilds them from the
  database.

## Commands

- `npx expo install <pkg>`: add a dependency (never `npm install <pkg>`)
- `npx tsc --noEmit`: typecheck
- `npx expo lint`: lint
- `npm test`: tests (added in feature 001)
- `npx expo run:android`: local development build on the emulator or phone
- `$env:EXPO_UNSTABLE_MCP_SERVER=1; npx expo start`: dev server with the Expo MCP local
  tools (screenshots, taps, logs)

## Rules

- Run typecheck, lint and tests before saying a task is done.
- Ask before adding any dependency that isn't listed in the current feature's `plan.md`.
- Use conventional commits. Never add `Co-Authored-By`, `Claude-Session` or
  "Generated with Claude Code" lines to commits or PRs.
- Spec Kit artifacts and the constitution override Expo skill defaults. For example, don't
  use React Query (there's no network data) or iOS-HIG-first UI (the app is Android-first).
- Verify UI changes on the emulator, using Expo MCP screenshots and logs, before handing
  them over.
- Update this file in the same PR whenever the commands or architecture change.
