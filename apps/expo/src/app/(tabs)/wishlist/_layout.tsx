import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function WishlistLayout() {
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
      <Stack.Screen name="index" options={{ title: "愿望罐子" }} />
      <Stack.Screen name="[jarId]" options={{ title: "罐子" }} />
    </Stack>
  );
}

