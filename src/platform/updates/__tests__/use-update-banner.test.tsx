import { act, render, renderHook } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import { AppState, type AppStateStatus } from "react-native";

import type { UpdatesAdapter, UpdatesStatus } from "@/platform/updates/updates-adapter";
import { UpdatesProvider } from "@/platform/updates/updates-context";
import { useUpdateBanner } from "@/platform/updates/use-update-banner";

const NOW = new Date("2026-11-07T09:00:00Z");
const now = () => NOW;

function minutesBeforeNow(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60 * 1000);
}

type FakeAdapter = UpdatesAdapter & {
  checkAndFetch: jest.Mock<Promise<void>, []>;
  reload: jest.Mock<Promise<void>, []>;
  /** Changes the status and notifies subscribers, so `useStatus()` re-renders. */
  setStatus: (status: UpdatesStatus) => void;
};

function createFakeAdapter(
  options: { isEnabled?: boolean; status?: Partial<UpdatesStatus> } = {},
): FakeAdapter {
  let status: UpdatesStatus = {
    isUpdatePending: false,
    lastCheckedAt: undefined,
    ...options.status,
  };
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const getSnapshot = () => status;

  return {
    isEnabled: options.isEnabled ?? true,
    useStatus: () => useSyncExternalStore(subscribe, getSnapshot),
    checkAndFetch: jest.fn<Promise<void>, []>(() => Promise.resolve()),
    reload: jest.fn<Promise<void>, []>(() => Promise.resolve()),
    setStatus: (next: UpdatesStatus) => {
      status = next;
      listeners.forEach((listener) => listener());
    },
  };
}

let appStateListeners: ((state: AppStateStatus) => void)[] = [];
let addEventListenerSpy: jest.SpyInstance;

