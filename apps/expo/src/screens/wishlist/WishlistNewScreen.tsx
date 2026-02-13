import { Image, Pressable, Text, View, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";

import { useWishlistNewJar } from "~/business/wishlist/new/hooks";
import { designTokens } from "~/utils/design-tokens";
import { Input, Screen, Tag } from "~/components";

export function WishlistNewScreen() {
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const tokens = designTokens[colorScheme === "dark" ? "dark" : "light"];
  const {
    name,
    setName,
    note,
    setNote,
    pickedLocation,
    displayLocationPrimary,
    displayLocationSecondary,
    canSave,
    createJar,
    openPicker,
    saveJar,
    pendingImages,
    coverIndex,
    setCoverIndex,
    coverUri,
    addImage,
    removeImage,
    isSaving,
  } = useWishlistNewJar();

  const isPending = createJar.isPending;

  return (
    <Screen tone="plain" contentPadding={24} safeTop>
      <View className="gap-6">
        {/* NavBar (per Pencil spec) */}
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="flex-row items-center gap-2">
            <Ionicons name="chevron-back" size={20} color={tokens.textPrimary} />
            <Text className="text-primary text-base font-semibold">返回</Text>
          </Pressable>

          <Text className="text-foreground text-[17px] font-semibold">New Place</Text>

          <Pressable disabled={!canSave} onPress={() => void saveJar()}>
            <Text className={clsx("text-base font-semibold", canSave ? "text-primary" : "text-muted-foreground")}>
              {isPending || isSaving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>

        <View className="gap-2">
          <Text className="text-foreground text-sm font-semibold">封面</Text>
          <Pressable
            disabled={isSaving || pendingImages.length >= 9}
            onPress={() => void addImage()}
            className="border-stroke-strong bg-surface-muted overflow-hidden rounded-2xl border-2"
            style={{ height: 180, borderRadius: 16 }}
          >
            {coverUri ? (
              <Image source={{ uri: coverUri }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center gap-2">
                <Ionicons name="image-outline" size={28} color={tokens.textTertiary} />
                <Text className="text-muted-foreground text-sm font-semibold">添加封面图</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View className="gap-2">
          <Text className="text-foreground text-sm font-semibold">Name</Text>
          <Input
            left={<Ionicons name="pricetag-outline" size={18} color={tokens.textTertiary} />}
            value={name}
            onChangeText={setName}
            placeholder="例如：东京美食清单"
            placeholderTextColor={tokens.textTertiary}
            returnKeyType="next"
          />
        </View>

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

        {/* Tags (placeholder, visual-only) */}
        <View className="gap-2">
          <Text className="text-foreground text-sm font-semibold">Tags</Text>
          <View className="flex-row flex-wrap gap-2">
            <Tag>Sunset</Tag>
            <Tag>Photography</Tag>
            <Tag variant="outline" textClassName="text-muted-foreground">
              + Add
            </Tag>
          </View>
        </View>

        {/* Photos */}
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-foreground text-sm font-semibold">图片</Text>
            <Text className="text-muted-foreground text-sm font-semibold">{pendingImages.length}/9</Text>
          </View>
          <View className="border-stroke-subtle bg-card rounded-2xl border p-3" style={{ borderRadius: 16 }}>
            <View className="gap-2">
              <View className="flex-row gap-2">
                <Pressable
                  disabled={pendingImages.length >= 9 || isSaving}
                  onPress={() => void addImage()}
                  className="border-stroke-subtle bg-brand-light flex-1 items-center justify-center rounded-xl border"
                  style={{ height: 108, borderRadius: 12 }}
                >
                  <Ionicons name="add" size={22} color={tokens.textTertiary} />
                  <Text className="text-muted-foreground mt-1 text-xs font-semibold">添加</Text>
                </Pressable>
                <View className="bg-brand-light flex-1 rounded-xl" style={{ height: 108, borderRadius: 12 }} />
                <View className="bg-brand-light flex-1 rounded-xl" style={{ height: 108, borderRadius: 12 }} />
              </View>

              <View className="flex-row flex-wrap gap-2">
                {pendingImages.map((img, idx) => {
                  const isCover = idx === coverIndex;
                  return (
                    <View key={`${img.uri}-${idx}`} style={{ width: "31.5%" }}>
                      <View className="relative">
                        <Pressable disabled={isSaving} onPress={() => setCoverIndex(idx)}>
                          <Image
                            source={{ uri: img.uri }}
                            className="w-full rounded-xl"
                            style={{ height: 108, borderRadius: 12 }}
                          />
                          {isCover ? (
                            <View className="bg-primary absolute bottom-2 left-2 rounded-full px-2 py-1">
                              <Text className="text-primary-foreground text-[10px] font-semibold">封面</Text>
                            </View>
                          ) : null}
                        </Pressable>
                        <Pressable
                          className="bg-card absolute right-2 top-2 h-6 w-6 items-center justify-center rounded-full"
                          onPress={() => removeImage(idx)}
                        >
                          <Ionicons name="close" size={12} color={tokens.textTertiary} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>

              <Text className="text-muted-foreground text-center text-xs font-semibold">
                最多可添加 9 张，点击右上角可删除
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

