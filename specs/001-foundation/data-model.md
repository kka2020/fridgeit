# Data Model: Foundation and Release Pipeline

**Feature**: `001-foundation` | **Date**: 2026-10-13

001 stores no user data and has no database. The "entities" are configuration objects, plus
the in-memory state of the update banner.

## Configuration entities

### Build profile (`eas.json` → `build.<name>`)

| Profile | `distribution` | `channel` | `environment` | Android output | Other |
|---|---|---|---|---|---|
| `development` | `internal` | none (loads JS from Metro) | `development` | APK (debug, dev client) | `developmentClient: true` |
| `preview` | `internal` | `preview` | `preview` | APK (`buildType: "apk"`) | Built automatically by the workflow when the fingerprint changes |
| `production` | store (default) | `production` | `production` | AAB (default) | `autoIncrement: true`; built manually; not used in 001 |

Rules:
- Each profile follows exactly one channel. `preview` and `production` builds never share a
  channel (Story 5, scenario 2).
- `cli.appVersionSource: "remote"`: EAS owns `versionCode`.

### Update channel

| Channel | Fed by | Promotion |
|---|---|---|
| `preview` | The `.eas/workflows/preview.yml` `update` job on every merge to `main` whose fingerprint already has a preview build | Automatic |
| `production` | A manual `eas update --channel production`, or republishing a tested preview update | Manual only (FR-010) |

### Runtime identity

- `runtimeVersion: { "policy": "fingerprint" }` in `app.json`.
- A hash of the native project. A build accepts only updates with the same hash (FR-011).
- Changes when native modules, native config in `app.json`, config plugins or the SDK change.
  JS and asset changes leave it unchanged.

### App identity (`app.json`)

| Key | Value |
|---|---|
| `expo.android.package` | `com.kavinkodikara.fridgeit` (permanent, FR-013) |
| `expo.updates.url` | Written by `eas update:configure` |
| `expo.extra.eas.projectId` | Written by `eas init` |
| `expo.updates.checkAutomatically` | `ON_LOAD` (default; stated explicitly) |
| `expo.updates.fallbackToCacheTimeout` | `0` (never delay launch) |

## Runtime state: update banner

Held in memory by `useUpdateBanner()` for the current JS session; nothing is saved to disk.

| Field | Type | Source |
|---|---|---|
| `isUpdatePending` | boolean | `UpdatesAdapter.useStatus()` (backed by `useUpdates().isUpdatePending`) |
| `lastCheckedAt` | `Date \| undefined` | `UpdatesAdapter.useStatus()` (backed by `lastCheckForUpdateTimeSinceRestart`) |
| `dismissed` | boolean | Local state in the provider, so it survives screen remounts; resets on cold start |
| `visible` | boolean (derived) | `isUpdatePending && !dismissed` |

### Banner state transitions

```text
            update downloaded                 tap "Restart"
 Hidden ───────────────────────▶ Shown ──────────────────────▶ Restarting ─▶ (new version, Hidden)
   ▲                               │
   │          tap dismiss          ▼
   └──────────── Dismissed (hidden until next cold start; later downloads don't re-show it)

 Cold start with an update pending ─▶ the update is applied at launch ─▶ Hidden
```

### Foreground check rule (domain)

`shouldCheckForUpdate(lastCheckedAt: Date | undefined, now: Date, minIntervalMs = 15 min): boolean`

- `true` when `lastCheckedAt` is `undefined`.
- `true` when `now - lastCheckedAt >= minIntervalMs`.
- `true` when `lastCheckedAt` is after `now`, for example after the clock was set back, so a
  clock change can never block checks.
- `false` otherwise.
