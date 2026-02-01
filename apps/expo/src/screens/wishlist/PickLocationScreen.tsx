import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import { Platform, Pressable, Text, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RootStackParamList } from "~/navigation/types";
import { useWishlistPickLocation } from "~/business/wishlist/pick-location/hooks";

type Props = NativeStackScreenProps<RootStackParamList, "PickLocation">;

export function PickLocationScreen({ navigation, route }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();

  const draftKey = route.params?.draftKey ?? "new";
  const initialLat = route.params?.initialLat ?? 35.681236;
  const initialLng = route.params?.initialLng ?? 139.767125;

  const {
    query,
    setQuery,
    setIsComposing,
    selected,
    setSelected,
    isConfirming,
    candidates,
    searchEnabled,
    region,
    cancel,
    confirm,
  } = useWishlistPickLocation({
    navigation,
    draftKey,
    initialLat,
    initialLng,
  });

  return (
    <View style={{ flex: 1 }} className="bg-background">
      <MapView
        style={{ flex: 1 }}
        initialRegion={region}
        region={region}
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          setSelected((prev) => ({
            lat: latitude,
            lng: longitude,
            // clear address parts until we reverse-geocode on confirm
            name: prev.name,
            placeId: undefined,
            placeProvider: prev.placeProvider,
          }));
        }}
      >
        <Marker coordinate={{ latitude: selected.lat, longitude: selected.lng }} />
      </MapView>

      {/* Top frosted overlay */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          paddingTop: insets.top + 8,
          paddingHorizontal: 12,
          paddingBottom: 12,
        }}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={40}
          tint={isDark ? "dark" : "light"}
          style={{
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <View className="gap-3 px-3 py-3">
            <View className="flex flex-row items-center justify-between">
              <Pressable onPress={cancel}>
                <View className="flex flex-row items-center gap-2">
                  <Ionicons name="close" size={18} color={isDark ? "#E2E8F0" : "#0F172A"} />
                  <Text className="text-foreground text-sm font-semibold">取消</Text>
                </View>
              </Pressable>

              <Text className="text-foreground text-sm font-semibold">选择地点</Text>

              <Pressable disabled={isConfirming} onPress={confirm}>
                <Text
                  className={[
                    "text-sm font-semibold",
                    isConfirming ? "text-muted-foreground" : "text-primary",
                  ].join(" ")}
                >
                  {isConfirming ? "确定中..." : "确定"}
                </Text>
              </Pressable>
            </View>

            <View className="bg-background/35 flex flex-row items-center gap-2 rounded-2xl px-3 py-3">
              <Ionicons
                name="search-outline"
                size={18}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                className="text-foreground flex-1 text-base"
                value={query}
                onChangeText={setQuery}
                placeholder="搜索地名/地址"
                placeholderTextColor={isDark ? "#64748B" : "#94A3B8"}
                returnKeyType="search"
                // React Native (iOS/Android) doesn't expose a reliable `isComposing` like the web.
                // We still support IME composition events on web (react-native-web) when available.
                {...(Platform.OS === "web"
                  ? ({
                    onCompositionStart: () => setIsComposing(true),
                    onCompositionEnd: () => setIsComposing(false),
                  } as any)
                  : {})}
              />
            </View>
          </View>
        </BlurView>

        {searchEnabled && candidates.length ? (
          <View style={{ marginTop: 10 }} pointerEvents="box-none">
            <BlurView
              intensity={35}
              tint={isDark ? "dark" : "light"}
              style={{
                borderRadius: 20,
                overflow: "hidden",
              }}
            >
              <View className="gap-1 px-2 py-2">
                {candidates.map((c) => (
                  <Pressable
                    key={`${c.placeId ?? ""}-${c.lat}-${c.lng}`}
                    onPress={() => {
                      setSelected({
                        lat: c.lat,
                        lng: c.lng,
                        name: c.name,
                        formattedAddress: c.formattedAddress,
                        country: c.country,
                        province: c.province,
                        city: c.city,
                        placeId: c.placeId,
                        placeProvider: c.placeProvider,
                      });
                    }}
                  >
                    <View className="bg-background/25 flex flex-row items-center justify-between rounded-2xl px-3 py-3">
                      <View className="flex-1 pr-3">
                        <Text className="text-foreground font-semibold" numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text className="text-muted-foreground mt-1 text-xs" numberOfLines={1}>
                          {c.formattedAddress ?? `${c.country} · ${c.province} · ${c.city}`}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={isDark ? "#94A3B8" : "#64748B"}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            </BlurView>
          </View>
        ) : null}
      </View>
    </View>
  );
}

