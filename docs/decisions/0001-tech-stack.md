# ADR 0001: Tech stack: Expo (React Native) + TypeScript

- **Status:** Accepted
- **Date:** 2026-10-12

## Context
FridgeIt has these requirements:
1. Simple over-the-air (OTA) updates for installed apps.
2. Scheduled local notifications without a server.
3. Android first, developed on a Windows PC.
4. A cheap later port to iOS, tablet and web.
5. Productive development with an AI coding agent.

Data stays on the device: no backend and no accounts.

## Decision
| Concern | Choice |
|---|---|
| App framework | Expo (SDK 57) + TypeScript (strict), Expo Router (`src/app/`) |
| Storage | `expo-sqlite` + Drizzle ORM, versioned migrations, behind a repository interface |
| Notifications | `expo-notifications` local scheduled notifications |
| Updates | EAS Update + `expo-updates`, `runtimeVersion: { policy: "fingerprint" }` |
| Builds | EAS Build, internal distribution APK |
| Dev runtime | `expo-dev-client` development build (not Expo Go) |
| Tests | Jest + `jest-expo` + React Native Testing Library; Maestro for E2E on an Android emulator |
| Quality / CI | ESLint, Prettier, `tsc --noEmit` in GitHub Actions; builds and OTA publishes in EAS Workflows |
| Agent tooling | Expo Claude Code plugin + Expo MCP server (`expo-mcp` for local emulator automation) |

## Alternatives considered
| Option | OTA (1) | Local notifications (2) | Windows → Android/iOS (3) | Web/tablet (4) | Agent fit (5) | Verdict |
|---|---|---|---|---|---|---|
| **Expo** | ✅ First-party EAS Update | ✅ | ✅ EAS cloud builds iOS | ✅ react-native-web (real DOM) | ✅ TS; official plugin + MCP | **Chosen** |
| Flutter | ⚠️ Shorebird only (third party, paid) | ✅ Finer exact-alarm control | ⚠️ iOS needs a Mac or third-party CI | ⚠️ Canvas-rendered web | ⚠️ Smaller ecosystem | Closest runner-up |
| Kotlin Multiplatform / Compose MP | ❌ New APK per update | ✅ Best | ⚠️ iOS needs a Mac | ⚠️ Wasm still maturing | ⚠️ | Fails 1 |
| Native Kotlin | ❌ | ✅ Most reliable | ✅ Android only | ❌ Rewrite | ✅ | Fails 1 and 4 |
| Capacitor / Ionic | ✅ Capgo (third party) | ✅ Plugin | ⚠️ iOS needs a Mac | ✅ | ✅ | Viable third; less native feel |
| PWA only | ✅ | ❌ No scheduled local notifications on the web | ✅ | ✅ | ✅ | Fails 2 without a backend |
| Bare React Native | ❌ CodePush retired in 2025 | ✅ | ⚠️ iOS needs a Mac | ✅ | ✅ | Hand-rolls what Expo provides |

## Consequences
- **Notification timing.** Android Doze can delay notifications by minutes, which is fine
  for day-level alerts. Verify on a real device, and ask the user to exempt the app from
  battery optimisation if needed.
- **Native code.** Native code goes through development builds and config plugins. Never
  edit `android/` or `ios/` by hand.
- **EAS free tier.** It limits monthly builds and OTA users, which is ample for a few users.
  Use local `npx expo run:android` builds during development.
- **Updates.** JS and asset changes ship over the air. Native changes alter the runtime
  fingerprint and need a new APK.
- **Revisit this decision if** OTA stops mattering (Kotlin or Flutter would then be equally
  good), or a highly custom, animation-heavy UI is wanted (Flutter would edge ahead).

Changing this decision requires a new ADR that supersedes this one.
