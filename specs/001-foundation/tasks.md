---

description: "Task list for 001 Foundation and Release Pipeline"
---

# Tasks: Foundation and Release Pipeline

**Input**: Design documents from `specs/001-foundation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Required. The constitution (principle II) requires test-first domain logic, UI tests
for screen states and one Maestro flow; FR-017 to FR-019 list the cases. Tasks marked **(test
first)** MUST be run and seen failing before the matching implementation task.

**Organization**: Phases follow dependency order, not just priority. US4 (P1) comes first
because it guards every later change, and US1 (P1) comes last because it needs the screen (US3),
the banner (US2) and the build profiles (US5).

## Progress and handover

*Last updated 2026-11-07. Update this section whenever a phase is committed.*

**Status**: Phases 1–7 (T001–T043) are done. The draft PR is
[#1](https://github.com/kka2020/fridgeit/pull/1) (`001-foundation` → `main`). The phase commits are
`051bb94` (Phase 1), `fc8d59b` (Phase 2), `1f88799` (Phase 3), `3ad2b7e` (Phase 4), `3628d06`
(Phase 5), `2fcc1d3` (Phase 6) and the `ci(001): build or publish preview on merge based on native
fingerprint` commit (Phase 7). Phases 1–6 are pushed; Phase 7 is committed locally but **not
pushed** yet.

**Next**: Phase 8, starting with T044 (docs) and T045 (roadmap "In review"). The preview workflow
first runs when PR #1 merges (T049); the Expo GitHub app is installed and `kka2020/fridgeit` is
connected to the EAS project (T042, done by the developer on 2026-11-07).

**EAS project (Phase 6)**: owner `kka2026`, project ID `fe71867f-0c35-4757-9e27-f6c3731c52d2`. The
developer's environment has `EXPO_TOKEN` set, so EAS CLI authenticates with it (no `eas login`).
T039 was verified with an adb screenshot and a uiautomator dump rather than Expo MCP.

**Open Phase 5 review nit**: nothing tests the real `expoUpdatesAdapter`'s error swallowing (FR-007
"never throws"). The contract doesn't require it; the hook also swallows rejections.

**Local Android setup (done 2026-11-07)**: `ANDROID_HOME`, `platform-tools` and `emulator` are on
the user PATH, Maestro 2.12.1 is in `%USERPROFILE%\.maestro\maestro\bin` (on PATH), and the AVD is
`Medium_Phone_API_35` (Android 15). Start it with `emulator -avd Medium_Phone_API_35`.

**Things to know before continuing**:
- **Orchestration (from Phase 4):** the main session orchestrates each phase. Fresh subagents
  write the failing tests, then other fresh subagents implement against them, with `[P]` tasks
  in parallel. The main session then runs the full check. Before each phase commit, a fresh
  read-only `phase-reviewer` (`.claude/agents/phase-reviewer.md`) reviews the phase diff, with
  at most 2 review rounds. The `Stop` hook doesn't gate subagents, so the orchestrator runs the
  checks itself.
- **The agent hooks are live.** After every Edit or Write, `format-and-lint.mjs` reformats the
  file and reports ESLint errors *and warnings*. Before hand-over, `check-on-stop.mjs` runs
  typecheck and tests. Re-read a file after an edit if the hook may have reformatted it.
- **Local release builds:**
  - `npx expo run:android --variant release --device Medium_Phone_API_35`. `--device` takes the
    AVD name, not the adb serial (`emulator-5554`).
  - The first build takes about 9 minutes.
  - With the template's Gradle limits (`-Xmx2048m -XX:MaxMetaspaceSize=512m`) the build failed
    with `Metaspace` in `:expo-updates:kspReleaseKotlin` and `lintVitalAnalyzeRelease`. The fix is
    in the developer's `~/.gradle/gradle.properties` (`-Xmx4096m -XX:MaxMetaspaceSize=1024m`),
    not in the generated `android/` folder.
  - Prebuild rewrites the `android` and `ios` npm scripts to `expo run:*`. Revert that if it
    happens.
- **Development builds on the emulator:**
  - `npx expo run:android --device Medium_Phone_API_35` takes about 8 minutes the first time.
  - Run `adb reverse tcp:8081 tcp:8081`, then open
    `exp+fridgeit://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081`. The default URL
    uses the PC's LAN IP, which the emulator can't reach.
  - A Metro left running from an earlier `expo run` (CI mode, stale code) holds port 8081 and
    breaks the dev client with "There was a problem loading the project". Check
    `curl localhost:8081/status` and stop the old one first.
  - When an agent runs `expo run:android` in the background, prefix it with `CI=1` so it doesn't
    wait for interactive input. Stopping the background task doesn't stop its `node` child, which
    keeps holding port 8081; stop that process too.
  - **"App isn't responding" / "failed to complete startup" on launch** means the emulator is
    degraded (seen after ~8 hours of uptime, load average ~5, 2 GB AVD RAM), not the app: a cold
    restart (`adb emu kill`, then `emulator -avd Medium_Phone_API_35 -no-snapshot-load`) fixed it,
    and the dev bundle (1,413 modules) then built in 2.3 s and showed "My food". Wait a minute after
    boot, while the load average settles, before measuring launch time.
  - If a build hangs with no output, the adb server may be hung: stop the `adb` processes and run
    `adb start-server`. If Gradle fails with "Unable to delete ... classes.jar", idle Gradle
    workers hold the file: run `./gradlew --stop` in `android/`.
