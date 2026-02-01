import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";

import type { AuthStackParamList } from "../types";
import { LoginScreen } from "~/screens/auth/LoginScreen";
import { VerifyScreen } from "~/screens/auth/VerifyScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const isDark = useColorScheme() === "dark";

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? "#09090B" : "#FFFFFF" },
        headerTintColor: isDark ? "#FFFFFF" : "#0F172A",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: "登录 / 注册" }} />
      <Stack.Screen name="Verify" component={VerifyScreen} options={{ title: "输入验证码" }} />
    </Stack.Navigator>
  );
}

