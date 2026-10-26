# Research: Foundation and Release Pipeline

**Feature**: `001-foundation` | **Date**: 2026-10-13 | **Plan**: [plan.md](./plan.md)

Sources: the Expo SDK 57 versioned docs (`expo-updates`, unit testing, ESLint), the EAS Workflows
docs (get started, syntax, deploy-to-production example), the `eas.json` reference, the Claude
Code hooks reference and the Maestro install guide. All were read on 2026-10-13. The local
environment was checked the same day: Node 24.16, npm 11.13, Java 23, Android SDK installed
(platform-tools not on PATH), with no `eas`, `adb` or `maestro` on PATH.

---

## R1. How the app checks for and applies updates

**Decision**: keep `expo-updates`' built-in cold-start check (`checkAutomatically: "ON_LOAD"`,
`fallbackToCacheTimeout: 0`), and add a foreground check: on each `AppState` change to `active`,
if `Updates.isEnabled` and at least 15 minutes have passed since the last check, call
`checkForUpdateAsync()` and, if an update is available, `fetchUpdateAsync()`. Pending state is
read from `useUpdates().isUpdatePending`. "Restart" calls `reloadAsync()`. Errors are swallowed
(FR-007).

**Rationale**:
- `ON_LOAD` with timeout `0` checks and downloads in the background on cold start without
  delaying launch (FR-003, SC-005), and applies a downloaded update on the next cold start
  (FR-006).
- `useUpdates()` exposes `isUpdatePending` ("a new update was downloaded and is ready to apply")
  and `lastCheckForUpdateTimeSinceRestart`, which covers both the startup check and manual ones.
- `checkForUpdateAsync`, `fetchUpdateAsync` and `reloadAsync` reject in development mode and
  Expo Go, so every call is guarded by `Updates.isEnabled` and wrapped in try/catch.
- The 15-minute rule (FR-003a) is a pure function of (last check time, now), so it goes in
  `src/domain/` and is written test-first (constitution principle II).
- Error recovery for a crashing update (spec edge case) is built into `expo-updates`: it rolls
  back to the previous working update or the embedded bundle. No app code is needed.

**Alternatives considered**:
- *`checkAutomatically: "NEVER"` with all checks done manually.* Rejected because it duplicates
  what the library already does well on cold start.
- *Checking on every foreground with no limit.* Rejected in clarification (Q1) because it wastes
  requests on quick app switches.
- *A background task (`expo-background-task`) to check while closed.* Rejected: it's a new native
  module, and nobody needs updates while the app is closed.

## R2. Keeping the update logic testable (FR-018, principle III)

**Decision**: put `expo-updates` behind an `UpdatesAdapter` interface in
`src/platform/updates/`, with an `expoUpdatesAdapter` implementation and a React context
(`UpdatesProvider`) that supplies it. A hook, `useUpdateBanner()`, combines the adapter, the
domain rate-limit rule and the session's "dismissed" flag into `{ visible, restart, dismiss }`.
The banner component (`src/components/update-banner.tsx`) is purely presentational.

**Rationale**: the constitution requires platform APIs to be reached only through adapters.
Tests inject a fake adapter through the provider, so the hook and the banner run in Jest with no
native module and no `jest.mock('expo-updates')` call (FR-018).

**Alternatives considered**: calling `useUpdates()` directly in the banner and mocking the module
in Jest. Rejected because it breaks principle III and couples the tests to the library's
internals.

## R3. Build profiles and the update channels (FR-010 to FR-013)

**Decision**: write `eas.json` with:
- `cli.appVersionSource: "remote"`, so EAS keeps track of `versionCode`.
- **`development`**: `developmentClient: true`, `distribution: "internal"`,
  `environment: "development"`.
- **`preview`**: `distribution: "internal"`, `channel: "preview"`, `environment: "preview"`,
  `android.buildType: "apk"`.
- **`production`**: `channel: "production"`, `environment: "production"`, `autoIncrement: true`,
  default `app-bundle`.

In `app.json`, set `android.package: "com.kavinkodikara.fridgeit"` and
`runtimeVersion: { "policy": "fingerprint" }`. `updates.url` and `extra.eas.projectId` are written
by `eas init` and `eas update:configure`.

**Rationale**:
- `channel` decides which update stream a build follows. It is ignored for development builds,
  which is fine because those load JS from Metro.
- `internal` distribution plus `apk` gives an installable link (FR-012).
- The fingerprint policy gives each native runtime a distinct identity with no manual version
  bump (FR-011).
- Production stays as an app bundle, so it's ready for a store later. It isn't used in 001.

**Alternatives considered**: `appVersion` runtime policy. Rejected because it needs a manual bump
for every native change, which is error-prone and is what FR-011 rules out.

## R4. Preview releases on merge: update or build (FR-009, FR-009a)