- **uiautomator checks:** delete `/sdcard/ui.xml` before each `uiautomator dump`, or a failed dump
  leaves the previous file and gives a false result.
- **Git Bash and adb:** set `MSYS_NO_PATHCONV=1`, or Git Bash rewrites `/sdcard/...` into a Windows
  path and `adb shell` commands silently fail.
- **React Native Testing Library 14:** `render` is async, so tests use `await render(...)`.
  `npm install` prints a peer warning (`test-renderer` wants React ^19.3; the app has 19.2.3).
  A smoke test showed it works, so ignore it unless tests break.
- **`expo-router` 57 depends on `@expo/ui`, `expo-glass-effect` and `expo-symbols`**, so they're
  still in `node_modules`. The app must not import them; see plan.md.
- **Pushing:** ask the developer before pushing or changing PR #1. The PR description lists the
  phases done so far; refresh it when the PR is marked ready (T048).
- **Open `/speckit-analyze` findings** (none block implementation):
  - U1: Story 5, scenario 2 (production-only updates) can't be tested in 001.
  - A1: nothing measures the 10-minute CI target. The first run took 33 s.
  - C2: T025 doesn't state the 2 s launch target.
  - C3: the format hook misses edits made through shell commands.
  - U3: a PR template checkbox can't be made required.
  - D3: the not-applicable screen states aren't recorded in Complexity Tracking.
  - D4: spec.md still says Status: Draft.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on unfinished tasks).
- **[Story]**: the user story from spec.md (US1–US5).
- **(developer)**: a step only the human can do, such as an interactive login or the web UI.
  The agent stops and asks for it.
- Every phase ends with `npm run typecheck`, `npm run lint`, `npm run format:check` and
  `npm test` all passing (from T005 onward), then one conventional commit with no attribution
  trailers.

## Path conventions

A single Expo project:
- Screens: `src/app/`
- Shared UI: `src/components/`
- Pure logic: `src/domain/`
- Adapters: `src/platform/`
- Screen tests: root `__tests__/app/`

Add dependencies only with `npx expo install`. For dev dependencies, pass `--dev` through to npm:
`npx expo install <pkg> "--" --dev` in PowerShell, or `npx expo install <pkg> -- -- --dev` in
Git Bash, where `npx` swallows a single `--`. Check afterwards that the packages landed in
`devDependencies`.

---

## Phase 1: Setup (shared tooling)

**Purpose**: formatting, the test runner and the npm scripts that every later phase uses
(R6, R7, contracts/pipelines.md).

