# Contract: Pipelines, build configuration and repository rules

## npm scripts (`package.json`), FR-015

| Script | Command | Used by |
|---|---|---|
| `typecheck` | `tsc --noEmit` | CI, the Stop hook, developer |
| `lint` | `expo lint` | CI, developer |
| `format` | `prettier --write .` | developer |
| `format:check` | `prettier --check .` | CI |
| `test` | `jest` | CI (`-- --ci`), the Stop hook (`-- --silent`), developer |
| `e2e` | `maestro test .maestro` | developer (emulator with a release build installed) |

The `reset-project` script is removed. `start`, `android`, `ios` and `web` stay.

## GitHub Actions: `.github/workflows/check.yml`, FR-016

- **Triggers**: `pull_request` (all branches) and `push` to `main`.
- **Job id and required status name**: `check`.
- **Runner**: `ubuntu-latest`, `timeout-minutes: 15`.
- **Steps**:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` (`node-version: 24`, `cache: npm`)
  3. `npm ci`
  4. `npm run typecheck`
  5. `npm run lint`
  6. `npm run format:check`
  7. `npm test -- --ci`
- **Secrets**: none.

## Repository ruleset on `main` (configured after the first `check` run), FR-016a

| Rule | Setting |
|---|---|
| Require a pull request before merging | on, 0 required approvals |
| Require status checks to pass | `check`, and the branch must be up to date |
| Block force pushes | on |
| Restrict deletions | on |
| Bypass list | Repository admin, "always" (emergencies only) |

## PR template: `.github/pull_request_template.md`

It has these sections:
- **Summary**
- **Spec**: link to `specs/<branch>/`
- **Checks**: typecheck, lint and tests pass locally
- **Native runtime**: a required checkbox, "This change alters the native runtime
  (new native module, native `app.json` config, SDK upgrade) and needs a new build"
  (principle VII)
- **UI verified on the emulator**: with screenshots

## `eas.json`

```jsonc
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal", "environment": "development" },
    "preview":     { "distribution": "internal", "channel": "preview", "environment": "preview",
                     "android": { "buildType": "apk" } },
    "production":  { "channel": "production", "environment": "production", "autoIncrement": true }
  }
}
```

The `cli.version` floor is set to whatever `npx eas-cli@latest --version` reports when this is
implemented.

## EAS Workflow: `.eas/workflows/preview.yml`, FR-009 and FR-009a

| Job id | `type` | `needs` | `if` | Key params |
|---|---|---|---|---|
| `fingerprint` | `fingerprint` | none | none | `environment: preview` |
| `get_build` | `get-build` | `fingerprint` | none | `platform: android`, `profile: preview`, `fingerprint_hash: ${{ needs.fingerprint.outputs.android_fingerprint_hash }}`, `wait_for_in_progress: true` |
| `build` | `build` | `get_build` | `${{ !needs.get_build.outputs.build_id }}` | `platform: android`, `profile: preview` |
| `update` | `update` | `get_build` | `${{ needs.get_build.outputs.build_id }}` | `platform: android`, `channel: preview`, `message: ${{ github.commit_message }}` |

- **Trigger**: `on: push: branches: ['main']`.
- **Invariant**: exactly one of `build` and `update` runs per merge.
- **Prerequisites**:
  - The EAS project exists (`eas init`).
  - `eas update:configure` has run.
  - The GitHub repository `kka2020/fridgeit` is linked to the EAS project.

## Production (manual), FR-010

- **Build**: `npx eas-cli@latest build --platform android --profile production`
- **Promote a tested preview update**: `npx eas-cli@latest update:republish --group <id>
  --destination-channel production`, or publish directly with
  `npx eas-cli@latest update --channel production`.

## Maestro flow: `.maestro/launch.yaml`, FR-019

```yaml
appId: com.kavinkodikara.fridgeit
---
- launchApp:
    clearState: true
- assertVisible: "My food"
```
