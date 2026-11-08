import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { UpdateBanner } from "@/components/update-banner";

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

const RESTART_LABEL = "Restart to apply update";
const DISMISS_LABEL = "Dismiss update message";

async function renderBanner(visible: boolean) {
  const onRestart = jest.fn();
  const onDismiss = jest.fn();
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <UpdateBanner visible={visible} onRestart={onRestart} onDismiss={onDismiss} />
    </SafeAreaProvider>,
  );
  return { onRestart, onDismiss };
}

describe("UpdateBanner", () => {
  it("renders nothing when not visible", async () => {
    await renderBanner(false);

    expect(screen.queryByText("Update ready")).toBeNull();
    expect(screen.queryByLabelText(RESTART_LABEL)).toBeNull();
    expect(screen.queryByLabelText(DISMISS_LABEL)).toBeNull();
  });

  it("shows the text and both buttons when visible", async () => {
    await renderBanner(true);

    expect(screen.getByText("Update ready")).toBeOnTheScreen();
    expect(screen.getByLabelText(RESTART_LABEL)).toBeOnTheScreen();
    expect(screen.getByLabelText(DISMISS_LABEL)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: RESTART_LABEL })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: DISMISS_LABEL })).toBeOnTheScreen();
  });

  it("calls onRestart when the Restart button is pressed", async () => {
    const { onRestart, onDismiss } = await renderBanner(true);

    await fireEvent.press(screen.getByRole("button", { name: RESTART_LABEL }));

    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("calls onDismiss when the Dismiss button is pressed", async () => {
    const { onRestart, onDismiss } = await renderBanner(true);

    await fireEvent.press(screen.getByRole("button", { name: DISMISS_LABEL }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onRestart).not.toHaveBeenCalled();
  });
});