- [X] T001 Install the dev dependencies listed in plan.md: `npx expo install prettier eslint-config-prettier eslint-plugin-prettier jest-expo jest @types/jest @testing-library/react-native "--" --dev`. Confirm `package.json` and `package-lock.json` changed, and nothing outside plan.md's list was added.
- [X] T002 [P] Add `.prettierrc` (`{ "printWidth": 100 }`) and `.prettierignore` listing `.specify/`, `.claude/skills/`, `specs/`, `docs/`, `package-lock.json`, `android/`, `ios/`, `.expo/`, `dist/`, `node_modules/`, at the repo root.
- [X] T003 [P] Add `eslint-plugin-prettier/recommended` to `eslint.config.js` after `expoConfig`, as research R6 shows. Add a block for `.claude/hooks/**/*.mjs` with `languageOptions: { sourceType: "module", globals: { process: "readonly", console: "readonly", Buffer: "readonly" } }`, listing only the Node globals the hooks use, so the hook scripts lint cleanly with no new dependency.
- [X] T004 Update the `package.json` scripts to match contracts/pipelines.md:
  - Add `typecheck` (`tsc --noEmit`), `format` (`prettier --write .`), `format:check` (`prettier --check .`), `test` (`jest`) and `e2e` (`maestro test .maestro`).
  - Keep `lint`, `start`, `android`, `ios` and `web`. Remove `reset-project`.
  - Add a `jest` block: `preset: "jest-expo"`, `moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" }`, `testPathIgnorePatterns: ["/node_modules/", "/.maestro/"]`, `passWithNoTests: true` (temporary, removed in T026, so CI and the Stop hook pass before the first test exists).
- [X] T005 Add `"types": ["jest"]` to `compilerOptions` in `tsconfig.json`. Then run `npm run format` once to normalise existing files, and confirm `npm run typecheck`, `npm run lint` and `npm run format:check` pass. `npm test` passes because of `passWithNoTests` (removed in T026).
- [X] T006 Commit: `chore(001): add Prettier, Jest and RNTL with typecheck/format/test scripts`.

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: the native shape of the app (app ID, updates library, dev client, unused-module
clean-up). It changes the fingerprint, so it is done once, before any build (R3, R10, R11).

**⚠️ CRITICAL**: US2, US5 and US1 depend on this phase.

- [X] T007 Confirm with a grep that `src/` doesn't import `@expo/ui`, `expo-device`, `expo-glass-effect`, `expo-image`, `expo-symbols` or `expo-web-browser`, then remove them with `npm uninstall @expo/ui expo-device expo-glass-effect expo-image expo-symbols expo-web-browser`. Uninstalling is allowed; adding still goes through `expo install`.
- [X] T008 Install the runtime dependencies from plan.md: `npx expo install expo-updates expo-dev-client`.
- [X] T009 Edit `app.json`:
  - Add `expo.android.package: "com.kavinkodikara.fridgeit"` (FR-013, permanent).
  - Add `expo.runtimeVersion: { "policy": "fingerprint" }` (FR-011).
  - Add `expo.updates: { "checkAutomatically": "ON_LOAD", "fallbackToCacheTimeout": 0 }`, as in data-model.md.
  - Leave `updates.url` and `extra.eas` for T038.
- [X] T010 Run `npx expo-doctor` and `npx expo install --check`, and fix any reported version mismatches with `npx expo install --fix`.
- [X] T011 Commit: `build(001): set Android package, fingerprint runtime, add expo-updates and dev client`.

**Checkpoint**: the native configuration is final for 001. Any later change to it means a new
build.

---

## Phase 3: User Story 4 - Every change is checked automatically (Priority: P1)

**Goal**: every PR runs typecheck, lint, format check and tests, and coding-agent edits are
formatted, linted and checked before hand-over.

**Independent test**: quickstart V2 (a PR with a type error fails `check`) and V3 (pipe sample
JSON into both hooks and check the exit codes).

### Implementation for User Story 4

