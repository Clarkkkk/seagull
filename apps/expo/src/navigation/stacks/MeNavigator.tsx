import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";

import type { MeStackParamList } from "../types";
import { getAppStackScreenOptions } from "../header/stack-options";
import { MeScreen } from "~/screens/me/MeScreen";
import { MemoriesScreen } from "~/screens/me/MemoriesScreen";

const Stack = createNativeStackNavigator<MeStackParamList>();

export function MeNavigator() {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator screenOptions={getAppStackScreenOptions(colorScheme)}>
      <Stack.Screen name="MeIndex" component={MeScreen} options={{ title: "我的" }} />
      <Stack.Screen name="MeMemories" component={MemoriesScreen} options={{ title: "回忆" }} />
    </Stack.Navigator>
  );
}

