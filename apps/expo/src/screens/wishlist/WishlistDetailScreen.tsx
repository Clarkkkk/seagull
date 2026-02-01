import { Linking, Pressable, Text, View } from "react-native";
import { useLayoutEffect } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { WishlistStackParamList } from "~/navigation/types";
import { useWishlistJar } from "~/business/wishlist/detail/hooks";
import { Badge, Card, EmptyState, Screen, SectionHeader } from "~/components";

type Props = NativeStackScreenProps<WishlistStackParamList, "WishlistDetail">;

export function WishlistDetailScreen({ navigation, route }: Props) {
  const { jarId } = route.params;
  const { jar, statusLabel, badgeVariant } = useWishlistJar(jarId ?? null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: jar?.name ?? "罐子",
      headerRight: () =>
        jar ? (
          <Pressable onPress={() => navigation.navigate("WishlistEdit", { jarId: jar.id })}>
            <Text className="text-primary text-sm font-semibold">编辑</Text>
          </Pressable>
        ) : null,
    });
  }, [jar, navigation]);

  return (
    <Screen>
      {jar ? (
        <>
          <Card className="mb-6 gap-2">
            <View className="flex flex-row items-center justify-between">
              <Text className="text-foreground text-lg font-semibold">{jar.name}</Text>
              <Badge variant={badgeVariant}>{statusLabel}</Badge>
            </View>
            <Text className="text-muted-foreground text-sm">
              {jar.country}
              {jar.province ? ` · ${jar.province}` : ""}
              {jar.city ? ` · ${jar.city}` : ""}
            </Text>
            {jar.formattedAddress ? (
              <Text className="text-muted-foreground text-sm">{jar.formattedAddress}</Text>
            ) : null}
          </Card>

          <SectionHeader title="笔记" />
          <Card className="mb-6">
            {jar.note?.trim() ? (
              <Text className="text-foreground text-sm leading-relaxed">{jar.note}</Text>
            ) : (
              <Text className="text-muted-foreground text-sm">暂无笔记</Text>
            )}
          </Card>

          {jar.sourceType === "link" && jar.linkUrl ? (
            <>
              <SectionHeader title="链接" />
              <Card className="mb-6">
                <Pressable
                  onPress={() => {
                    void Linking.openURL(jar.linkUrl!);
                  }}
                >
                  <Text className="text-primary text-sm font-semibold">{jar.linkUrl}</Text>
                </Pressable>
              </Card>
            </>
          ) : null}

          <SectionHeader title="条目" />
          <EmptyState
            title="条目列表占位"
            description="后续会在这里展示景点/餐厅/笔记，并支持一键加入行程与排序。"
          />
        </>
      ) : (
        <EmptyState title="找不到这个罐子" description="可能不存在或你没有权限。" />
      )}
    </Screen>
  );
}