- [X] T012 [P] [US4] Create `.github/workflows/check.yml` exactly as in contracts/pipelines.md:
  - Triggers: `pull_request` and `push` to `main`.
  - One job with id `check` on `ubuntu-latest`, `timeout-minutes: 15`.
  - Steps: `actions/checkout@v4`, `actions/setup-node@v4` with `node-version: 24` and `cache: npm`, `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test -- --ci`.
  - No secrets.
- [X] T013 [P] [US4] Create `.github/pull_request_template.md` with the sections listed in contracts/pipelines.md: Summary, Spec link, Checks, a **Native runtime** checkbox ("This change alters the native runtime (new native module, native `app.json` config, SDK upgrade) and needs a new build") and "UI verified on the emulator" with screenshots.
- [X] T014 [P] [US4] Create `.claude/hooks/format-and-lint.mjs` to match contracts/agent-hooks.md:
  - Read the stdin JSON and normalise backslashes in `tool_input.file_path`.
  - Skip (exit 0) for files outside the project, deleted files, and files matched by `.prettierignore` (check with `prettier --file-info`).
  - Run `prettier --write` for `.ts .tsx .js .jsx .mjs .cjs .json .yml .yaml .md .css`, and `eslint --fix --max-warnings 0` for `.ts .tsx .js .jsx .mjs .cjs`. Both run from `node_modules` directly, not through `npx`.
  - Exit 2 with the tool output on stderr when ESLint errors or warnings remain or Prettier can't parse the file, and exit 1 when a tool can't run.
- [X] T015 [P] [US4] Create `.claude/hooks/check-on-stop.mjs` to match contracts/agent-hooks.md:
  - Exit 0 only if `git status --porcelain` shows no changed paths outside `specs/`, `docs/` and `.specify/` **and** `HEAD` equals the SHA in `<os.tmpdir()>/fridgeit-stop-hook/last-green-head`, so commits made during the turn are still checked.
  - Otherwise run `npm run typecheck`, then `npm test -- --silent`.
  - Keep the attempt counter in `<os.tmpdir()>/fridgeit-stop-hook/<session_id>.json`, reset when `stop_hook_active` is `false`.
  - Failures 1–3: exit 2 with stderr "Typecheck/tests failed (attempt n of 3). Fix these before handing over:" plus the trimmed output (last ~80 lines).
  - Failure 4: exit 0 with stdout `{"systemMessage": "Checks still failing after 3 attempts — handing over with failures: …"}`.
  - Success: delete the state file, write `HEAD` to `last-green-head`, and exit 0.
- [X] T016 [US4] Add the `hooks` block from contracts/agent-hooks.md (PostToolUse `Edit|Write`, timeout 60; Stop, timeout 300; both in exec form with `node` and `${CLAUDE_PROJECT_DIR}`) to `.claude/settings.json`, keeping the existing `enabledPlugins` and `attribution` keys.
- [X] T017 [US4] Verify the hooks as in quickstart V3:
  - Pipe a Write payload for a messy file into `format-and-lint.mjs`: it gets reformatted, exit 0.
  - Pipe a payload for a file with an unused variable: exit 2, and the ESLint message appears on stderr.
  - With a deliberately failing test, `check-on-stop.mjs` exits 2, 2, 2 and then 0 with `systemMessage` (passing `stop_hook_active: true` after the first). Then remove the failing test.
- [X] T018 [US4] Commit: `ci(001): add check workflow, PR template and Claude Code format/stop hooks`. Push the branch and confirm the `check` job runs green on GitHub for the branch's PR (open a draft PR `001-foundation` → `main` if none exists).

**Checkpoint**: from here on, every edit and every PR is checked automatically.

---

## Phase 4: User Story 3 - The app opens to a "My food" home screen (Priority: P2)

**Goal**: the starter content is gone, and the only screen is "My food" with a placeholder
message. It works offline.

**Independent test**: quickstart V4 (release build on the emulator, online and in airplane mode)
and V5 (`npm run e2e`).

### Tests for User Story 3 (test first)

