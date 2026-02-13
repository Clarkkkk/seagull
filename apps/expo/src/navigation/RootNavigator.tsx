import { useColorScheme } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useSession } from "~/utils/session-context";
import { navigationRef } from "./nav";
import type { RootStackParamList } from "./types";
import { getAppStackScreenOptions } from "./header/stack-options";

import { AuthNavigator } from "./stacks/AuthNavigator";
import { TabsNavigator } from "./tabs/TabsNavigator";
import { PickLocationScreen } from "~/screens/wishlist/PickLocationScreen";

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, isLoading } = useSession();
  const colorScheme = useColorScheme();
  const authed = !!session?.user;

  if (isLoading) return null;

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={colorScheme === "dark" ? DarkTheme : DefaultTheme}
    >
      <RootStack.Navigator
        key={authed ? "authed" : "guest"}
        initialRouteName={authed ? "AppTabs" : "AuthStack"}
        screenOptions={{ headerShown: false }}
      >
        <RootStack.Screen name="AuthStack" component={AuthNavigator} />
        <RootStack.Screen name="AppTabs" component={TabsNavigator} />
        <RootStack.Screen
          name="PickLocation"
          component={PickLocationScreen}
          options={{
            presentation: "fullScreenModal",
            headerShown: false,
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

