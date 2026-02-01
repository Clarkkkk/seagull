import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";

import type { MeStackParamList } from "../types";
import { MeScreen } from "~/screens/me/MeScreen";
import { MemoriesScreen } from "~/screens/me/MemoriesScreen";

const Stack = createNativeStackNavigator<MeStackParamList>();

export function MeNavigator() {
  const isDark = useColorScheme() === "dark";

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? "#09090B" : "#FFFFFF" },
        headerTintColor: isDark ? "#FFFFFF" : "#0F172A",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="MeIndex" component={MeScreen} options={{ title: "我的" }} />
      <Stack.Screen name="MeMemories" component={MemoriesScreen} options={{ title: "回忆" }} />
    </Stack.Navigator>
  );
}

