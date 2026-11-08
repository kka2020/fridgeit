import { StyleSheet, Text, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const colors = {
  light: { background: "#ffffff", text: "#1b1b1f", muted: "#45464f" },
  dark: { background: "#121316", text: "#e3e2e6", muted: "#c6c6d0" },
};

export default function Index() {
  const theme = colors[useColorScheme() === "dark" ? "dark" : "light"];

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        My food
      </Text>
      <Text style={[styles.body, { color: theme.muted }]}>
        Food tracking is coming soon. Updated over the air!
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
  },
  body: {
    fontSize: 16,
  },
});
