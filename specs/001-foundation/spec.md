# Feature Specification: Foundation and Release Pipeline

**Feature Branch**: `001-foundation`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "001 Foundation and release pipeline: a walking skeleton so every later feature ships through a working pipeline. Tooling: TypeScript strict, ESLint and Prettier, Jest with jest-expo and React Native Testing Library, and a GitHub Actions check workflow (typecheck, lint, test). EAS: eas.json with development, preview and production profiles, an internal distribution APK, expo-updates with runtimeVersion policy "fingerprint", and EAS Workflows that publish an OTA update to the preview channel on merge to main. In-app "Update ready, restart" prompt (useUpdates()). Placeholder "My food" screen. Set the Android package name (android.package) before the first EAS build. Claude Code hooks: format and lint on edit, plus typecheck and tests on stop. Done when: the preview APK is installed on a phone, a text change is merged, and the phone shows it after a restart, with no reinstall."

## Clarifications

### Session 2026-10-12

- Q: Which Android application ID should FridgeIt use? → A: `com.kavinkodikara.fridgeit`
- Q: Should 001 set up end-to-end device tests, and run them automatically? → A: Yes, one flow
  (launch shows "My food"), run locally on the emulator only.

## User Scenarios & Testing *(mandatory)*

This feature has two kinds of user: the **phone user**, who installs and runs FridgeIt, and
the **developer** (a human or a coding agent), who changes it. It delivers no food-tracking
features yet; its value is that every later feature reaches the phone safely and quickly.

### User Story 1 - Changes reach the installed app without a reinstall (Priority: P1)

The phone user installs the preview build of FridgeIt once. From then on, when a change is
merged into the main line of development, the app on their phone picks it up by itself and
shows it after a restart. They never have to download or install a new app file for a change
that doesn't touch native code.

**Why this priority**: This is the feature's "done when" condition and the reason it exists.
Every later feature (inventory, expiry defaults, notifications) depends on being able to put
changes in front of the user cheaply.

**Independent Test**: Install the preview build on a phone, merge a visible text change to the
placeholder screen, wait for the update to publish, restart the app, and confirm the new text
appears with no reinstall.

**Acceptance Scenarios**:

1. **Given** the preview build is installed and the phone is online, **When** a text change to
   the "My food" screen is merged to the main line, **Then** an update is published to the
   preview audience automatically, with no manual publish step.
2. **Given** an update has been published to the preview audience, **When** the user opens the
   app, **Then** the app downloads the update in the background and the user can keep using the
   current version meanwhile.
3. **Given** the update has finished downloading, **When** the user restarts the app (from the
   prompt in Story 2, or by closing and reopening it), **Then** the changed text is shown.
4. **Given** a merged change alters the app's native runtime, **When** it is published, **Then**
   installed builds with a different native runtime do not receive it, and keep working on
   their current version.

---

### User Story 2 - The user is told when an update is ready (Priority: P2)

When a downloaded update is waiting, the app shows an unobtrusive "Update ready" message with a
"Restart" action, so the user can apply it straight away instead of waiting for the next cold
start.

**Why this priority**: Story 1 works without it (an update applies on the next cold start),
but the prompt makes updates visible and fast to apply, which shortens the feedback loop.

**Independent Test**: With an update downloaded and pending, open the app and confirm the
prompt appears; tap "Restart" and confirm the app reloads on the new version. With no update
pending, confirm no prompt appears.

**Acceptance Scenarios**:

1. **Given** no update is pending, **When** the user opens the app, **Then** no update prompt
   is shown.
2. **Given** an update has finished downloading, **When** the app is in the foreground,
   **Then** an "Update ready" message with a "Restart" action is shown without blocking the
   rest of the screen.
3. **Given** the prompt is shown, **When** the user taps "Restart", **Then** the app reloads
   and runs the new version.
4. **Given** the prompt is shown, **When** the user ignores or dismisses it, **Then** the app
   keeps working, and the update applies on the next cold start.

---

### User Story 3 - The app opens to a "My food" home screen (Priority: P2)

The phone user opens FridgeIt and lands on a "My food" screen. For now it holds a short
placeholder message explaining that food tracking is coming, replacing the starter template
content.

**Why this priority**: It gives the update in Story 1 something visible to change, and it
becomes the home of the inventory list in feature 002.

**Independent Test**: Launch the app and confirm the "My food" title and placeholder message
are shown, with no starter-template content anywhere in the app.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** the user opens the app, **Then** the "My food" screen is
   the first screen shown, with its title and a placeholder message.
