import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";

import type { WishlistStackParamList } from "../types";
import { getAppStackScreenOptions } from "../header/stack-options";
import { WishlistListScreen } from "~/screens/wishlist/WishlistListScreen";
import { WishlistNewScreen } from "~/screens/wishlist/WishlistNewScreen";
import { WishlistDetailScreen } from "~/screens/wishlist/WishlistDetailScreen";
import { WishlistEditScreen } from "~/screens/wishlist/WishlistEditScreen";

const Stack = createNativeStackNavigator<WishlistStackParamList>();

export function WishlistNavigator() {
  const colorScheme = useColorScheme();

  return (
    <Stack.Navigator screenOptions={getAppStackScreenOptions(colorScheme)}>
      <Stack.Screen
        name="WishlistIndex"
        component={WishlistListScreen}
        options={{ headerShown: false, title: "愿望罐子" }}
      />
      <Stack.Screen name="WishlistNew" component={WishlistNewScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WishlistEdit" component={WishlistEditScreen} options={{ headerShown: false }} />
      <Stack.Screen name="WishlistDetail" component={WishlistDetailScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

