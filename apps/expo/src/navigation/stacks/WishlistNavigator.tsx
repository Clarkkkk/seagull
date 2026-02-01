import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";

import type { WishlistStackParamList } from "../types";
import { WishlistListScreen } from "~/screens/wishlist/WishlistListScreen";
import { WishlistNewScreen } from "~/screens/wishlist/WishlistNewScreen";
import { WishlistDetailScreen } from "~/screens/wishlist/WishlistDetailScreen";
import { WishlistEditScreen } from "~/screens/wishlist/WishlistEditScreen";

const Stack = createNativeStackNavigator<WishlistStackParamList>();

export function WishlistNavigator() {
  const isDark = useColorScheme() === "dark";

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? "#09090B" : "#FFFFFF" },
        headerTintColor: isDark ? "#FFFFFF" : "#0F172A",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="WishlistIndex" component={WishlistListScreen} options={{ title: "愿望罐子" }} />
      <Stack.Screen name="WishlistNew" component={WishlistNewScreen} options={{ title: "新建罐子" }} />
      <Stack.Screen name="WishlistEdit" component={WishlistEditScreen} options={{ title: "编辑罐子" }} />
      <Stack.Screen name="WishlistDetail" component={WishlistDetailScreen} options={{ title: "罐子" }} />
    </Stack.Navigator>
  );
}

