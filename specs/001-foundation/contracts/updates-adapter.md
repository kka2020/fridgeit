# Contract: Updates adapter, banner hook and check rule

The app's internal interfaces for FR-003 to FR-008 and FR-018. `expo-updates` may be imported
**only** in `src/platform/updates/expo-updates-adapter.ts`.

## `src/domain/update-check-policy.ts`

```ts
export const FOREGROUND_CHECK_INTERVAL_MS = 15 * 60 * 1000;

export function shouldCheckForUpdate(
  lastCheckedAt: Date | undefined,
  now: Date,
  minIntervalMs?: number, // defaults to FOREGROUND_CHECK_INTERVAL_MS
): boolean;
```

Behaviour (each line is a test case, written before the implementation):

| `lastCheckedAt` | `now` | Result |
|---|---|---|
| `undefined` | any | `true` |
| T | T + 14 min 59 s | `false` |
| T | T + 15 min | `true` |
| T | T + 2 h | `true` |
| T + 5 min (future) | T | `true` |
| T | T + 1 min, with `minIntervalMs` = 30 s | `true` |

Pure TypeScript, with no imports from React, React Native or Expo.

## `src/platform/updates/updates-adapter.ts`

```ts
export interface UpdatesStatus {
  isUpdatePending: boolean;          // a downloaded update is waiting to be applied
  lastCheckedAt: Date | undefined;   // last check since this JS session started
}

export interface UpdatesAdapter {
  /** False in development builds, Expo Go and tests; all actions become no-ops. */
  readonly isEnabled: boolean;
  /** React hook: current status, re-rendering when it changes. */
  useStatus(): UpdatesStatus;
  /** Checks the server and, if an update exists, downloads it. Never throws. */
  checkAndFetch(): Promise<void>;
  /** Restarts the app on the downloaded update. Never throws. */
  reload(): Promise<void>;
}
```

`expoUpdatesAdapter` implements it:
- `isEnabled` comes from `Updates.isEnabled`.
- `useStatus()` reads `useUpdates()`.
- `checkAndFetch()` calls `checkForUpdateAsync()`, then `fetchUpdateAsync()` when
  `isAvailable` is true. Any rejection is swallowed (FR-007).
- `reload()` calls `reloadAsync()`.

## `src/platform/updates/updates-context.tsx`

```tsx
export function UpdatesProvider(props: {
  adapter?: UpdatesAdapter;          // defaults to expoUpdatesAdapter; tests pass a fake
  now?: () => Date;                  // defaults to () => new Date(); tests pass a fixed clock
  children: React.ReactNode;
}): JSX.Element;
```

The provider also holds the session's `dismissed` flag, so it survives screen remounts.

## `src/platform/updates/use-update-banner.ts`

```ts
export function useUpdateBanner(): {
  visible: boolean;            // isUpdatePending && !dismissed
  restart: () => void;         // adapter.reload()
  dismiss: () => void;         // dismissed = true for the rest of the session
};
```

Side effect: subscribes to `AppState`. On each change to `active`, if `adapter.isEnabled` and
`shouldCheckForUpdate(status.lastCheckedAt, now())` returns true, it calls
`adapter.checkAndFetch()`. It doesn't check on mount; the cold-start check belongs to
`expo-updates` (`ON_LOAD`).

**Required test cases** (`__tests__/use-update-banner.test.tsx`, with a fake adapter):

| Case | Expected |
|---|---|
| No update pending | `visible` is false |
| Update pending | `visible` is true |
| `restart()` called | the fake's `reload` is called once |
| `dismiss()`, then the update becomes pending again | `visible` stays false |
| App returns to the foreground, last check ≥ 15 min ago | `checkAndFetch` is called once |
| App returns to the foreground, last check < 15 min ago | `checkAndFetch` isn't called |
| `isEnabled` is false | `checkAndFetch` is never called |
| `checkAndFetch` fails | no throw; `visible` is unchanged |

## `src/components/update-banner.tsx`

```tsx
export function UpdateBanner(props: {
  visible: boolean;
  onRestart: () => void;
  onDismiss: () => void;
}): JSX.Element | null;
```

- Renders nothing when `visible` is false.
- Otherwise renders a bar pinned to the bottom, inside the safe area, that doesn't cover screen
  content (FR-005). It contains:
  - The text "Update ready".
  - A "Restart" button: `accessibilityRole="button"`, `accessibilityLabel="Restart to apply
    update"`.
  - A dismiss button: `accessibilityRole="button"`, `accessibilityLabel="Dismiss update
    message"`.
- Both buttons have a minimum 48 × 48 dp hit area (FR-008).

**Required test cases**: hidden when not visible; text and both buttons shown when visible;
pressing each button calls its callback; both buttons can be found by their accessibility labels.

## `src/app/index.tsx` ("My food")

- Title "My food".
- Placeholder text: "Food tracking is coming soon."
- Test: `__tests__/app/index.test.tsx` asserts both are rendered.
