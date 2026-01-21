import { StyleSheet, View } from "react-native";

/**
 * A lightweight “ocean breeze” backdrop: soft blobs + horizon wash.
 * Pure RN Views (no new deps), pointer-events disabled by caller.
 */
export function OceanBackdrop() {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* sky wash */}
            <View className="absolute left-0 right-0 top-0 h-56 bg-primary/5" />

            {/* mesh blobs */}
            <View className="absolute -left-28 -top-20 h-80 w-80 rounded-full bg-primary/10" />
            <View className="absolute -right-28 top-6 h-72 w-72 rounded-full bg-chart-2/20" />
            <View className="absolute left-10 top-44 h-64 w-64 rounded-full bg-chart-3/10" />

            {/* horizon highlight */}
            <View className="absolute left-0 right-0 top-48 h-28 bg-chart-2/10" />
        </View>
    );
}

