# Implementation Plan: Foundation and Release Pipeline

**Branch**: `001-foundation` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-foundation/spec.md`

## Summary

001 turns the Expo starter into a walking skeleton. The app opens to a placeholder "My food"
screen and shows a dismissable "Update ready, restart" banner whenever a downloaded update is
pending. Updates are checked on cold start (built into `expo-updates`) and when the app returns to
the foreground, at most every 15 minutes, using a pure domain rule.

Releases run through EAS:
- Each merge to `main` fingerprints the native runtime.
- If a preview build with that fingerprint exists, the merge publishes an OTA update to the
  `preview` channel.
- If not, it builds a new preview APK.
- Production stays manual.

Quality is enforced in three places:
- **Each PR**: a GitHub Actions `check` job runs typecheck, lint, format check and tests.
- **`main`**: a repository ruleset makes changes go through a PR whose checks pass.
- **Agent turns**: Claude Code hooks format and lint on every edit, and block hand-over (up to 3
  times) while typecheck or tests fail.

The feature also adds one Maestro flow, run locally. See [research.md](./research.md) for each
decision.

## Technical Context

**Language/Version**: TypeScript ~6.0 (strict), React 19.2, React Native 0.86, Expo SDK 57,
Node 24 (local and CI)

**Primary Dependencies**:
- Already installed: `expo-router`.
- New runtime: `expo-updates`, `expo-dev-client`.
- New dev: `jest-expo`, `jest`, `@types/jest`, `@testing-library/react-native`, `prettier`,
  `eslint-config-prettier`, `eslint-plugin-prettier`.
- Removed: `@expo/ui`, `expo-device`, `expo-glass-effect`, `expo-image`, `expo-symbols`,
  `expo-web-browser`.

**Storage**: N/A. 001 stores no data, and the "dismissed" flag lives in memory for the session.

**Testing**:
- Jest with `jest-expo` and React Native Testing Library, for domain and UI tests.
- Maestro CLI, for one local end-to-end flow on the Android emulator.

**Target Platform**: Android (phone, portrait). Builds and updates are made with EAS Build, EAS
Update and EAS Workflows. Checks run in GitHub Actions on `ubuntu-latest`.

**Project Type**: mobile app (Expo, single project, `src/` layout)

**Performance Goals**:
- The "My food" screen appears in under 2 s, online or offline (SC-005).
- Update checks never block startup (`fallbackToCacheTimeout: 0`).

**Constraints**:
- Fully offline-capable; update checks are the only network traffic.
- No secrets in the repository.
- The EAS free-tier build quota is respected: builds run only when the fingerprint changes.
- Checks finish in under 10 minutes (SC-004).

**Scale/Scope**: 1 screen, 1 banner component, 1 domain rule, 1 platform adapter, 2 CI pipelines,
2 agent hooks, 1 end-to-end flow. A handful of side-loading testers.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this plan complies | Status |
|---|---|---|
| **I. Spec before code** | The spec is clarified (7 decisions recorded). Tasks follow from this plan. `/speckit-analyze` runs before implementation. | ✅ |
| **II. Test-first (domain)** | The 15-minute rule, `shouldCheckForUpdate()`, is written red-green in `src/domain/`. | ✅ |
| **II. UI tests** | The "My food" screen has a test for its one state: the placeholder shown. Empty, error and loading don't apply, since it has no data. The banner and its hook have tests for hidden, shown, restart, dismissed-stays-hidden, and offline/check-error (still hidden, no crash). | ✅ |
| **II. E2E** | One Maestro flow: launch, then "My food" is visible. | ✅ |
| **II. Done means green** | `npm run typecheck`, `npm run lint`, `npm run format:check` and `npm test` run in CI and in the Stop hook. | ✅ |
| **III. Layered architecture** | `src/domain/` holds a pure function only. `expo-updates` is used only in `src/platform/updates/`, behind `UpdatesAdapter`. `src/app/` holds only `_layout.tsx` and `index.tsx`. The banner is in `src/components/`. | ✅ |
| **III. Notifications as derived state** | Not touched in 001. | n/a |
| **IV. Offline-first and private** | Update checks are the only traffic, and they fail silently. No analytics or crash SDKs. EAS and GitHub are developer infrastructure, not app traffic. No secrets: EAS Workflows run on Expo's side, so GitHub needs no `EXPO_TOKEN`. | ✅ |
| **V. Small, reversible changes** | One branch. Tasks are grouped into phases with a commit after each. Every new dependency is listed here and added with `npx expo install`. No database. | ✅ |
| **VI. Accessible and simple** | The banner's "Restart" and dismiss buttons have `accessibilityLabel`, `accessibilityRole="button"` and a minimum 48dp hit area. No colour-only status. | ✅ |
| **VII. Release safety** | Merges publish to `preview` only. Production is manual. The fingerprint workflow builds instead of publishing OTA when native code changed. The PR template has a "needs a new build" checkbox. 001 itself changes the native runtime, so its PR must say so; its first preview APK comes from the workflow. | ✅ |
| **Technology constraints** | Matches ADR 0001: Expo SDK 57, EAS, Jest, `jest-expo`, React Native Testing Library, Maestro, ESLint, Prettier, GitHub Actions. `android/` and `ios/` are not committed; native config goes through `app.json`. | ✅ |

**Gate result**: PASS. No violations; one complexity note is below.

**Post-design re-check (after Phase 1)**: PASS. The contracts keep `expo-updates` inside
`src/platform/updates/`, and the hooks and pipelines add no app runtime traffic.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0
├── data-model.md        # Phase 1: configuration entities and update-banner states
├── quickstart.md        # Phase 1: how to validate the feature end to end
├── contracts/
│   ├── updates-adapter.md   # UpdatesAdapter, useUpdateBanner, shouldCheckForUpdate
│   ├── pipelines.md         # CI check job, EAS preview workflow, eas.json, ruleset
│   └── agent-hooks.md       # Claude Code hook inputs, outputs and exit codes
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── _layout.tsx                 # Stack + UpdatesProvider + UpdateBanner overlay
│   └── index.tsx                   # "My food" placeholder screen
├── components/
│   ├── update-banner.tsx           # presentational banner (Restart, dismiss)
│   └── __tests__/update-banner.test.tsx
├── domain/
│   ├── update-check-policy.ts      # shouldCheckForUpdate(lastCheckedAt, now, minIntervalMs)
│   └── __tests__/update-check-policy.test.ts
└── platform/
    └── updates/
        ├── updates-adapter.ts      # UpdatesAdapter interface
        ├── expo-updates-adapter.ts # expo-updates implementation (the only import of it)
        ├── updates-context.tsx     # UpdatesProvider + useUpdatesAdapter
        ├── use-update-banner.ts    # foreground checks, dismissal, restart
        └── __tests__/use-update-banner.test.tsx

__tests__/app/index.test.tsx        # "My food" screen test (kept outside src/app)
.maestro/launch.yaml                # end-to-end flow
.eas/workflows/preview.yml          # fingerprint → build or update on merge to main
.github/workflows/check.yml         # typecheck, lint, format check, test
.github/pull_request_template.md    # includes the "native runtime changed" checkbox
.claude/settings.json               # + PostToolUse and Stop hooks
.claude/hooks/format-and-lint.mjs
.claude/hooks/check-on-stop.mjs
eas.json  .prettierrc  .prettierignore
app.json  package.json  tsconfig.json  eslint.config.js   # modified
CLAUDE.md  docs/roadmap.md                                 # modified (FR-022)
```

