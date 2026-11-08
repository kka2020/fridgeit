export interface UpdatesStatus {
  isUpdatePending: boolean; // a downloaded update is waiting to be applied
  lastCheckedAt: Date | undefined; // last check since this JS session started
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
