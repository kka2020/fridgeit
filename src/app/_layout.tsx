import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StyleSheet, useColorScheme, View } from "react-native";

import { UpdateBanner } from "@/components/update-banner";
import { UpdatesProvider } from "@/platform/updates/updates-context";
import { useUpdateBanner } from "@/platform/updates/use-update-banner";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <UpdatesProvider>
        <View style={styles.root}>
          <Stack>
            <Stack.Screen name="index" options={{ title: "My food" }} />
          </Stack>
          <RootUpdateBanner />
        </View>
      </UpdatesProvider>
    </ThemeProvider>
  );
}

/** Renders the update banner below the navigator, so it shows on every screen. */
function RootUpdateBanner() {
  const { visible, restart, dismiss } = useUpdateBanner();
  return <UpdateBanner visible={visible} onRestart={restart} onDismiss={dismiss} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