**Structure Decision**: a single Expo project, using the constitution's layers
(`app`, `components`, `domain`, `platform`; `data` arrives in 002). Tests sit next to the code
in `__tests__/` folders, except screen tests, which live in a root-level `__tests__/app/`
because every file under `src/app/` becomes a route.

## Implementation phases (for /speckit-tasks)

Each phase ends green (typecheck, lint, tests) with one commit.

1. **Tooling**: Prettier, Jest, React Native Testing Library, scripts, `tsconfig` types, and
   the GitHub Actions check workflow plus PR template. Gives Story 4's CI half.
2. **Clean-up and "My food"**: remove the template leftovers and unused dependencies, write the
   placeholder screen with its test. Gives Story 3.
3. **Update banner**: the domain rule (test first), the adapter and provider, the hook, the
   banner and layout wiring, and their tests. Adds `expo-updates` and `expo-dev-client`. Gives
   Story 2.
4. **EAS and release pipeline**: `app.json` (package, runtime version), `eas.json`,
   `.eas/workflows/preview.yml`. Developer steps: login, `eas init`, `eas update:configure`, and
   linking GitHub. Gives Story 5 and the automatic half of Story 1.
5. **Agent hooks**: both hook scripts and the `settings.json` entries. Gives Story 4's agent
   half.
6. **End-to-end and docs**: the Maestro flow, the emulator check with Expo MCP screenshots, and
   updates to `CLAUDE.md` and `docs/roadmap.md`.
7. **Done-when run** (manual, after merge):
   - Merge the PR (the first workflow run builds the preview APK) and install it on the phone.
   - Set up the ruleset now that `check` has run.
   - Merge a text change and confirm it shows on the phone (SC-001).

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| `UpdatesAdapter` interface + React context provider | Principle III requires platform APIs behind adapters. FR-018 requires the banner logic to be testable without a real update service. | Calling `useUpdates()` in the component and mocking `expo-updates` in Jest breaks principle III, and ties tests to library internals. |
| Attempt counter in the Stop hook (temp file per session) | Clarification Q3: block hand-over at most 3 times per turn. | A stateless hook either never blocks or can loop until Claude Code's cap of 8. |
| Last passing `HEAD` saved by the Stop hook (one temp file) | FR-021: checks must run at the end of a turn even when the turn committed its changes, and every phase ends with a commit. | Skipping on a clean `git status` alone lets a committed but broken change through. Always running the checks makes question-only turns slow. |
