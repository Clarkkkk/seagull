import { Image, Pressable, Text, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import clsx from "clsx";

import type { WishlistStackParamList } from "~/navigation/types";
import { useWishlistEditJar } from "~/business/wishlist/edit/hooks";
import { useWishlistJarImages } from "~/business/wishlist/images/hooks";
import { designTokens } from "~/utils/design-tokens";
import { Card, Input, Screen } from "~/components";

type Props = NativeStackScreenProps<WishlistStackParamList, "WishlistEdit">;

export function WishlistEditScreen({ navigation, route }: Props) {
  const jarId = route.params.jarId;
  const colorScheme = useColorScheme();
  const tokens = designTokens[colorScheme === "dark" ? "dark" : "light"];
  const {
    jar,
    name,
    setName,
    note,
    setNote,
    displayLocationPrimary,
    displayLocationSecondary,
    canSave,
    updateJar,
    openPicker,
    saveJar,
  } = useWishlistEditJar(jarId ?? null);
  const { images, isFull, isUploading, pickAndUpload, deleteJarImage, setCoverFromImage, clearCoverImage } =
    useWishlistJarImages(jarId ?? null);
  const coverUrl =
    jar?.coverImageUrl ??
    (jar?.coverImageId ? images.find((img) => img.id === jar.coverImageId)?.url : null) ??
    images[0]?.url ??
    null;

  const isPending = updateJar.isPending;

  return (
    <Screen tone="plain" contentPadding={24} safeTop>
      {jar ? (
        <View className="gap-6">
          {/* NavBar (per Pencil spec) */}
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => navigation.goBack()} className="flex-row items-center gap-2">
              <Ionicons name="chevron-back" size={20} color={tokens.textPrimary} />
              <Text className="text-primary text-base font-semibold">返回</Text>
            </Pressable>

            <Text className="text-foreground text-[17px] font-semibold">Edit Place</Text>

            <Pressable disabled={!canSave} onPress={saveJar}>
              <Text
                className={clsx(
                  "text-base font-semibold",
                  canSave ? "text-primary" : "text-muted-foreground",
                )}
              >
                {isPending ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>

          {/* Cover */}
          <View className="gap-2">
            <Text className="text-foreground text-sm font-semibold">封面</Text>
            <Pressable
              disabled={isUploading}
              onPress={() => void pickAndUpload("cover")}
              className="border-stroke-strong bg-surface-muted overflow-hidden border-2"
              style={{ height: 180, borderRadius: 16 }}
            >
              {coverUrl ? (
                <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="h-full w-full items-center justify-center gap-2">
                  <Ionicons name="image-outline" size={28} color={tokens.textTertiary} />
                  <Text className="text-muted-foreground text-sm font-semibold">添加封面图</Text>
                </View>
              )}
            </Pressable>
            {coverUrl ? (
              <Pressable
                disabled={isUploading}
                onPress={() => void clearCoverImage()}
                className="border-stroke-subtle bg-card self-start rounded-full border px-4 py-2"
              >
                <Text className="text-muted-foreground text-sm font-semibold">清除封面</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Name */}
          <View className="gap-2">
            <Text className="text-foreground text-sm font-semibold">Name</Text>
            <Input
              left={<Ionicons name="pricetag-outline" size={18} color={tokens.textTertiary} />}
              value={name}
              onChangeText={setName}
              placeholder={jar.name}
              placeholderTextColor={tokens.textTertiary}
              returnKeyType="done"
            />
          </View>

          {/* Location */}
          <View className="gap-2">
            <Text className="text-foreground text-sm font-semibold">Location</Text>
            <Pressable onPress={openPicker}>
              <View className="gap-1">
                <Input
                  left={<Ionicons name="location-outline" size={18} color={tokens.textTertiary} />}
                  right={<Ionicons name="chevron-forward" size={18} color={tokens.textTertiary} />}
                  value={displayLocationPrimary ?? ""}
                  placeholder="选择地点"
                  placeholderTextColor={tokens.textTertiary}
                  editable={false}
                />
                <Text className="text-muted-foreground px-1 text-xs" numberOfLines={1}>
                  {displayLocationSecondary ?? "进入地图选点"}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Notes */}
          <View className="gap-2">
            <Text className="text-foreground text-sm font-semibold">Notes</Text>
            <Input
              left={<Ionicons name="document-text-outline" size={18} color={tokens.textTertiary} />}
              value={note}
              onChangeText={setNote}
              placeholder="写点什么（可选）"
              placeholderTextColor={tokens.textTertiary}
              multiline
              textAlignVertical="top"
              style={{ height: 120 }}
              containerClassName="items-start py-4"
            />
          </View>

          {/* Photos (per Pencil spec) */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-foreground text-sm font-semibold">图片</Text>
              <Text className="text-muted-foreground text-sm font-semibold">
                {images.length}/9
              </Text>
            </View>

            <View
              className="border-stroke-subtle bg-card border p-3"
              style={{ borderRadius: 16 }}
            >
              <View className="flex-row flex-wrap gap-2">
                {/* Add tile */}
                <View style={{ width: "31.5%" }}>
                  <Pressable
                    disabled={isFull || isUploading}
                    onPress={() => void pickAndUpload("image")}
                    className={clsx(
                      "border-stroke-subtle items-center justify-center border",
                      isFull || isUploading ? "bg-muted" : "bg-brand-light",
                    )}
                    style={{ height: 108, borderRadius: 12 }}
                  >
                    <Ionicons name="add" size={22} color={tokens.textTertiary} />
                    <Text className="text-muted-foreground mt-1 text-xs font-semibold">
                      {isFull ? "已满" : isUploading ? "上传中..." : "添加"}
                    </Text>
                  </Pressable>
                </View>

                {images.map((img) => {
                  const isCover = jar?.coverImageId
                    ? jar.coverImageId === img.id
                    : !jar?.coverImageUrl && images[0]?.id === img.id;

                  return (
                    <View key={img.id} style={{ width: "31.5%" }}>
                      <View className="relative">
                        <Pressable onPress={() => void setCoverFromImage(img.id)}>
                          <Image
                            source={{ uri: img.url }}
                            className="w-full"
                            style={{ height: 108, borderRadius: 12 }}
                            resizeMode="cover"
                          />
                          {isCover ? (
                            <View className="bg-primary absolute bottom-2 left-2 rounded-full px-2 py-1">
                              <Text className="text-primary-foreground text-[10px] font-semibold">
                                封面
                              </Text>
                            </View>
                          ) : null}
                        </Pressable>

                        <Pressable
                          className="bg-card absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full"
                          onPress={() => void deleteJarImage(img.id)}
                        >
                          <Ionicons name="close" size={12} color={tokens.textTertiary} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>

              <Text className="text-muted-foreground mt-3 text-center text-xs font-semibold">
                最多可添加 9 张，点击右上角可删除
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <Card className="p-5">
          <Text className="text-muted-foreground text-sm">加载中...</Text>
        </Card>
      )}
    </Screen>
  );
}

