// The only file in the app that imports expo-updates.
import * as Updates from "expo-updates";

import type { UpdatesAdapter, UpdatesStatus } from "./updates-adapter";

function useExpoUpdatesStatus(): UpdatesStatus {
  const { isUpdatePending, lastCheckForUpdateTimeSinceRestart } = Updates.useUpdates();
  return { isUpdatePending, lastCheckedAt: lastCheckForUpdateTimeSinceRestart };
}

async function checkAndFetch(): Promise<void> {
  if (!Updates.isEnabled) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      await Updates.fetchUpdateAsync();
    }
  } catch {
    // FR-007: a failed check or download is silent; the app carries on as is.
  }
}

async function reload(): Promise<void> {
  if (!Updates.isEnabled) return;
  try {
    await Updates.reloadAsync();
  } catch {
    // Never throws; the app keeps running the current update.
  }
}

export const expoUpdatesAdapter: UpdatesAdapter = {
  isEnabled: Updates.isEnabled,
  useStatus: useExpoUpdatesStatus,
  checkAndFetch,
  reload,
};