- [x] T019 [P] [US3] Write `__tests__/app/index.test.tsx` (React Native Testing Library): render the default export of `src/app/index.tsx` and assert the text "My food" and "Food tracking is coming soon." (contracts/updates-adapter.md, "My food" section). Run `npm test` and confirm it fails.
- [x] T020 [P] [US3] Create `.maestro/launch.yaml` exactly as in contracts/pipelines.md (`appId: com.kavinkodikara.fridgeit`, `launchApp` with `clearState: true`, `assertVisible: "My food"`).

### Implementation for User Story 3

- [x] T021 [US3] Rewrite `src/app/index.tsx` as the "My food" screen:
  - A title "My food" with `accessibilityRole="header"`, and the body text "Food tracking is coming soon."
  - Uses the safe area, and works in light and dark themes (`useColorScheme`).
  - No data and no network.
  - T019 now passes.
- [x] T022 [US3] Set the stack screen title in `src/app/_layout.tsx` to "My food" (`<Stack.Screen name="index" options={{ title: "My food" }} />`), with no tabs.
- [x] T023 [P] [US3] Delete the unused template assets: `assets/images/expo-badge.png`, `expo-badge-white.png`, `expo-logo.png`, `logo-glow.png`, `react-logo.png`, `react-logo@2x.png`, `react-logo@3x.png`, `tutorial-web.png` and the `assets/images/tabIcons/` folder. Keep the icons, splash, favicon and `assets/expo.icon/`. Grep the repo first to confirm none are referenced.
- [x] T024 [P] [US3] Delete `scripts/reset-project.js` (and `scripts/` if it ends up empty).
- [x] T025 [US3] Build and run the release variant on the emulator (`npx expo run:android --variant release`). Using Expo MCP screenshots, confirm:
  - "My food" is shown, with no template screens or tabs.
  - In airplane mode, a relaunch still shows it with no error.
  Then run `npm run e2e` and confirm `launch.yaml` passes. **(developer)**: Maestro and `adb` must be on PATH (quickstart prerequisites).
- [x] T026 [US3] Remove `passWithNoTests` from the jest block now that T019 exists, and confirm `npm test` still passes. Commit: `feat(001): replace starter template with My food placeholder screen`.

**Checkpoint**: Story 3 is done and its end-to-end flow passes.

---

## Phase 5: User Story 2 - The user is told when an update is ready (Priority: P2)

**Goal**: a dismissable "Update ready / Restart" banner appears when a downloaded update is
pending. Foreground checks are limited to once every 15 minutes.

**Independent test**: all banner, hook and domain tests pass in Jest with a fake adapter
(FR-018). On a real preview build, the full check is quickstart V6, after Phase 7.

### Tests for User Story 2 (test first)

- [x] T027 [P] [US2] Write `src/domain/__tests__/update-check-policy.test.ts` covering every row of the `shouldCheckForUpdate` table in contracts/updates-adapter.md:
  - `undefined` → true
  - +14 min 59 s → false
  - +15 min → true
  - +2 h → true
  - future `lastCheckedAt` → true
  - custom interval of 30 s at +1 min → true

  Run it and confirm it fails because the module is missing. Commit the failing test with the next task, or show it failing in the phase notes (principle II).
- [x] T028 [P] [US2] Write `src/components/__tests__/update-banner.test.tsx`:
  - Renders nothing when `visible={false}`.
  - Shows "Update ready" and both buttons when visible.
  - Pressing "Restart to apply update" calls `onRestart`, and pressing "Dismiss update message" calls `onDismiss`. Both buttons are found by `getByLabelText`.
- [x] T029 [P] [US2] Write `src/platform/updates/__tests__/use-update-banner.test.tsx` with a fake `UpdatesAdapter` and a fixed `now`, covering all 8 cases in contracts/updates-adapter.md: hidden, shown, restart calls `reload`, dismissed stays hidden even when a new update becomes pending, foreground ≥ 15 min checks, foreground < 15 min doesn't, `isEnabled: false` never checks, and a rejected `checkAndFetch` doesn't throw. Simulate foregrounding by mocking `AppState.addEventListener`.

### Implementation for User Story 2

