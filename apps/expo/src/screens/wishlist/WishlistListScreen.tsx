import { Pressable, Text, View, useColorScheme } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useWishlistList } from "~/business/wishlist/list/hooks";
import { designTokens } from "~/utils/design-tokens";
import { EmptyState, Input, Screen, Tag } from "~/components";
import { nav } from "~/navigation/nav";

export function WishlistListScreen() {
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const tokens = designTokens[colorScheme === "dark" ? "dark" : "light"];
  const { jars, isAuthed, query, setQuery } = useWishlistList();

  return (
    <Screen tone="plain" contentPadding={24} safeTop>
      <View className="gap-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-foreground text-[28px] font-bold">愿望罐子</Text>
          {isAuthed ? (
            <Pressable
              onPress={() => navigation.navigate("WishlistNew")}
              className="bg-primary h-11 w-11 items-center justify-center rounded-full shadow-md"
            >
              <Ionicons name="add" size={20} color={tokens.bgSurface} />
            </Pressable>
          ) : null}
        </View>

        <View className="gap-1">
          <Text className="text-muted-foreground text-sm">把灵感先装进来，等时间合适再组装行程。</Text>
        </View>

        {!isAuthed ? (
          <EmptyState
            title="需要登录"
            description="登录后才能查看和管理你的愿望罐子。"
            actionLabel="去登录"
            onAction={() => nav.toLogin()}
          />
        ) : (
          <View className="gap-4">
            {/* Search */}
            <Input
              left={<Ionicons name="search-outline" size={18} color={tokens.textTertiary} />}
              value={query}
              onChangeText={setQuery}
              placeholder="Search places..."
              placeholderTextColor={tokens.textTertiary}
              returnKeyType="search"
              containerClassName="shadow-sm"
            />

            {/* Import chips */}
            <View className="flex-row gap-2">
              <View className="flex-row gap-2">
                <Tag variant="outline">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="document-text-outline" size={14} color={tokens.accentPrimary} />
                    <Text className="text-ink-secondary text-xs font-semibold">From text</Text>
                  </View>
                </Tag>
                <Tag variant="outline">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="link-outline" size={14} color={tokens.accentPrimary} />
                    <Text className="text-ink-secondary text-xs font-semibold">From link</Text>
                  </View>
                </Tag>
              </View>
            </View>

            {/* List */}
            {jars.length ? (
              <View className="gap-3">
                {jars.map((j, idx) => (
                  <Pressable
                    key={j.id}
                    onPress={() => navigation.navigate("WishlistDetail", { jarId: j.id })}
                    className="bg-surface-card rounded-2xl px-3 py-3 shadow-sm"
                    style={{ borderRadius: 16 }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="h-16 w-16 rounded-xl"
                        style={{
                          borderRadius: 12,
                          backgroundColor: idx % 3 === 0 ? tokens.accentLight : idx % 3 === 1 ? tokens.accentSky : tokens.accentWarm,
                          opacity: idx % 3 === 2 ? 0.3 : 1,
                        }}
                      />
                      <View className="flex-1 gap-1">
                        <Text className="text-foreground text-base font-semibold" numberOfLines={1}>
                          {j.name}
                        </Text>
                        <View className="flex-row items-center gap-1">
                          <Ionicons name="location-outline" size={12} color={tokens.textTertiary} />
                          <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                            {j.country}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyState
                title="还没有愿望罐子"
                description="先从一个目的地开始：把看到的景点、餐厅、链接都放进来。"
              />
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