2. **Given** the app is open, **When** the user looks for other screens or tabs, **Then** there
   are none left over from the starter template.
3. **Given** the phone has no network connection, **When** the user opens the app, **Then** the
   "My food" screen still loads normally.

---

### User Story 4 - Every change is checked automatically (Priority: P1)

When the developer proposes a change, the type checker, linter, formatter check and test suite
run automatically, and a failing check blocks the change from merging. While a coding agent
edits files, formatting and linting run on each edit, and type checking and tests run before
the agent hands work back.

**Why this priority**: The constitution requires typecheck, lint and tests to be green before
merging, and that rule needs to be enforced by the pipeline rather than by memory. Without it,
Story 1 would ship broken changes to the phone automatically.

**Independent Test**: Open a change containing a deliberate type error and confirm the check
fails and merging is blocked; fix it and confirm the check passes. Separately, have the agent
edit a file with bad formatting and confirm it is reformatted on save.

**Acceptance Scenarios**:

1. **Given** a proposed change, **When** it is opened or updated, **Then** type checking,
   linting, the formatting check and the tests run automatically and report pass or fail on the
   change.
2. **Given** any of those checks fails, **When** someone tries to merge, **Then** the merge is
   blocked until the check passes.
3. **Given** a developer runs the documented local commands, **When** the code is correct,
   **Then** typecheck, lint and tests all pass locally with the same results as the automatic
   check.
4. **Given** a coding agent edits a source file, **When** the edit is saved, **Then** the file
   is formatted and linted automatically, and any lint errors are reported back to the agent.
5. **Given** a coding agent finishes a turn, **When** it stops, **Then** typecheck and tests
   run, and failures are reported back to the agent before it hands over.

---

### User Story 5 - Builds for development, testing and release are defined (Priority: P3)

The developer can produce three kinds of build from the same code: a development build for
day-to-day work on an emulator or phone, a preview build installable directly on a phone
(without a store) that follows the preview update audience, and a production build that
follows the production update audience. The app has a permanent Android application ID before
the first build.

**Why this priority**: Story 1 needs at least the preview build. Development and production
builds are needed soon after but are not on the critical path to the "done when" condition.

**Independent Test**: Request each build type from the build service and confirm it succeeds;
install the preview build on a phone by downloading the file directly.

**Acceptance Scenarios**:

1. **Given** the build configuration, **When** a preview build is requested, **Then** it
   produces an installable file that can be side-loaded on an Android phone and receives
   preview updates.
2. **Given** the build configuration, **When** a production build is requested, **Then** it
   receives only production updates, never preview ones.
3. **Given** the build configuration, **When** a development build is requested, **Then** it
   runs on the emulator and connects to the local development server.
4. **Given** the app configuration, **When** any build is made, **Then** it uses the agreed
   permanent Android application ID.

---

### Edge Cases

- **Phone offline at launch**: the app starts on the version it already has, with no error, no
  prompt and no delay waiting for the network.
- **Update download fails or is interrupted**: the app keeps running the current version
  silently and retries on a later launch; no error is shown to the user.
- **A published update crashes on launch**: the app falls back to the last working version
  rather than staying broken.
- **Two changes merged in quick succession**: the phone ends up on the latest one; it never
  regresses to the older update.
- **Native change merged**: builds with the old native runtime never receive the incompatible
  update (Story 1, scenario 4); the change needs a new build, and the change description must
  say so (constitution, principle VII).
- **Check pipeline fails for infrastructure reasons** (not code): the change stays blocked, and
  the check can be re-run without new commits.
- **Restart tapped while the user is mid-action**: acceptable for this feature, since the
  placeholder screen holds no unsaved state; revisit once data entry exists (feature 002).

## Requirements *(mandatory)*

### Functional Requirements

**App**

- **FR-001**: The app MUST open to a "My food" screen with a title and a placeholder message, as
  the only screen.
- **FR-002**: All starter-template screens, tabs, components and assets that the app no longer
  uses MUST be removed.
- **FR-003**: The app MUST check for updates in the background on launch, without delaying
  startup or blocking use while it checks or downloads.
- **FR-004**: When a downloaded update is pending, the app MUST show an "Update ready" message
  with a "Restart" action that applies the update immediately.
- **FR-005**: The update message MUST NOT be shown when no update is pending, and MUST NOT block
  the rest of the screen.
- **FR-006**: A pending update that the user does not apply MUST apply on the next cold start.
- **FR-007**: The app MUST work fully with no network connection; update checks MUST fail
  silently.