**Decision**: add `.eas/workflows/preview.yml`, triggered by `on.push.branches: ['main']`:
1. **`fingerprint`** job (`environment: preview`), which outputs `android_fingerprint_hash`.
2. **`get-build`** job with `platform: android`, `profile: preview`,
   `fingerprint_hash: ${{ needs.fingerprint.outputs.android_fingerprint_hash }}` and
   `wait_for_in_progress: true`.
3. **`build`** job (`platform: android`, `profile: preview`), only
   `if: ${{ !needs.get_build.outputs.build_id }}`.
4. **`update`** job (`platform: android`, `channel: preview`,
   `message: ${{ github.commit_message }}`), only `if: ${{ needs.get_build.outputs.build_id }}`.

**Rationale**:
- This follows Expo's "deploy to production" pattern, applied to the preview profile.
- `wait_for_in_progress` handles two native merges in quick succession: the second run waits for
  the first build instead of starting a duplicate (FR-009a).
- The first run finds no build and builds automatically, so the first APK needs no manual step.
- **Prerequisites (one-off, done by the developer)**:
  - Expo login.
  - `eas init`.
  - `eas update:configure`.
  - Install the Expo GitHub app and link `kka2020/fridgeit` in the project's GitHub settings on
    expo.dev.

**Alternatives considered**:
- *Running `eas update` from GitHub Actions.* Rejected because it needs an `EXPO_TOKEN` secret and
  duplicates EAS Workflows (ADR 0001 puts builds and OTA in EAS Workflows).
- *`repack` jobs.* Not needed for an Android-only APK flow.

## R5. Merge checks (FR-014 to FR-016a, SC-003, SC-004)

**Decision**:
- Add a GitHub Actions workflow, `.github/workflows/check.yml`, on `pull_request` and
  `push: main`. It has one job, `check`, on `ubuntu-latest` with Node 24 and an npm cache. It runs
  `npm ci`, then `npm run typecheck`, `npm run lint`, `npm run format:check` and
  `npm test -- --ci`.
- Configure a repository ruleset on `main`: require a PR (0 approvals), require the `check`
  status, block force pushes and deletion, with Repository admin on the bypass list (FR-016a).
- Add a PR template with a "This change alters the native runtime (needs a new build)" checkbox
  (principle VII).

**Rationale**:
- A single job keeps one required status name, and finishes in about 2–4 minutes, well under
  SC-004.
- Rulesets work on public repositories on the free plan.
- A required status can only be selected after the check has run once, so the ruleset is
  configured after the first PR.

**Alternatives considered**:
- *Separate jobs for typecheck, lint and test.* Rejected: more required statuses to keep in sync,
  for little gain.
- *Running checks in EAS Workflows.* Rejected: ADR 0001 puts quality checks in GitHub Actions.

## R6. Formatting and linting (Prettier + ESLint)

**Decision**:
- Install `prettier`, `eslint-config-prettier` and `eslint-plugin-prettier`. Add
  `eslint-plugin-prettier/recommended` to the existing flat `eslint.config.js`, as Expo's guide
  shows.
- Add `.prettierrc` (Prettier defaults plus `printWidth: 100`).
- Add `.prettierignore` covering `.specify/`, `.claude/skills/`, `specs/`, `docs/`,
  `package-lock.json`, `android/`, `ios/`, `.expo/` and `dist/`. Agent-maintained Markdown keeps
  its hand-wrapped style.
- Scripts:
  - `lint`: `expo lint`
  - `format`: `prettier --write .`
  - `format:check`: `prettier --check .`

**Rationale**: this is the integration Expo documents for SDK 53 and later. Lint then reports
formatting drift in JS and TS too.

**Alternatives considered**: Biome. Rejected because ADR 0001 names ESLint and Prettier.

## R7. Unit and UI tests

**Decision**:
- Install `jest-expo`, `jest`, `@types/jest` and `@testing-library/react-native` with
  `npx expo install … -- --dev`, which resolves the SDK 57-compatible versions.
- Jest config in `package.json`:
  - `preset: "jest-expo"`
  - `moduleNameMapper` for `^@/(.*)$`
  - `testPathIgnorePatterns` for `/node_modules/`, `/.maestro/`
- Add `"jest"` to `compilerOptions.types` in `tsconfig.json`.
- `test` script: `jest` (no `--watchAll`, so it works in CI and in hooks).
- Test locations:
  - `src/domain/__tests__/`
  - `src/components/__tests__/`
  - `src/platform/updates/__tests__/`
  - `__tests__/app/` at the repo root for screens.

**Rationale**:
- Every file in `src/app/` is a route, so screen tests must live outside it.
- The `@/` alias works in Metro but not in Jest without the mapper.
- `react-test-renderer` doesn't support React 19, so React Native Testing Library is the only
  renderer.