- [x] T030 [US2] Implement `src/domain/update-check-policy.ts`: export `FOREGROUND_CHECK_INTERVAL_MS = 15 * 60 * 1000` and `shouldCheckForUpdate(lastCheckedAt, now, minIntervalMs = FOREGROUND_CHECK_INTERVAL_MS)`. Rules: "`true` when `lastCheckedAt` is `undefined`", "`true` when `now - lastCheckedAt >= minIntervalMs`", "`true` when `lastCheckedAt` is after `now`", otherwise `false`. Use no React, React Native or Expo imports. T027 passes.
- [x] T031 [P] [US2] Create `src/platform/updates/updates-adapter.ts`, with the `UpdatesStatus` and `UpdatesAdapter` interfaces exactly as in contracts/updates-adapter.md, and `src/platform/updates/expo-updates-adapter.ts`, which implements them. That file is the **only** file importing `expo-updates`.
  - `isEnabled` = `Updates.isEnabled`.
  - `useStatus()` maps `useUpdates()` to `{ isUpdatePending, lastCheckedAt: lastCheckForUpdateTimeSinceRestart }`.
  - `checkAndFetch()` calls `checkForUpdateAsync()`, then `fetchUpdateAsync()` if `isAvailable`, in a try/catch that swallows errors.
  - `reload()` calls `reloadAsync()` in a try/catch.
- [x] T032 [US2] Create `src/platform/updates/updates-context.tsx`:
  - `UpdatesProvider({ adapter = expoUpdatesAdapter, now = () => new Date(), children })` holds the adapter, the clock and the session `dismissed` state.
  - Then create `src/platform/updates/use-update-banner.ts`, which returns `{ visible: isUpdatePending && !dismissed, restart, dismiss }`. It subscribes to `AppState` and, on `active`, calls `checkAndFetch()` only when `adapter.isEnabled && shouldCheckForUpdate(lastCheckedAt, now())`. It doesn't check on mount. T029 passes.
- [x] T033 [US2] Implement `src/components/update-banner.tsx`:
  - A bar pinned to the bottom, inside the safe area, that doesn't cover content (FR-005). It contains the text "Update ready", a "Restart" button (`accessibilityRole="button"`, `accessibilityLabel="Restart to apply update"`) and a dismiss button (`accessibilityLabel="Dismiss update message"`).
  - Both buttons have a minimum 48×48 dp hit area (`minHeight`/`minWidth` 48, `hitSlop` if needed) (FR-008).
  - Theme-aware colours; status is not conveyed by colour alone.
  - T028 passes.
- [x] T034 [US2] Wire `src/app/_layout.tsx`: wrap the `Stack` in `UpdatesProvider` and render `<UpdateBanner {...} />` driven by `useUpdateBanner()` below the stack, as a sibling in a flex column, so it shows on every screen without covering content (FR-005).
- [x] T035 [US2] Show the banner on the emulator for a visual check. Temporarily pass a fake adapter with `isUpdatePending: true` from a development build (`npx expo run:android`), take an Expo MCP screenshot, check the 48dp targets and the light and dark themes, then remove the temporary change.
- [x] T036 [US2] Commit: `feat(001): add update-ready banner with 15-minute foreground checks`.

**Checkpoint**: Stories 3 and 2 work, and all Jest suites are green.

---

## Phase 6: User Story 5 - Builds for development, testing and release are defined (Priority: P3)

**Goal**: the development, preview and production profiles exist, the EAS project is linked,
and the update URL is configured.

**Independent test**: `npx eas-cli@latest build --profile preview --platform android` (or the
first workflow run in Phase 7) produces an installable APK on the `preview` channel.