- **FR-008**: The "Restart" action MUST have an accessibility label and a touch target of at
  least 48dp.

**Releases**

- **FR-009**: Merging a change into the main line MUST automatically publish an update to the
  preview audience.
- **FR-010**: Promoting an update to the production audience MUST be a separate, manual step.
- **FR-011**: Each build MUST only accept updates made for the same native runtime; a change to
  the native runtime MUST produce a distinct runtime identity automatically, with no manual
  version bump.
- **FR-012**: There MUST be three build profiles: development, preview (directly installable,
  internal distribution, preview audience) and production (production audience).
- **FR-013**: The app MUST have the permanent Android application ID
  `com.kavinkodikara.fridgeit`, set before the first build.

**Quality checks**

- **FR-014**: Type checking MUST run in strict mode.
- **FR-015**: The project MUST have one documented command each for typecheck, lint, format
  check and tests, and they MUST pass on the finished feature.
- **FR-016**: Typecheck, lint, the format check and tests MUST run automatically on every
  proposed change and every push to the main line, and a failure MUST block merging.
- **FR-017**: The "My food" screen and the update prompt MUST have automated UI tests covering
  their key states (placeholder shown; prompt hidden, prompt shown, restart triggered).
- **FR-018**: The update prompt's logic MUST be testable without a real update service.
- **FR-019**: The feature MUST include one end-to-end device test of its primary journey:
  launch the app and see the "My food" screen. It runs locally on the Android emulator with a
  documented command; it does not run in the automatic checks on each change.

**Agent workflow**

- **FR-020**: When a coding agent edits a source file, the file MUST be formatted and linted
  automatically, with lint errors reported back to the agent.
- **FR-021**: When a coding agent finishes a turn, typecheck and tests MUST run, with failures
  reported back to the agent.
- **FR-022**: `CLAUDE.md` MUST be updated with any new or changed commands, and
  `docs/roadmap.md` MUST mark feature 001 as done in the feature's change.

### Key Entities

- **Build profile**: a named way of building the app (development, preview, production), with
  its distribution method and the update audience it follows.
- **Update audience (channel)**: a named stream of updates (preview, production) that builds
  subscribe to.
- **Runtime identity**: a fingerprint of the app's native code; an update is only delivered to
  builds with the same identity.
- **Update**: a published bundle of app code and assets for one audience and one runtime
  identity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visible text change merged to the main line appears on an installed preview
  build within 15 minutes of merging, after at most two app restarts, with zero reinstalls.
- **SC-002**: The developer spends zero manual steps publishing a preview update after merging.
- **SC-003**: 100% of proposed changes run the automatic checks, and a change with a type error,
  lint error, formatting error or failing test cannot be merged.
- **SC-004**: The automatic checks finish in under 10 minutes for a typical change.
- **SC-005**: The app reaches the "My food" screen in under 2 seconds on a mid-range Android
  phone, both online and offline.
- **SC-006**: A change that alters the native runtime never reaches a build with an older
  native runtime (0 incompatible updates delivered).
- **SC-007**: On a clean checkout, typecheck, lint, format check and tests all pass.

## Assumptions

- **Stack**: the tools are fixed by ADR 0001 (Expo SDK 57, EAS Build/Update/Workflows, Jest with
  `jest-expo` and React Native Testing Library, ESLint, Prettier, GitHub Actions for checks).
  The spec describes outcomes; the plan names the tools.
- **Who installs**: the preview build is side-loaded by a small number of known testers (the
  developer and family); no app store listing is part of this feature.
- **Building the preview APK** is a manual step the developer triggers; only update publishing
  is automatic on merge. Automating native builds is out of scope.
- **Production** builds and promotion are defined but not exercised; the "done when" condition
  only uses the preview path.
- **Hosting**: the code is hosted on GitHub, and the developer has an Expo account with EAS
  access on the free tier.
- **Branch protection**: blocking merges on failing checks is configured in the repository host
  settings by the developer; the feature documents the required checks.
- **Update check timing**: the default "check on launch, apply on next launch" behaviour is
  used, plus the in-app prompt. That is why SC-001 allows up to two restarts.
- **Network**: update checks and downloads are the only network traffic, as the constitution
  allows; no analytics or crash reporting are added.
- **End-to-end tests** run locally only for now. Running them automatically (in CI or the
  build service) can be added later without changing the flow itself.
- **Orientation and theme** stay as currently configured (portrait, follows the system light or
  dark setting).
