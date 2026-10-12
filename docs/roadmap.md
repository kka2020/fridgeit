# FridgeIt roadmap

FridgeIt tracks the food and meals you have, each with a use-by date. It reminds you before
things go off, and nudges you to log new shopping. It runs Android-first, offline, with data
kept on the device. Updates reach installed phones over the air (EAS Update).

Each feature is built with the Spec Kit loop on its own branch (`NNN-short-name`), with its
specs in `specs/NNN-short-name/`. Build them in order: each one is a thin vertical slice
on top of the previous ones.

| # | Feature | Status |
|---|---|---|
| 001 | Foundation and release pipeline | Not started |
| 002 | Food inventory | Not started |
| 003 | Smart expiry defaults | Not started |
| 004 | Expiry notifications | Not started |
| 005 | Add-food reminders | Not started |

Update the status column in the PR that completes each feature.

## 001: Foundation and release pipeline
A walking skeleton, so that every later feature ships through a working pipeline.
- Tooling: TypeScript strict, ESLint and Prettier, Jest with `jest-expo` and React Native
  Testing Library, and a GitHub Actions check workflow (typecheck, lint, test).
- EAS: `eas.json` with `development`, `preview` and `production` profiles, an internal
  distribution APK, `expo-updates` with `runtimeVersion: { policy: "fingerprint" }`, and EAS
  Workflows that publish an OTA update to the `preview` channel on merge to `main`.
- In-app "Update ready, restart" prompt (`useUpdates()`).
- Placeholder "My food" screen.
- Set the Android package name (`android.package`) before the first EAS build.
- Claude Code hooks: format and lint on edit, plus typecheck and tests on stop.
- **Done when:** the preview APK is installed on a phone, a text change is merged, and the
  phone shows it after a restart, with no reinstall.

## 002: Food inventory
- Add, edit and delete items. Each item has:
  - name
  - type: ingredient or meal
  - storage: fridge, freezer or pantry
  - optional quantity
  - expiry date
  - added date
  - notes
- The list is sorted by soonest expiry, with fresh, expiring-soon and expired states.
- Items can be marked "used" or "binned"; the history is kept for later waste stats.
- Local SQLite (`expo-sqlite` + Drizzle) behind a repository interface, with versioned
  migrations.

## 003: Smart expiry defaults
A pure-domain rules table (in `src/domain/`) that the user can override.
- **Cooked meal in the fridge:** eat or freeze within 2 days (UK FSA guidance) or 3–4 days
  (USDA). Decide which in `/speckit-clarify`.
- **Meal in the freezer:** about 3 months, for best quality.
- **Ingredient categories** (fresh meat or fish 1–2 days, dairy, vegetables, …) only
  pre-fill the date. The packaging date always wins.
- Moving an item from the fridge to the freezer recalculates its date.

## 004: Expiry notifications
- Local scheduled notifications (`expo-notifications`). No push server.
- Configurable lead times. The default is one day before and the morning of expiry, at
  09:00.
- Items due on the same day are batched into one notification.
- Tapping a notification opens the item.
- Covers the permission flow (Android 13+) and an Android notification channel.
- Notifications are derived state: `reconcileNotifications()` cancels all of them and
  reschedules from `planNotifications(items, settings, now)`. It runs on item changes, on
  app foreground and at boot. Unit tests cover `planNotifications` exhaustively.

## 005: Add-food reminders
- A "Logged your shopping?" reminder at a configurable time.
- By default it fires 3 days after the last item was added, so each add re-arms it instead
  of it running on a fixed schedule.
- It can be snoozed or turned off in Settings.

## Out of scope for now
Barcode scanning, the iOS build, web and tablet layouts, cloud sync and sharing, waste
stats.
