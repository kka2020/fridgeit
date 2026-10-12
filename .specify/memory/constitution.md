# FridgeIt Constitution

## Core Principles

### I. Spec Before Code

- No feature work starts without an approved `spec.md`, `plan.md` and `tasks.md` in
  `specs/<branch>/`.
- `/speckit-analyze` MUST report no critical issues before `/speckit-implement` runs.
- Code that a spec doesn't call for is out of scope. Record it in `docs/roadmap.md`
  instead of building it.

**Rationale:** the spec is the shared memory between the human and the agent. Fixing
errors upstream is far cheaper than fixing code.

### II. Test-First for Domain Logic (NON-NEGOTIABLE)

- **Domain logic:** expiry rules, date calculations and notification planning MUST be
  written red-green-refactor. A failing test is committed or shown before the
  implementation.
- **UI:** screens MUST have React Native Testing Library tests for their key states:
  empty, populated, error and loading.
- **E2E:** each user-facing feature MUST ship one Maestro flow covering its primary
  journey.
- **Done means green:** a task is not done until typecheck, lint and tests pass.

**Rationale:** wrong expiry dates or missed notifications defeat the app's purpose.
Domain tests are the cheapest place to catch them.

### III. Layered Architecture

- `src/domain/` MUST be pure TypeScript, with no imports from React, React Native,
  Expo or storage libraries.
- Platform APIs (notifications, updates, storage) MUST be reached only through adapters or
  repositories behind interfaces, in `src/platform/` and `src/data/`.
- `src/app/` holds only Expo Router screens and layouts. Shared UI goes in
  `src/components/`.
- Scheduled notifications are derived state. They are rebuilt from the database by a
  single reconcile function, never edited incrementally.

**Rationale:** this keeps the logic testable without a device, and lets iOS, web or sync
be added later by swapping adapters.

### IV. Offline-First & Private

- The app MUST be fully usable with no network connection.
- The only permitted network traffic is the over-the-air update check and download.
- No analytics, tracking, crash reporting or third-party SDKs that phone home, unless a
  constitution amendment allows it.
- All user data stays on the device.
- No secrets, keys or credentials are committed to the repository.

**Rationale:** it's a personal food list, so there's no reason for it to leave the phone.

### V. Small, Reversible Changes

- **Branches:** one feature per branch (`NNN-short-name`), implemented one task phase at a
  time, with a commit after each phase.
- **Commits:** conventional commit messages, with no AI attribution trailers or footers.
- **CI:** typecheck, lint and tests MUST be green before merging to `main`.
- **Database:** schema changes MUST go through versioned migrations. Never edit an
  existing migration.
- **Dependencies:** a new dependency MAY be added only if the feature's `plan.md` lists it.
  Add it with `npx expo install`.

**Rationale:** small, checked steps make a bad change, by a human or an agent, a cheap
`git revert`.

### VI. Accessible & Simple

- Interactive controls MUST have accessibility labels and touch targets of at least
  48dp.
- Adding an item MUST take at most 3 taps plus typing.
- Status (fresh, expiring soon, expired) MUST NOT be conveyed by colour alone.
- Choose the simplest design that meets the spec (YAGNI). Any added complexity MUST be
  justified in `plan.md`.

**Rationale:** if logging food is tedious, people stop doing it and the app fails.

### VII. Release Safety

- Every merge to `main` publishes an OTA update to the `preview` channel.
- `production` is promoted manually.
- Changes that alter the native runtime fingerprint (new native modules, `app.json`
  native config, SDK upgrades) MUST NOT ship OTA. They require a new build, and the PR
  MUST say so.
- An OTA update MUST NOT require a database migration that older builds can't run.

**Rationale:** updates must never break installed apps or lose user data.

## Technology Constraints

The stack is fixed by `docs/decisions/0001-tech-stack.md`:

| Area | Choice |
|---|---|
| Framework | Expo SDK 57, TypeScript (strict), Expo Router |
| Storage | `expo-sqlite` + Drizzle ORM |
| Notifications | `expo-notifications` local scheduling. No push server |
| Builds and updates | EAS Build, EAS Update and EAS Workflows |
| Tests | Jest + `jest-expo` + React Native Testing Library, and Maestro |

- Changing the stack requires a new ADR in `docs/decisions/` that supersedes the old one.
- `android/` and `ios/` are generated (Continuous Native Generation) and MUST NOT be edited
  by hand. Configure native behaviour through `app.json` and config plugins.
- This constitution and the Spec Kit artifacts take precedence over defaults suggested by
  Expo skills or other tooling.

## Development Workflow

- **Loop:** `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` →
  `/speckit-analyze` → `/speckit-implement`.
- **Human review:** a human reviews and approves each artifact before the next phase
  starts.
- **Verify before handover:** UI changes are checked on the Android emulator (Expo MCP
  screenshots and logs) or on a device. Notification behaviour is checked on a real
  device.
- **Before the PR:** `/code-review` runs.
- **In the feature PR:** update `CLAUDE.md` when commands or architecture change, and
  update the feature's status in `docs/roadmap.md`.

## Governance

- This constitution supersedes other practices, tooling defaults and Expo skill
  suggestions.
- **Amendments:** made by PR to `.specify/memory/constitution.md`, with a rationale and a
  semantic version bump:
  - MAJOR for removing or redefining a principle
  - MINOR for a new principle or section, or materially expanded guidance
  - PATCH for clarifications
- **Compliance:**
  - `/speckit-plan` checks the plan against these principles (Constitution Check).
  - `/speckit-analyze` flags violations as critical.
  - Code review confirms compliance before merge.
  - Any justified deviation MUST be recorded in the feature's `plan.md` under Complexity
    Tracking.

**Version**: 1.0.0 | **Ratified**: 2026-10-12 | **Last Amended**: 2026-10-12
