import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";

import type { HomeStackParamList } from "../types";
import { getAppStackScreenOptions } from "../header/stack-options";
import { HomeScreen } from "~/screens/home/HomeScreen";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeNavigator() {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator screenOptions={getAppStackScreenOptions(colorScheme)}>
      <Stack.Screen name="HomeIndex" component={HomeScreen} options={{ title: "首页" }} />
    </Stack.Navigator>
  );
}

