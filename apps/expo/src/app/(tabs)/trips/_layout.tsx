import { Stack } from "expo-router";
import { useColorScheme } from "react-native";

export default function TripsLayout() {
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
      <Stack.Screen name="index" options={{ title: "行程" }} />
      <Stack.Screen name="[tripId]" options={{ title: "行程详情" }} />
    </Stack>
  );
}