- [x] T037 [US5] **(developer)** Log in to Expo: `! npx eas-cli@latest login`. Then the agent runs `npx eas-cli@latest init` (creates the EAS project and writes `expo.extra.eas.projectId` and `owner` to `app.json`) and `npx eas-cli@latest update:configure` (writes `expo.updates.url`). Check that `app.json` still has the T009 values.
- [x] T038 [US5] Create `eas.json` as in contracts/pipelines.md:
  - `cli.appVersionSource: "remote"`, with `cli.version` at least the installed `npx eas-cli@latest --version`.
  - `development`: `{ developmentClient: true, distribution: "internal", environment: "development" }`.
  - `preview`: `{ distribution: "internal", channel: "preview", environment: "preview", android: { buildType: "apk" } }`.
  - `production`: `{ channel: "production", environment: "production", autoIncrement: true }`.
- [x] T039 [US5] Verify the development profile locally: `npx expo run:android` installs the dev client on the emulator, connects to Metro, and shows "My food" (Story 5, scenario 3). Take an Expo MCP screenshot.
- [x] T040 [US5] Commit: `build(001): add EAS project config and development/preview/production profiles`.

---

## Phase 7: User Story 1 - Changes reach the installed app without a reinstall (Priority: P1) 🎯 Done-when

**Goal**: merging to `main` publishes a preview OTA update, or builds a new preview APK when the
fingerprint changed, with no manual step.

**Independent test**: quickstart V7 (a text change reaches the phone) and V8 (a native change
builds instead of publishing).

- [x] T041 [US1] Create `.eas/workflows/preview.yml` exactly as in contracts/pipelines.md:
  - Trigger: `on.push.branches: ['main']`.
  - Jobs:
    - `fingerprint` (`environment: preview`)
    - `get_build` (`platform: android`, `profile: preview`, `fingerprint_hash: ${{ needs.fingerprint.outputs.android_fingerprint_hash }}`, `wait_for_in_progress: true`)
    - `build`, which runs `if: ${{ !needs.get_build.outputs.build_id }}` (`platform: android`, `profile: preview`)
    - `update`, which runs `if: ${{ needs.get_build.outputs.build_id }}` (`platform: android`, `channel: preview`, `message: ${{ github.commit_message }}`)
- [x] T042 [US1] **(developer)** On expo.dev → project → GitHub, install the Expo GitHub app and connect `kka2020/fridgeit` (research R4).
- [x] T043 [US1] Commit: `ci(001): build or publish preview on merge based on native fingerprint`.

**Checkpoint**: the pipeline is ready; it first runs when the 001 PR merges (Phase 8).

---

## Phase 8: Polish, docs and the done-when run

**Purpose**: the FR-022 docs, the PR, branch protection and the end-to-end proof.

- [ ] T044 [P] Finish updating `CLAUDE.md` and `README.md`. The npm scripts, the hooks, `.claude/hooks/` and the CI workflow were added after Phase 3; add what's still missing:
  - **Commands section:** the EAS commands (`npx eas-cli@latest build --profile <p>`, `update --channel production`), and confirm `npm run e2e` is described as release build plus Maestro.
  - **Architecture section:** `src/platform/updates/`, `src/components/`, the EAS workflow in `.eas/workflows/`, and screen tests in `__tests__/app/`.
  - **README:** the release flow (merge → preview update or build).
