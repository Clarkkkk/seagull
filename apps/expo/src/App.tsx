import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { queryClient } from "~/utils/api";
import { darkThemeVars, lightThemeVars } from "~/utils/theme-vars";
import { SessionProvider } from "~/utils/session-context";
import { SplashScreenController } from "~/utils/splash";

import { RootNavigator } from "~/navigation/RootNavigator";

import "./styles.css";

export default function App() {
  const colorScheme = useColorScheme();
  const themeVars = colorScheme === "dark" ? darkThemeVars : lightThemeVars;

  return (
    <SessionProvider>
      <SplashScreenController />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <View style={themeVars} className="flex-1">
              <RootNavigator />
            </View>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          </SafeAreaProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </SessionProvider>
  );
}

