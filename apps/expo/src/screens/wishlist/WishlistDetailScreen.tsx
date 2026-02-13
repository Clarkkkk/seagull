import { Image, Linking, Pressable, Text, View, useColorScheme } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import type { WishlistStackParamList } from "~/navigation/types";
import { useWishlistJar } from "~/business/wishlist/detail/hooks";
import { useWishlistJarImages } from "~/business/wishlist/images/hooks";
import { designTokens } from "~/utils/design-tokens";
import { EmptyState, Screen } from "~/components";

type Props = NativeStackScreenProps<WishlistStackParamList, "WishlistDetail">;

export function WishlistDetailScreen({ navigation, route }: Props) {
  const { jarId } = route.params;
  const colorScheme = useColorScheme();
  const tokens = designTokens[colorScheme === "dark" ? "dark" : "light"];
  const { jar, statusLabel, badgeVariant } = useWishlistJar(jarId ?? null);
  const { images } = useWishlistJarImages(jarId ?? null);
  const coverUrl =
    jar?.coverImageUrl ??
    (jar?.coverImageId ? images.find((img) => img.id === jar.coverImageId)?.url : null) ??
    images[0]?.url ??
    null;

  return (
    <Screen tone="plain" contentPadding={24} safeTop>
      {jar ? (
        <View className="gap-6">
          {/* NavBar (same pattern as New/Edit) */}
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => navigation.goBack()} className="flex-row items-center gap-2">
              <Ionicons name="chevron-back" size={20} color={tokens.textPrimary} />
              <Text className="text-primary text-base font-semibold">返回</Text>
            </Pressable>

            <Text className="text-foreground text-[17px] font-semibold" numberOfLines={1}>
              {jar.name}
            </Text>

            <Pressable onPress={() => navigation.navigate("WishlistEdit", { jarId: jar.id })}>
              <Text className="text-primary text-base font-semibold">编辑</Text>
            </Pressable>
          </View>

          {/* Summary card */}
          <View className="bg-card shadow-sm" style={{ borderRadius: 16, padding: 12 }}>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-foreground text-base font-semibold">{jar.name}</Text>
                <View className="flex-row items-center gap-1">
                  <Ionicons name="location-outline" size={12} color={tokens.textTertiary} />
                  <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                    {jar.country}
                    {jar.province ? ` · ${jar.province}` : ""}
                    {jar.city ? ` · ${jar.city}` : ""}
                  </Text>
                </View>
                {jar.formattedAddress ? (
                  <Text className="text-muted-foreground text-xs" numberOfLines={2}>
                    {jar.formattedAddress}
                  </Text>
                ) : null}
              </View>

              <View className="bg-brand-light rounded-full px-4 py-2">
                <Text className="text-ink-secondary text-xs font-semibold">
                  {badgeVariant === "success" ? "行程中" : statusLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Notes */}
          <View className="gap-2">
            <Text className="text-foreground text-sm font-semibold">Notes</Text>
            <View className="border-stroke-subtle bg-card rounded-xl border p-4" style={{ borderRadius: 12 }}>
              {jar.note?.trim() ? (
                <Text className="text-foreground text-[15px] leading-relaxed">{jar.note}</Text>
              ) : (
                <Text className="text-muted-foreground text-sm">暂无笔记</Text>
              )}
            </View>
          </View>

          {/* Cover */}
          <View className="gap-2">
            <Text className="text-foreground text-sm font-semibold">封面</Text>
            <View
              className="border-stroke-strong bg-surface-muted overflow-hidden border-2"
              style={{ height: 180, borderRadius: 16 }}
            >
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center gap-2">
                  <Ionicons name="image-outline" size={28} color={tokens.textTertiary} />
                  <Text className="text-muted-foreground text-sm font-semibold">暂无封面</Text>
                </View>
              )}
            </View>
          </View>

          {/* Images */}
          <View className="gap-2">
            <Text className="text-foreground text-sm font-semibold">图片</Text>
            <View className="border-stroke-subtle bg-card rounded-2xl border p-3" style={{ borderRadius: 16 }}>
              {images.length ? (
                <View className="flex-row flex-wrap gap-2">
                  {images.map((img) => (
                    <Image
                      key={img.id}
                      source={{ uri: img.url }}
                      style={{ width: "31.5%", height: 108, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-muted-foreground text-sm">暂无图片</Text>
              )}
            </View>
          </View>

          {jar.sourceType === "link" && jar.linkUrl ? (
            <View className="gap-2">
              <Text className="text-foreground text-sm font-semibold">链接</Text>
              <View className="border-stroke-subtle bg-card rounded-xl border p-4" style={{ borderRadius: 12 }}>
                <Pressable
                  onPress={() => {
                    void Linking.openURL(jar.linkUrl!);
                  }}
                >
                  <Text className="text-primary text-[15px] font-semibold">{jar.linkUrl}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View className="gap-2">
            <Text className="text-foreground text-sm font-semibold">条目</Text>
            <EmptyState
              title="条目列表占位"
              description="后续会在这里展示景点/餐厅/笔记，并支持一键加入行程与排序。"
            />
          </View>
        </View>
      ) : (
        <EmptyState title="找不到这个罐子" description="可能不存在或你没有权限。" />
      )}
    </Screen>
  );
}

