import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { shouldCheckForUpdate } from "@/domain/update-check-policy";

import { useUpdatesContext } from "./updates-context";

export function useUpdateBanner(): { visible: boolean; restart: () => void; dismiss: () => void } {
  const { adapter, now, dismissed, dismiss } = useUpdatesContext();
  const status = adapter.useStatus();

  // Latest values for the AppState listener, so it isn't re-subscribed on every status change.
  const lastCheckedAtRef = useRef(status.lastCheckedAt);
  const nowRef = useRef(now);
  useEffect(() => {
    lastCheckedAtRef.current = status.lastCheckedAt;
    nowRef.current = now;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state !== "active" || !adapter.isEnabled) return;
      if (!shouldCheckForUpdate(lastCheckedAtRef.current, nowRef.current())) return;
      // The adapter never throws, but a rejection must not go unhandled either way (FR-007).
      adapter.checkAndFetch().catch(() => {});
    });
    return () => subscription.remove();
  }, [adapter]);

  const restart = useCallback(() => {
    adapter.reload().catch(() => {});
  }, [adapter]);

  return { visible: status.isUpdatePending && !dismissed, restart, dismiss };
}
