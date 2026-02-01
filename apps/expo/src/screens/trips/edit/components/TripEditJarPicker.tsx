import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTripEditItems } from "~/business/trip/edit/items/hooks";
import { useTripEditJars } from "~/business/trip/edit/jars/hooks";
import { useTripEditStore } from "~/business/trip/edit/store";

export function TripEditJarPicker() {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#E2E8F0" : "#0F172A";
  const insets = useSafeAreaInsets();
  const items = useTripEditStore((state) => state.items);
  const showJarPicker = useTripEditStore((state) => state.showJarPicker);
  const setShowJarPicker = useTripEditStore((state) => state.setShowJarPicker);
  const { jars } = useTripEditJars();
  const { addItemFromJar } = useTripEditItems();
  const usedJarIds = useMemo(
    () => new Set(items.map((it) => it.jarId).filter(Boolean) as string[]),
    [items],
  );

  return (
    <Modal visible={showJarPicker} animationType="slide" onRequestClose={() => setShowJarPicker(false)}>
      <View
        className="bg-background"
        style={{ flex: 1, padding: 16, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
      >
        <View className="flex flex-row items-center justify-between">
          <Text className="text-foreground text-base font-semibold">从愿望罐子加入</Text>
          <Pressable onPress={() => setShowJarPicker(false)}>
            <Ionicons name="close" size={20} color={iconColor} />
          </Pressable>
        </View>
        <View className="mt-4 gap-2">
          {jars.slice(0, 30).map((j) => {
            const alreadyAdded = usedJarIds.has(j.id);
            return (
              <Pressable
                key={j.id}
                disabled={alreadyAdded}
                onPress={() => {
                  addItemFromJar(j);
                  setShowJarPicker(false);
                }}
                className={`border-border rounded-2xl border px-4 py-3 ${alreadyAdded ? "bg-muted" : "bg-background/80"
                  }`}
              >
                <View className="flex flex-row items-center justify-between">
                  <Text
                    className={`font-semibold ${alreadyAdded ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    {j.name}
                  </Text>
                  {alreadyAdded ? <Text className="text-muted-foreground text-xs">已加入</Text> : null}
                </View>
                <Text className="text-muted-foreground mt-1 text-xs">
                  {j.country}
                  {j.province ? ` · ${j.province}` : ""}
                  {j.city ? ` · ${j.city}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

