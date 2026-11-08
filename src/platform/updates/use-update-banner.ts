import { useCallback } from "react";

import { useUpdatesContext } from "./updates-context";

/** Banner state. The foreground update check itself runs once, in `UpdatesProvider`. */
export function useUpdateBanner(): { visible: boolean; restart: () => void; dismiss: () => void } {
  const { adapter, status, dismissed, dismiss } = useUpdatesContext();

  const restart = useCallback(() => {
    adapter.reload().catch(() => {});
  }, [adapter]);

  return { visible: status.isUpdatePending && !dismissed, restart, dismiss };
}
