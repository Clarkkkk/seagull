import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "react-native";

import type { TripsStackParamList } from "../types";
import { TripsListScreen } from "~/screens/trips/TripsListScreen";
import { TripNewScreen } from "~/screens/trips/TripNewScreen";
import { TripDetailScreen } from "~/screens/trips/TripDetailScreen";
import { TripEditScreen } from "~/screens/trips/TripEditScreen";
import { TripSnapshotsListScreen } from "~/screens/trips/TripSnapshotsListScreen";
import { TripSnapshotDetailScreen } from "~/screens/trips/TripSnapshotDetailScreen";

const Stack = createNativeStackNavigator<TripsStackParamList>();

export function TripsNavigator() {
  const isDark = useColorScheme() === "dark";

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? "#09090B" : "#FFFFFF" },
        headerTintColor: isDark ? "#FFFFFF" : "#0F172A",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="TripsIndex" component={TripsListScreen} options={{ title: "行程" }} />
      <Stack.Screen name="TripDetail" component={TripDetailScreen} options={{ title: "行程详情" }} />
      <Stack.Screen name="TripNew" component={TripNewScreen} options={{ title: "新建行程" }} />
      <Stack.Screen name="TripEdit" component={TripEditScreen} options={{ title: "编辑行程" }} />
      <Stack.Screen name="TripSnapshots" component={TripSnapshotsListScreen} options={{ title: "历史版本" }} />
      <Stack.Screen
        name="TripSnapshotDetail"
        component={TripSnapshotDetailScreen}
        options={{ title: "历史版本详情" }}
      />
    </Stack.Navigator>
  );
}

