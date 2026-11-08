import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Index from "@/app/index";

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe("My food screen", () => {
  it("shows the title and the coming soon message", async () => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <Index />
      </SafeAreaProvider>,
    );

    expect(screen.getByRole("header", { name: "My food" })).toBeOnTheScreen();
    expect(
      screen.getByText("Food tracking is coming soon. Updated over the air!"),
    ).toBeOnTheScreen();
  });
});
