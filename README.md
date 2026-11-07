# FridgeIt

An Android-first Expo app that tracks the food and meals you have, each with a use-by date. It
reminds you before things go off and nudges you to log new shopping. It works offline, keeps all
data on the device, and has no backend or accounts.

**Status:** feature 001 (foundation and release pipeline) is in progress. See
[docs/roadmap.md](docs/roadmap.md) for the plan and the status of each feature.

## Setup

Requires Node 24 and npm.

```bash
npm ci
npx expo run:android   # development build on an emulator or phone
```

## Checks

```bash
npm run typecheck      # TypeScript, strict
npm run lint           # ESLint (expo lint)
npm run format:check   # Prettier (npm run format to fix)
npm test               # Jest + React Native Testing Library
npm run e2e            # Maestro flows; needs a release build on the emulator
```

The same checks run on every pull request (`.github/workflows/check.yml`), and a failing check
blocks merging.

## Releases

- **Preview, automatic:** every merge to `main` runs the EAS workflow in
  `.eas/workflows/preview.yml`. If the change is JavaScript only, it publishes an over-the-air
  update to the `preview` channel, and installed preview apps show an "Update ready" banner. If the
  change alters the native code (a new native module, native config in `app.json`, an SDK upgrade),
  it builds a new preview APK instead, which must be installed.
- **Production, manual:** build with
  `npx eas-cli@latest build --platform android --profile production`, and promote a tested preview
  update with `npx eas-cli@latest update:republish --group <id> --destination-channel production`.

## How the project works

- Features are built with [Spec Kit](https://github.com/github/spec-kit), one branch per
  feature. Each feature's spec, plan and task list live in `specs/<branch>/`.
- The project rules are in [the constitution](.specify/memory/constitution.md), and the stack
  decisions in [docs/decisions/](docs/decisions/).
- Instructions for coding agents are in [CLAUDE.md](CLAUDE.md) and [AGENTS.md](AGENTS.md).