- [ ] T045 [P] Update `docs/roadmap.md`: set 001's status to "In review" (FR-022; it becomes "Done" in T051).
- [ ] T046 Run the full local check (`npm run typecheck; npm run lint; npm run format:check; npm test`) plus `npx expo-doctor`, and confirm no `expo-updates` import exists outside `src/platform/updates/expo-updates-adapter.ts` (grep).
- [ ] T047 Run `/code-review` on the branch against `main` (constitution, Development Workflow). Fix what it finds, then rerun the T046 checks if anything changed.
- [ ] T048 Commit: `docs(001): update CLAUDE.md commands/architecture and mark 001 in review`. Push, and mark the PR ready for review. In the PR body, tick **Native runtime changed (needs a new build)**, link `specs/001-foundation/`, and attach the emulator screenshots.
- [ ] T049 **(developer)** Merge the PR once `check` is green. On expo.dev → Workflows, confirm `preview.yml` ran `build` and skipped `update` (there's no build yet). Install the APK on the phone from the build's install link.
- [ ] T050 Create the `main` ruleset from contracts/pipelines.md (require a PR with 0 approvals, require the `check` status with an up-to-date branch, block force pushes, restrict deletions, Repository admin bypass). Use `gh api repos/kka2020/fridgeit/rulesets` with the developer's confirmation, or the developer does it in the GitHub UI. Verify with quickstart V2.
- [ ] T051 **(developer, with the agent)** Done-when run (quickstart V7):
  - On a new branch, change the "My food" placeholder text and set 001's status in `docs/roadmap.md` to "Done" (FR-022), open a PR, and merge it when `check` passes.
  - Confirm the workflow ran `update` and skipped `build`.
  - Within 15 minutes, the phone shows the banner, and after a restart it shows the new text with no reinstall (SC-001, SC-002, SC-002a).
- [ ] T052 **(developer)** Banner check on the phone (quickstart V6): dismiss stays hidden after backgrounding, a cold start applies the update, and "Restart" applies it immediately. V8 (native change builds) is optional and costs one build from the free-tier quota.

---

## Dependencies & execution order

### Phase dependencies

```text
Phase 1 Setup ─▶ Phase 2 Foundational ─▶ Phase 3 US4 (checks)
                                          │
                                          ├─▶ Phase 4 US3 (My food) ─▶ Phase 5 US2 (banner) ─┐
                                          └─▶ Phase 6 US5 (EAS profiles) ───────────────────┤
                                                                                             ▼
                                                                  Phase 7 US1 (preview workflow)
                                                                                             ▼
                                                                  Phase 8 Polish + done-when
```

### User story dependencies

| Story | Depends on | Why |
|---|---|---|
| US4 | Setup | needs the scripts and the test runner |
| US3 | Foundational (for the app ID used by Maestro) | none of the others |
| US2 | Foundational (`expo-updates`), US3 (lays out on top of the screen) | |
| US5 | Foundational (app ID, runtime policy) | independent of US2 and US3 |
| US1 | US3, US2, US5 | needs something visible to change, a banner to show, and the preview profile |

### Within each story

The (test first) tasks come before the implementation and are seen failing. The domain comes
before the adapter, then the hook, then the component, then the layout wiring. Each phase ends
with a commit.

### Parallel opportunities

- **Phase 1**: T002 and T003, after T001.
- **Phase 3**: T012, T013, T014 and T015, all different files.
- **Phase 4**: T019 and T020; T023 and T024.
- **Phase 5**: T027, T028 and T029 (all tests); T031 alongside T030.
- **Phases 4–5 and Phase 6 can overlap**: Phase 6 doesn't touch `src/`.
- **Phase 8**: T044 and T045.

## Parallel example: User Story 2

```text
# Write all three failing test files together:
T027 src/domain/__tests__/update-check-policy.test.ts
T028 src/components/__tests__/update-banner.test.tsx
T029 src/platform/updates/__tests__/use-update-banner.test.tsx
# Then implement the domain rule and the adapter interface side by side:
T030 src/domain/update-check-policy.ts
T031 src/platform/updates/updates-adapter.ts + expo-updates-adapter.ts
```

## Implementation strategy

1. **Safety net first.** Phases 1–3 make every later change checked, both by CI and by the
   agent's hooks.
2. **Visible app second.** Phases 4–5 give a finished screen and banner that can be tested
   without a device.
3. **Delivery last.** Phases 6–7 need the developer's Expo account. The first preview build
   happens automatically when the PR merges.
4. **Proof.** Phase 8's done-when run is the acceptance test for the whole feature. 001 is done
   only when T051 passes.

Per CLAUDE.md, implement one phase at a time and commit after each. Stop at every
**(developer)** task and ask.

## Notes

- 001 changes the native runtime (Phase 2). Its PR must tick the native-runtime box, and its
  first preview APK comes from the workflow, not OTA.
- Never commit `android/` or `ios/`; `npx expo run:android` generates them, and they're already
  in `.gitignore`.
- The `expo-updates` APIs don't work in development builds or in Jest. All banner logic is
  exercised through the fake adapter.
