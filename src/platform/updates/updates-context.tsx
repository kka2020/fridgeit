import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

import { shouldCheckForUpdate } from "@/domain/update-check-policy";

import { expoUpdatesAdapter } from "./expo-updates-adapter";
import type { UpdatesAdapter, UpdatesStatus } from "./updates-adapter";

export interface UpdatesContextValue {
  adapter: UpdatesAdapter;
  status: UpdatesStatus;
  /** True once the user has dismissed the banner; lasts for the rest of the JS session. */
  dismissed: boolean;
  dismiss: () => void;
}

const UpdatesContext = createContext<UpdatesContextValue | undefined>(undefined);

function systemNow(): Date {
  return new Date();
}

export function UpdatesProvider({
  adapter = expoUpdatesAdapter,
  now = systemNow,
  children,
}: {
  adapter?: UpdatesAdapter;
  now?: () => Date;
  children: ReactNode;
}) {
  const [dismissed, setDismissed] = useState(false);
  const status = adapter.useStatus();

  // Latest values for the AppState listener, so it isn't re-subscribed on every status change.
  const lastCheckedAtRef = useRef(status.lastCheckedAt);
  const nowRef = useRef(now);
  useEffect(() => {
    lastCheckedAtRef.current = status.lastCheckedAt;
    nowRef.current = now;
  });

  // lastCheckedAt only changes when a check finishes, so this stops overlapping checks.
  const checkInFlightRef = useRef(false);

  // The one foreground check for the app, however many components show the banner (FR-003a).
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state !== "active" || !adapter.isEnabled || checkInFlightRef.current) return;
      if (!shouldCheckForUpdate(lastCheckedAtRef.current, nowRef.current())) return;
      checkInFlightRef.current = true;
      // The adapter never throws, but a rejection must not go unhandled either way (FR-007).
      adapter
        .checkAndFetch()
        .catch(() => {})
        .finally(() => {
          checkInFlightRef.current = false;
        });
    });
    return () => subscription.remove();
  }, [adapter]);

  const value = useMemo<UpdatesContextValue>(
    () => ({ adapter, status, dismissed, dismiss: () => setDismissed(true) }),
    [adapter, status, dismissed],
  );

  return <UpdatesContext.Provider value={value}>{children}</UpdatesContext.Provider>;
}

export function useUpdatesContext(): UpdatesContextValue {
  const context = useContext(UpdatesContext);
  if (context === undefined) {
    throw new Error("useUpdatesContext must be used inside an <UpdatesProvider>.");
  }
  return context;
}
