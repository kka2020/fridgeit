/** Minimum time between foreground update checks: 15 minutes. */
export const FOREGROUND_CHECK_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Decides whether the app should check for an over-the-air update now.
 *
 * Returns `true` when there has been no check yet, when `lastCheckedAt` is after `now`
 * (the device clock moved back), or when at least `minIntervalMs` has passed since the last
 * check. Otherwise returns `false`.
 */
export function shouldCheckForUpdate(
  lastCheckedAt: Date | undefined,
  now: Date,
  minIntervalMs: number = FOREGROUND_CHECK_INTERVAL_MS,
): boolean {
  if (lastCheckedAt === undefined) {
    return true;
  }
  const elapsedMs = now.getTime() - lastCheckedAt.getTime();
  return elapsedMs < 0 || elapsedMs >= minIntervalMs;
}
