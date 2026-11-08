import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const colors = {
  light: {
    background: "#e2e2e9",
    border: "#c4c6d0",
    text: "#1b1b1f",
    primary: "#415f91",
    onPrimary: "#ffffff",
    pressed: "#c4c6d0",
  },
  dark: {
    background: "#2a2b30",
    border: "#45464f",
    text: "#e3e2e6",
    primary: "#aac7ff",
    onPrimary: "#0a305f",
    pressed: "#45464f",
  },
};

type UpdateBannerProps = {
  visible: boolean;
  onRestart: () => void;
  onDismiss: () => void;
};

/**
 * Presentational "Update ready" bar. It is laid out in normal flow (no absolute positioning),
 * so when rendered below the navigator in a flex column it takes its own space at the bottom
 * instead of covering screen content (FR-005).
 */
export function UpdateBanner({
  visible,
  onRestart,
  onDismiss,
}: UpdateBannerProps): React.JSX.Element | null {
  const theme = colors[useColorScheme() === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          paddingBottom: insets.bottom + 8,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 8,
        },
      ]}
    >
      <Text style={[styles.message, { color: theme.text }]}>Update ready</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Restart to apply update"
        onPress={onRestart}
        style={({ pressed }) => [
          styles.button,
          styles.restart,
          { backgroundColor: theme.primary, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Text style={[styles.restartText, { color: theme.onPrimary }]}>Restart</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss update message"
        onPress={onDismiss}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: pressed ? theme.pressed : "transparent" },
        ]}
      >
        <Text style={[styles.dismissText, { color: theme.text }]}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  message: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  button: {
    minHeight: 48,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  restart: {
    paddingHorizontal: 20,
  },
  restartText: {
    fontSize: 16,
    fontWeight: "600",
  },
  dismissText: {
    fontSize: 20,
  },
});
