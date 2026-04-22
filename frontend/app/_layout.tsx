import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../src/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.appBg },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="result" />
      </Stack>
    </SafeAreaProvider>
  );
}
