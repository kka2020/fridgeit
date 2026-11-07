import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { expoUpdatesAdapter } from "./expo-updates-adapter";
import type { UpdatesAdapter } from "./updates-adapter";

export interface UpdatesContextValue {
  adapter: UpdatesAdapter;
  now: () => Date;
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

  const value = useMemo<UpdatesContextValue>(
    () => ({ adapter, now, dismissed, dismiss: () => setDismissed(true) }),
    [adapter, now, dismissed],
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
