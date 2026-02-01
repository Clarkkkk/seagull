import { useNavigation } from "@react-navigation/native";
import { Pressable, Text, View } from "react-native";

import type { AppTabsParamList } from "~/navigation/types";
import { Card, Screen, SectionHeader } from "~/components";
import { getActiveJars, getNextActivity, getTodayTrip, getUpcomingTrips } from "~/mocks";

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const tabNavigation = (navigation as any).getParent?.() as any | null;

  const todayISO = toISODate(new Date());
  const todayTrip = getTodayTrip(todayISO);
  const nextActivity = getNextActivity(todayTrip, todayISO);

  const upcoming = getUpcomingTrips();
  const jars = getActiveJars().slice(0, 3);

  const goWishlist = () => {
    tabNavigation?.navigate("WishlistTab", { screen: "WishlistIndex" } satisfies any);
  };

  const goTripDetail = (tripId: string) => {
    tabNavigation?.navigate("TripsTab", { screen: "TripDetail", params: { tripId } } satisfies any);
  };

  return (
    <Screen>
      <Card className="mb-6 gap-3 p-5">
        <View className="flex flex-row items-start justify-between">
          <View className="gap-1">
            <Text className="text-muted-foreground text-sm">海风轻轻，慢慢规划</Text>
            <Text className="text-foreground text-2xl font-semibold">下一段旅程，想去哪儿？</Text>
          </View>
        </View>

        <View className="flex flex-row gap-2">
          <Pressable
            onPress={goWishlist}
            className="bg-primary/10 border-primary/15 grow rounded-2xl border px-4 py-3"
          >
            <Text className="text-foreground font-semibold">添加灵感</Text>
            <Text className="text-muted-foreground mt-1 text-xs">放进愿望罐子</Text>
          </Pressable>
          <Pressable
            onPress={() => tabNavigation?.navigate("TripsTab", { screen: "TripNew" } satisfies any)}
            className="bg-secondary border-border/70 grow rounded-2xl border px-4 py-3"
          >
            <Text className="text-foreground font-semibold">新建行程</Text>
            <Text className="text-muted-foreground mt-1 text-xs">占位：向导即将上线</Text>
          </Pressable>
        </View>
      </Card>

      <SectionHeader title="今日行程" />
      <Card className="mb-6">
        {todayTrip && nextActivity ? (
          <View className="gap-3">
            <View>
              <Text className="text-muted-foreground text-sm">下一项</Text>
              <Text className="text-foreground mt-1 text-xl font-semibold">{nextActivity.title}</Text>
              <Text className="text-muted-foreground mt-1 text-sm">
                {nextActivity.time}
                {nextActivity.place ? ` · ${nextActivity.place}` : ""}
              </Text>
            </View>
            <Pressable
              onPress={() => goTripDetail(todayTrip.id)}
              className="bg-primary rounded-2xl px-4 py-3 shadow-sm"
            >
              <Text className="text-primary-foreground text-center font-semibold">进入行程</Text>
            </Pressable>
          </View>
        ) : (
          <View className="gap-2">
            <Text className="text-foreground text-base font-semibold">今天没有进行中的行程</Text>
            <Text className="text-muted-foreground text-sm">
              你可以先把灵感放进愿望罐子，等合适的时间再组装成行程。
            </Text>
          </View>
        )}
      </Card>

      <SectionHeader title="未来行程" />
      <View className="mb-6 gap-3">
        {upcoming.length ? (
          upcoming.slice(0, 2).map((t) => (
            <Pressable key={t.id} onPress={() => goTripDetail(t.id)}>
              <Card className="gap-1">
                <Text className="text-foreground text-base font-semibold">{t.title}</Text>
                <Text className="text-muted-foreground text-sm">
                  {t.destination} · {t.startDate} - {t.endDate}
                </Text>
              </Card>
            </Pressable>
          ))
        ) : (
          <Card>
            <Text className="text-muted-foreground text-sm">
              暂无未来行程，占位：后续会加入“倒计时/天气趋势”。
            </Text>
          </Card>
        )}
      </View>

      <SectionHeader title="前 3 个罐子" actionText="查看全部" onAction={goWishlist} />
      <View className="gap-3">
        {jars.map((j) => (
          <Pressable
            key={j.id}
            onPress={() =>
              tabNavigation?.navigate(
                "WishlistTab",
                { screen: "WishlistDetail", params: { jarId: j.id } } satisfies any,
              )
            }
          >
            <Card className="gap-1">
              <Text className="text-foreground text-base font-semibold">{j.title}</Text>
              <Text className="text-muted-foreground text-sm">
                {j.country}
                {j.region ? ` · ${j.region}` : ""}
                {j.city ? ` · ${j.city}` : ""} · {j.itemCount} 条
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

