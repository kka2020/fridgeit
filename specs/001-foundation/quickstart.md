# Quickstart: validating Foundation and Release Pipeline

How to prove that 001 works, scenario by scenario. Interfaces are defined in
[contracts/](./contracts/); decisions are explained in [research.md](./research.md).

## Prerequisites (one-off)

| What | How |
|---|---|
| Node 24 and npm | Already installed |
| Expo account login | `! npx eas-cli@latest login` (interactive) |
| EAS project and update URL | `npx eas-cli@latest init`, then `npx eas-cli@latest update:configure` |
| EAS ↔ GitHub link | expo.dev → project → GitHub: install the Expo GitHub app and connect `kka2020/fridgeit` |
| `adb` on PATH | Add `%LOCALAPPDATA%\Android\Sdk\platform-tools` to the user PATH |
| Maestro CLI | Java 17+ (23 installed); extract `maestro.zip` to `C:\maestro` and add `C:\maestro\bin` to PATH; check with `maestro --help` |
| Android emulator | Android Studio → Device Manager → start an emulator; `adb devices` lists it |

## V1. Local checks are green (SC-007, FR-015)

```powershell
npm ci
npm run typecheck; npm run lint; npm run format:check; npm test
```

**Expected**: all four exit 0. The test run includes the domain rule, the banner, the banner hook
and the "My food" screen suites.

## V2. CI blocks a bad change (Story 4, SC-003)

1. On a scratch branch, add a type error, then push and open a draft PR.
2. **Expected**: the `check` job fails, and the PR shows "Merging is blocked" (once the ruleset
   exists).
3. Fix the error and push. **Expected**: `check` passes and merging is allowed. Close the draft.

## V3. Agent hooks (FR-020, FR-021)

```powershell
'{"tool_name":"Write","tool_input":{"file_path":"C:\\Users\\kavin\\Projects\\fridgeit\\src\\domain\\update-check-policy.ts"}}' | node .claude/hooks/format-and-lint.mjs; $LASTEXITCODE
'{"session_id":"qs","stop_hook_active":false}' | node .claude/hooks/check-on-stop.mjs; $LASTEXITCODE
```

**Expected**:
- **Clean code**: both commands exit 0.
- **With a failing test added**: the Stop hook exits 2 three times in a row (passing
  `stop_hook_active: true` after the first), then exits 0 with a `systemMessage` the fourth time.
- **In a real session**: ask Claude to edit a file with messy formatting, and it gets
  reformatted.

## V4. "My food" screen and offline launch (Story 3, SC-005)

```powershell
npx expo run:android --variant release
```

**Expected**:
- The app opens to "My food" with the placeholder text, and has no tabs or template screens.
- With airplane mode on, a relaunch still shows the screen in under 2 s, with no error and no
  banner.
- Check this with Expo MCP screenshots.

## V5. End-to-end flow (FR-019)

With the release build from V4 installed on the running emulator:

```powershell
npm run e2e
```

**Expected**: `launch.yaml` passes ("My food" is visible).

## V6. Update banner on a real build (Story 2)

On a preview build, after publishing an update to `preview`:
1. Open the app, background it for 15 minutes or more, then bring it back. Alternatively, cold
   start it.
2. **Expected**: "Update ready" appears at the bottom without covering the content.
3. Tap the dismiss button, then background and foreground the app.
   **Expected**: the banner stays hidden.
4. Cold start the app. **Expected**: the new version is running.
5. Repeat with a new update, but tap "Restart". **Expected**: the app reloads straight onto the
   new version.

## V7. Done when: a merged change reaches the phone (Story 1, SC-001, SC-002)

1. Merge the 001 PR. On expo.dev → Workflows, `preview.yml` runs. No preview build exists yet,
   so the `build` job runs and `update` is skipped.
2. Open the build's install link or QR code on the phone and side-load the APK.
3. Set up the `main` ruleset (see [contracts/pipelines.md](./contracts/pipelines.md)).
4. In a new PR, change the "My food" placeholder text. Merge it when `check` passes.
5. **Expected**: the workflow runs `update`, and `build` is skipped (SC-002a), with no manual
   step.
6. Within 15 minutes, opening the app shows the banner; after one restart, the new text appears.
   That's at most two restarts and no reinstall (SC-001).

## V8. Native change builds instead of publishing (Story 1, scenario 4, SC-006)

1. In a PR, make a native-only change, for example adding an `app.json` Android permission.
   Tick the "native runtime" box in the PR template and merge.
2. **Expected**: the workflow runs `build` and skips `update`. The phone stays on its current
   version until the new APK is installed.
3. Revert the change afterwards, if it was only a test.
