import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import type { ColorSchemeName } from "react-native";

import { designTokens } from "~/utils/design-tokens";

/**
 * Global, consistent header spec for all native stack navigators.
 */
export function getAppStackScreenOptions(colorScheme: ColorSchemeName): NativeStackNavigationOptions {
  const isDark = colorScheme === "dark";
  const tokens = designTokens[isDark ? "dark" : "light"];

  return {
    headerStyle: { backgroundColor: tokens.bgPrimary },
    headerTintColor: tokens.textPrimary,
    headerShadowVisible: false,
    headerBackTitleVisible: false,
    headerTitleStyle: {
      fontFamily: "Outfit",
      fontSize: 17,
      fontWeight: "600",
    },
  };
}

