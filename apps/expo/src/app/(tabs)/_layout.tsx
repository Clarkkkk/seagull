import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BRAND_PRIMARY = "#1E88E5";
const INACTIVE = "#95A5A6";

export default function TabsLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const insets = useSafeAreaInsets();
    const tabBarHeight = 56 + insets.bottom;

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: BRAND_PRIMARY,
                tabBarInactiveTintColor: INACTIVE,
                tabBarStyle: {
                    backgroundColor: isDark
                        ? "rgba(9, 9, 11, 0.92)"
                        : "rgba(255, 255, 255, 0.92)",
                    borderTopColor: isDark ? "#27272A" : "#EAEAEA",
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
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "首页",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="wishlist"
                options={{
                    title: "愿望罐子",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="sparkles-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="trips"
                options={{
                    title: "行程",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="map-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="me"
                options={{
                    title: "我的",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person-outline" color={color} size={size} />
                    ),
                }}
            />
        </Tabs>
    );
}

