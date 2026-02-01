import { Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { Card, Screen, SectionHeader } from "~/components";
import { getArchivedJars, getPastTrips, memoriesMock } from "~/mocks";
import { useSession } from "~/utils/session-context";

export function MeScreen() {
  const navigation = useNavigation<any>();
  const archivedJars = getArchivedJars();
  const pastTrips = getPastTrips();
  const { signOut } = useSession();

  return (
    <Screen>
      <Card className="mb-6 gap-1 p-5">
        <Text className="text-foreground text-xl font-semibold">旅鸥的足迹</Text>
        <Text className="text-muted-foreground text-sm">归档、历史与回忆都在这里慢慢沉淀。</Text>
        <View className="mt-3 flex flex-row gap-2">
          <View className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1">
            <Text className="text-primary text-xs font-semibold">{archivedJars.length} 个归档罐子</Text>
          </View>
          <View className="bg-secondary border-border/70 rounded-full border px-3 py-1">
            <Text className="text-muted-foreground text-xs font-semibold">{pastTrips.length} 段历史行程</Text>
          </View>
        </View>
      </Card>

      <SectionHeader title="归档罐子" />
      <View className="mb-6 gap-3">
        {archivedJars.slice(0, 2).map((j) => (
          <Card key={j.id} className="gap-1">
            <Text className="text-foreground text-base font-semibold">{j.title}</Text>
            <Text className="text-muted-foreground text-sm">
              {j.country}
              {j.region ? ` · ${j.region}` : ""} · {j.itemCount} 条
            </Text>
          </Card>
        ))}
        {!archivedJars.length ? (
          <Card>
            <Text className="text-muted-foreground text-sm">暂无归档罐子（mock 占位）。</Text>
          </Card>
        ) : null}
      </View>

      <SectionHeader title="历史行程" />
      <View className="mb-6 gap-3">
        {pastTrips.slice(0, 2).map((t) => (
          <Card key={t.id} className="gap-1">
            <Text className="text-foreground text-base font-semibold">{t.title}</Text>
            <Text className="text-muted-foreground text-sm">
              {t.destination} · {t.startDate} - {t.endDate}
            </Text>
          </Card>
        ))}
        {!pastTrips.length ? (
          <Card>
            <Text className="text-muted-foreground text-sm">暂无历史行程（mock 占位）。</Text>
          </Card>
        ) : null}
      </View>

      <SectionHeader
        title="回忆"
        actionText="查看全部"
        onAction={() => navigation.navigate("MeMemories")}
      />
      <View className="gap-3">
        {memoriesMock.slice(0, 2).map((m) => (
          <Pressable key={m.id} onPress={() => navigation.navigate("MeMemories")}>
            <Card className="gap-1">
              <Text className="text-foreground text-base font-semibold">{m.title}</Text>
              <Text className="text-muted-foreground text-sm">
                {m.date} · {m.summary}
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="账号" />
      <View className="mt-2 gap-3">
        <Pressable
          className="bg-secondary border-border/70 items-center rounded-2xl border px-4 py-3"
          onPress={async () => {
            await signOut();
          }}
        >
          <Text className="text-muted-foreground font-semibold">退出登录</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

