import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppTabsParamList } from "../types";
import { HomeNavigator } from "../stacks/HomeNavigator";
import { WishlistNavigator } from "../stacks/WishlistNavigator";
import { TripsNavigator } from "../stacks/TripsNavigator";
import { MeNavigator } from "../stacks/MeNavigator";

import { designTokens, hexToRgbaCss } from "~/utils/design-tokens";

function withAlpha(hex: string, alpha: number) {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

const Tab = createBottomTabNavigator<AppTabsParamList>();

export function TabsNavigator() {
  const isDark = useColorScheme() === "dark";
  const tokens = designTokens[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.accentPrimary,
        tabBarInactiveTintColor: tokens.textTertiary,
        tabBarStyle: {
          backgroundColor: hexToRgbaCss(withAlpha(tokens.bgSurface, 0.92)),
          borderTopColor: tokens.borderSubtle,
          height: tabBarHeight,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          lineHeight: 12,
        },
        tabBarItemStyle: {
          paddingBottom: 2,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          title: "首页",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="WishlistTab"
        component={WishlistNavigator}
        options={{
          title: "愿望罐子",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="sparkles-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="TripsTab"
        component={TripsNavigator}
        options={{
          title: "行程",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="map-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="MeTab"
        component={MeNavigator}
        options={{
          title: "我的",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

