import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";

import type { HomeStackParamList } from "../types";
import { HomeScreen } from "~/screens/home/HomeScreen";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeNavigator() {
  const isDark = useColorScheme() === "dark";

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? "#09090B" : "#FFFFFF" },
        headerTintColor: isDark ? "#FFFFFF" : "#0F172A",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="HomeIndex" component={HomeScreen} options={{ title: "首页" }} />
    </Stack.Navigator>
  );
}

