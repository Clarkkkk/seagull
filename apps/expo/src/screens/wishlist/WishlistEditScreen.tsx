import { Pressable, Text, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { WishlistStackParamList } from "~/navigation/types";
import { useWishlistEditJar } from "~/business/wishlist/edit/hooks";
import { Card, Screen } from "~/components";

type Props = NativeStackScreenProps<WishlistStackParamList, "WishlistEdit">;

export function WishlistEditScreen({ navigation, route }: Props) {
  const jarId = route.params.jarId;
  const colorScheme = useColorScheme();
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

  return (
    <Screen>
      {jar ? (
        <>
          <View className="mb-4 gap-2 px-1">
            <View className="flex flex-row items-start justify-between">
              <View className="gap-1">
                <Text className="text-foreground text-xl font-semibold">编辑愿望罐子</Text>
                <Text className="text-muted-foreground text-sm">微调一下，让它更贴近你的心情。</Text>
              </View>
              <View className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1">
                <Text className="text-primary text-xs font-semibold">Ocean mode</Text>
              </View>
            </View>
          </View>

          <Card className="mb-4 gap-2 p-5">
            <Text className="text-foreground text-sm font-semibold">名称</Text>
            <View className="border-input bg-background/80 flex flex-row items-center gap-2 rounded-2xl border px-3 py-3">
              <Ionicons
                name="pricetag-outline"
                size={18}
                color={colorScheme === "dark" ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                className="text-foreground flex-1 text-base"
                value={name}
                onChangeText={setName}
                placeholder={jar.name}
                placeholderTextColor={colorScheme === "dark" ? "#64748B" : "#94A3B8"}
                returnKeyType="done"
              />
            </View>
          </Card>

          <Card className="mb-4 gap-2 p-5">
            <Text className="text-foreground text-sm font-semibold">地址</Text>
            <Pressable onPress={openPicker}>
              <View className="border-input bg-background/80 flex flex-row items-center justify-between rounded-2xl border px-3 py-3">
                <View className="flex-1 pr-3">
                  <Text className="text-foreground text-base font-semibold" numberOfLines={1}>
                    {displayLocationPrimary ?? "选择地点"}
                  </Text>
                  <Text className="text-muted-foreground mt-1 text-xs" numberOfLines={1}>
                    {displayLocationSecondary ?? "进入地图选点"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colorScheme === "dark" ? "#94A3B8" : "#64748B"}
                />
              </View>
            </Pressable>
          </Card>

          <Card className="mb-4 gap-3 p-5">
            <Text className="text-foreground text-sm font-semibold">笔记</Text>
            <View className="border-input bg-background/80 flex flex-row items-start gap-2 rounded-2xl border px-3 py-3">
              <Ionicons
                name="document-text-outline"
                size={18}
                color={colorScheme === "dark" ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                className="text-foreground flex-1 text-base"
                value={note}
                onChangeText={setNote}
                placeholder="写点什么（可选）"
                placeholderTextColor={colorScheme === "dark" ? "#64748B" : "#94A3B8"}
                multiline
              />
            </View>
          </Card>

          <View className="gap-3">
            <Pressable
              className={[
                "rounded-2xl px-4 py-3 shadow-sm",
                canSave ? "bg-primary" : "bg-muted",
              ].join(" ")}
              disabled={!canSave}
              onPress={saveJar}
            >
              <Text
                className={[
                  "text-center font-semibold",
                  canSave ? "text-primary-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {updateJar.isPending ? "保存中..." : "保存修改"}
              </Text>
            </Pressable>

            <Pressable
              className="bg-secondary border-border/70 items-center rounded-2xl border p-3"
              onPress={() => navigation.goBack()}
            >
              <Text className="text-muted-foreground font-semibold">取消</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <Card className="p-5">
          <Text className="text-muted-foreground text-sm">加载中...</Text>
        </Card>
      )}
    </Screen>
  );
}

