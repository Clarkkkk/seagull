import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function MeLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? "#09090B" : "#FFFFFF" },
        headerTintColor: isDark ? "#FFFFFF" : "#0F172A",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "我的" }} />
      <Stack.Screen name="memories" options={{ title: "回忆" }} />
    </Stack>
  );
}