## R8. End-to-end flow (FR-019)

**Decision**:
- One flow, `.maestro/launch.yaml`: `appId: com.kavinkodikara.fridgeit`, then
  `launchApp: { clearState: true }`, then `assertVisible: "My food"`.
- Run it against a locally installed release build (`npx expo run:android --variant release`),
  because that build needs no dev server.
- Script `e2e`: `maestro test .maestro`.
- Maestro is a separate CLI, not an npm dependency. Native Windows install: Java 17+ (Java 23 is
  installed), the release zip, and `C:\maestro\bin` on PATH. Android `platform-tools` also needs
  adding to PATH for `adb`.

**Rationale**: a development build opens the dev-client launcher unless Metro is running, which
makes the flow flaky. A release build matches what users run.

**Alternatives considered**: the EAS Workflows `maestro` job (alpha) on each merge. Deferred by
clarification (local only); it can be added later with the same flow file.

## R9. Claude Code hooks (FR-020, FR-021)

**Decision**: add hooks to `.claude/settings.json`, written as Node scripts and run in exec form
(`command: "node"`, `args: ["${CLAUDE_PROJECT_DIR}/.claude/hooks/<script>.mjs"]`), so they behave
the same in Git Bash, PowerShell and CI.
- **`PostToolUse`** (matcher `Edit|Write`) runs `format-and-lint.mjs`. It reads
  `tool_input.file_path` from stdin and normalises backslashes. If the extension is one Prettier
  handles and the file isn't ignored, it runs `prettier --write`. For `.ts`, `.tsx`, `.js`, `.jsx`
  and `.mjs` files, it runs `eslint --fix`. Remaining lint errors exit with code 2, sending stderr
  to Claude, which doesn't block.
- **`Stop`** runs `check-on-stop.mjs`:
  - Skip (exit 0) when `git status --porcelain` shows no changed code files and `HEAD` is the
    commit of the last passing run, so commits made during a turn are still checked.
  - Otherwise, run `npm run typecheck` and `npm test -- --silent`.
  - On failure, keep an attempt count per `session_id` in `os.tmpdir()`. The count resets when
    `stop_hook_active` is `false`, which means a new turn. For failures 1 to 3, exit with code 2
    and the failure output, which blocks hand-over and sends the agent back. On the fourth
    failure, after it has been sent back 3 times, exit 0 and print `{"systemMessage": …}`
    reporting the failures to the developer (spec, Story 4, scenario 6).
  - On success, clear the count and save `HEAD` as the last passing commit.

**Rationale**:
- Exit code 2 on Stop blocks stopping and sends the reason to Claude. On PostToolUse, it only
  reports.
- `stop_hook_active` tells a new turn apart from a continuation, which is what "3 attempts per
  turn" (clarification Q3) needs.
- Claude Code's own cap of 8 consecutive continuations is a backstop.
- Node scripts avoid the differences between Git Bash and PowerShell on Windows.

**Alternatives considered**: shell-form `npx prettier …` one-liners. Rejected: they can't apply
the extension filter, the ignore rules or the attempt counter, and they quote differently in each
shell.

## R10. Starter-template leftovers (FR-002)

**Decision**:
- Delete the unused template images: `expo-badge*`, `expo-logo`, `logo-glow`, `react-logo*`,
  `tutorial-web` and `tabIcons/`.
- Remove the dependencies the app no longer imports, after confirming with a grep: `@expo/ui`,
  `expo-device`, `expo-glass-effect`, `expo-image`, `expo-symbols`, `expo-web-browser`.
- Delete the `reset-project` script entry.
- Keep `assets/expo.icon` (referenced by `ios.icon`), the Android icons, the splash and favicon,
  `expo-font`, `expo-system-ui`, `expo-status-bar`, `expo-constants`, `expo-linking` and the
  router's peer dependencies.

**Rationale**: removing native modules before the first build makes the first fingerprint
smaller and leaves no unused code. Any of them can be re-added through a later plan.

## R11. New dependencies (principle V)

| Package | Type | Why |
|---|---|---|
| `expo-updates` | runtime | OTA updates (ADR 0001) |
| `expo-dev-client` | runtime | development builds (ADR 0001, `development` profile) |
| `jest-expo`, `jest`, `@types/jest` | dev | unit and UI tests |
| `@testing-library/react-native` | dev | screen tests (constitution principle II) |
| `prettier`, `eslint-config-prettier`, `eslint-plugin-prettier` | dev | formatting (ADR 0001) |

Not npm dependencies:
- **EAS CLI**: run as `npx eas-cli@latest`, per AGENTS.md.
- **Maestro CLI**: installed on the PC.
- **GitHub Actions**: `actions/checkout@v4` and `actions/setup-node@v4`.
