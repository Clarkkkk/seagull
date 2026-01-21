import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";

import { queryClient } from "~/utils/api";
import { darkThemeVars, lightThemeVars } from "~/utils/theme-vars";

import "../styles.css";

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const themeVars = colorScheme === "dark" ? darkThemeVars : lightThemeVars;
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={themeVars} className="flex-1">
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: colorScheme == "dark" ? "#09090B" : "#FFFFFF",
              },
            }}
          />
        </View>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
