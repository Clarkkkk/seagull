import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import { Platform, Pressable, Text, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import clsx from "clsx";

import type { RootStackParamList } from "~/navigation/types";
import { useWishlistPickLocation } from "~/business/wishlist/pick-location/hooks";
import { designTokens } from "~/utils/design-tokens";
import { Input } from "~/components";

type Props = NativeStackScreenProps<RootStackParamList, "PickLocation">;

export function PickLocationScreen({ navigation, route }: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const tokens = designTokens[isDark ? "dark" : "light"];
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

      {/* Top overlay (per Pencil Map Picker spec) */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 16,
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
          <View className="gap-3 px-4 py-4">
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={cancel}
                className="bg-card h-10 w-10 items-center justify-center rounded-full shadow-sm"
              >
                <Ionicons name="chevron-back" size={18} color={tokens.textPrimary} />
              </Pressable>

              <Input
                left={<Ionicons name="search-outline" size={18} color={tokens.accentPrimary} />}
                value={query}
                onChangeText={setQuery}
                placeholder="搜索地名/地址"
                placeholderTextColor={tokens.textTertiary}
                returnKeyType="search"
                radius={24}
                height={48}
                // Match Pencil: white pill, no border, subtle shadow, px=20
                containerClassName="bg-card border-0 shadow-sm px-5"
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
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <View className="bg-card shadow-md" style={{ borderRadius: 16, overflow: "hidden" }}>
                {candidates.map((c, idx) => {
                  const isActive =
                    (!!selected.placeId && !!c.placeId && selected.placeId === c.placeId) ||
                    (!selected.placeId &&
                      !c.placeId &&
                      selected.lat === c.lat &&
                      selected.lng === c.lng &&
                      selected.name === c.name);

                  return (
                    <View key={`${c.placeId ?? ""}-${c.lat}-${c.lng}`}>
                      <Pressable
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
                        <View
                          className={clsx(
                            "flex flex-row items-center gap-3 px-4",
                            isActive ? "bg-brand-light" : "bg-card",
                          )}
                          style={{ paddingVertical: 14 }}
                        >
                          <Ionicons
                            name="location-outline"
                            size={18}
                            color={isActive ? tokens.accentPrimary : tokens.textTertiary}
                          />
                          <View className="flex-1">
                            <Text className="text-foreground text-[15px] font-semibold" numberOfLines={1}>
                              {c.name}
                            </Text>
                            <Text className="text-muted-foreground mt-1 text-xs" numberOfLines={1}>
                              {c.formattedAddress ?? `${c.country} · ${c.province} · ${c.city}`}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color={tokens.textTertiary} />
                        </View>
                      </Pressable>
                      {idx < candidates.length - 1 ? (
                        <View className="bg-stroke-subtle h-px" />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </BlurView>
          </View>
        ) : null}
      </View>

      {/* Bottom bar (per Pencil spec) */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 30),
        }}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={35}
          tint={isDark ? "dark" : "light"}
          style={{
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          <View className="px-6 py-4">
            <Pressable
              disabled={isConfirming}
              onPress={confirm}
              style={{ height: 52, borderRadius: 26 }}
              className={clsx("items-center justify-center shadow-md", isConfirming ? "bg-muted" : "bg-primary")}
            >
              <Text
                className={clsx(
                  "text-base font-semibold",
                  isConfirming ? "text-muted-foreground" : "text-primary-foreground",
                )}
              >
                {isConfirming ? "确定中..." : "Confirm Location"}
              </Text>
            </Pressable>
          </View>
        </BlurView>
      </View>
    </View>
  );
}