beforeEach(() => {
  appStateListeners = [];
  addEventListenerSpy = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((type, listener) => {
      if (type !== "change") return { remove: jest.fn() };
      appStateListeners.push(listener);
      return {
        remove: jest.fn(() => {
          appStateListeners = appStateListeners.filter((l) => l !== listener);
        }),
      };
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderBanner(adapter: UpdatesAdapter) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <UpdatesProvider adapter={adapter} now={now}>
      {children}
    </UpdatesProvider>
  );
  return renderHook(() => useUpdateBanner(), { wrapper });
}

async function goToForeground() {
  expect(appStateListeners.length).toBeGreaterThan(0);
  await act(async () => {
    appStateListeners.forEach((listener) => listener("active"));
  });
}

describe("useUpdateBanner", () => {
  it("is hidden when no update is pending", async () => {
    const adapter = createFakeAdapter();

    const { result } = await renderBanner(adapter);

    expect(result.current.visible).toBe(false);
  });

  it("is shown when an update is pending", async () => {
    const adapter = createFakeAdapter({ status: { isUpdatePending: true } });

    const { result } = await renderBanner(adapter);

    expect(result.current.visible).toBe(true);
  });

  it("calls the adapter's reload once when restart is called", async () => {
    const adapter = createFakeAdapter({ status: { isUpdatePending: true } });
    const { result } = await renderBanner(adapter);

    await act(async () => {
      result.current.restart();
    });

    expect(adapter.reload).toHaveBeenCalledTimes(1);
  });

  it("stays hidden after dismiss, even when an update becomes pending again", async () => {
    const adapter = createFakeAdapter({ status: { isUpdatePending: true } });
    const { result } = await renderBanner(adapter);
    expect(result.current.visible).toBe(true);

    await act(async () => {
      result.current.dismiss();
    });
    expect(result.current.visible).toBe(false);

    await act(async () => {
      adapter.setStatus({ isUpdatePending: false, lastCheckedAt: NOW });
    });
    await act(async () => {
      adapter.setStatus({ isUpdatePending: true, lastCheckedAt: NOW });
    });

    expect(result.current.visible).toBe(false);
  });

  it("stays dismissed when the screen using the banner remounts", async () => {
    const adapter = createFakeAdapter({ status: { isUpdatePending: true } });
    let banner: ReturnType<typeof useUpdateBanner> | undefined;
    function Probe() {
      banner = useUpdateBanner();
      return null;
    }
    const tree = (key: string) => (
      <UpdatesProvider adapter={adapter} now={now}>
        <Probe key={key} />
      </UpdatesProvider>
    );

    const { rerender } = await render(tree("first"));
    expect(banner?.visible).toBe(true);
    await act(async () => {
      banner?.dismiss();
    });

    // A new key unmounts the old Probe and mounts a fresh one under the same provider.
    await rerender(tree("second"));

    expect(banner?.visible).toBe(false);
  });

  it("doesn't check for an update on mount", async () => {
    const adapter = createFakeAdapter();

    await renderBanner(adapter);

    expect(addEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
    expect(adapter.checkAndFetch).not.toHaveBeenCalled();
  });

  it("checks once when the app returns to the foreground and the last check was 15 or more minutes ago", async () => {
    const adapter = createFakeAdapter({ status: { lastCheckedAt: minutesBeforeNow(15) } });
    await renderBanner(adapter);

    await goToForeground();

    expect(adapter.checkAndFetch).toHaveBeenCalledTimes(1);
  });

  it("checks once when the app returns to the foreground and there has been no check yet", async () => {
    const adapter = createFakeAdapter({ status: { lastCheckedAt: undefined } });
    await renderBanner(adapter);

    await goToForeground();

    expect(adapter.checkAndFetch).toHaveBeenCalledTimes(1);
  });

  it("doesn't check when the app returns to the foreground and the last check was under 15 minutes ago", async () => {
    const adapter = createFakeAdapter({ status: { lastCheckedAt: minutesBeforeNow(14) } });
    await renderBanner(adapter);

    await goToForeground();

    expect(adapter.checkAndFetch).not.toHaveBeenCalled();
  });

  it("uses the latest check time when the status changes after mount", async () => {
    const adapter = createFakeAdapter({ status: { lastCheckedAt: undefined } });
    await renderBanner(adapter);

    // expo-updates reports a check that happened after the banner mounted (e.g. the cold-start check).
    await act(async () => {
      adapter.setStatus({ isUpdatePending: false, lastCheckedAt: minutesBeforeNow(1) });
    });
    await goToForeground();

    expect(adapter.checkAndFetch).not.toHaveBeenCalled();
  });

  it("checks once when two components use the banner and the app returns to the foreground", async () => {
    const adapter = createFakeAdapter({ status: { lastCheckedAt: undefined } });
    function Probe() {
      useUpdateBanner();
      return null;
    }
    await render(
      <UpdatesProvider adapter={adapter} now={now}>
        <Probe />
        <Probe />
      </UpdatesProvider>,
    );

    await goToForeground();

    expect(adapter.checkAndFetch).toHaveBeenCalledTimes(1);
  });

  it("doesn't start a second check while one is still running", async () => {
    const adapter = createFakeAdapter({ status: { lastCheckedAt: undefined } });
    let finishCheck: () => void = () => {};
    adapter.checkAndFetch.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishCheck = resolve;
        }),
    );
    await renderBanner(adapter);

    await goToForeground();
    await goToForeground();
    expect(adapter.checkAndFetch).toHaveBeenCalledTimes(1);

    // Once it settles (lastCheckedAt still unknown), the next foreground may check again.
    await act(async () => {
      finishCheck();
    });
    await goToForeground();
    expect(adapter.checkAndFetch).toHaveBeenCalledTimes(2);
  });

  it("never checks when updates are disabled", async () => {
    const adapter = createFakeAdapter({
      isEnabled: false,
      status: { lastCheckedAt: undefined },
    });
    await renderBanner(adapter);

    await goToForeground();

    expect(adapter.checkAndFetch).not.toHaveBeenCalled();
  });

  it("doesn't throw and leaves visible unchanged when checkAndFetch fails", async () => {
    const adapter = createFakeAdapter({ status: { isUpdatePending: true } });
    adapter.checkAndFetch.mockRejectedValue(new Error("network down"));
    const { result } = await renderBanner(adapter);

    await expect(goToForeground()).resolves.toBeUndefined();
    // Give an unhandled rejection a tick to surface: Jest fails the test if one does.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(adapter.checkAndFetch).toHaveBeenCalledTimes(1);
    expect(result.current.visible).toBe(true);
  });
});
