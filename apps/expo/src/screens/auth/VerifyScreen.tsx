import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { AuthStackParamList } from "~/navigation/types";
import { useAuthActions } from "~/business/auth/hooks";
import { Card, Screen } from "~/components";

type Props = NativeStackScreenProps<AuthStackParamList, "Verify">;

export function VerifyScreen({ navigation, route }: Props) {
  const email = useMemo(() => (route.params?.email ?? "").toString(), [route.params?.email]);

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const canVerify = email.length > 3 && otp.trim().length >= 4;
  const colorScheme = useColorScheme();
  const { verifyLoginOtp, sendLoginOtp } = useAuthActions();

  const verify = async () => {
    if (!canVerify || isVerifying) return;
    setIsVerifying(true);
    setError(null);
    try {
      await verifyLoginOtp(email, otp.trim());
      // 登录成功后 RootNavigator 会根据 session 自动切换到 AppTabs
    } catch (e: any) {
      setError(e?.message ?? "验证码校验失败");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Screen scroll={false}>
      <View className="flex-1 justify-center">
        <Card className="gap-4 p-5">
          <View className="gap-3">
            <View className="flex flex-row items-center justify-between">
              <View className="flex flex-row items-center gap-2">
                <View className="bg-primary/10 border-primary/15 rounded-2xl border p-2">
                  <Ionicons name="shield-checkmark-outline" size={18} color="#1E88E5" />
                </View>
                <View>
                  <Text className="text-foreground text-xl font-semibold">输入验证码</Text>
                  <Text className="text-muted-foreground text-sm">轻轻一步，就能起飞</Text>
                </View>
              </View>
              <View className="bg-primary/10 border-primary/15 rounded-full border px-3 py-1">
                <Text className="text-primary text-xs font-semibold">Ocean mode</Text>
              </View>
            </View>

            <View className="bg-secondary border-border/70 rounded-2xl border px-4 py-3">
              <Text className="text-muted-foreground text-xs font-semibold">验证码已发送到</Text>
              <Text className="text-foreground mt-1 font-semibold">{email || "(缺少邮箱参数)"}</Text>
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-foreground text-sm font-semibold">验证码</Text>
            <View className="border-input bg-background/80 flex flex-row items-center gap-2 rounded-2xl border px-3 py-3">
              <Ionicons
                name="key-outline"
                size={18}
                color={colorScheme === "dark" ? "#94A3B8" : "#64748B"}
              />
              <TextInput
                className="text-foreground flex-1 text-base"
                value={otp}
                onChangeText={(t) => {
                  setOtp(t);
                  setError(null);
                }}
                keyboardType="number-pad"
                placeholder="6 位验证码"
                placeholderTextColor={colorScheme === "dark" ? "#64748B" : "#94A3B8"}
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={verify}
              />
            </View>
            <View className="flex flex-row items-center justify-between">
              <Text className="text-muted-foreground text-xs">没收到？可能被拦截到垃圾邮件</Text>
              <Pressable
                disabled={!email || isResending}
                onPress={async () => {
                  if (!email) return;
                  setIsResending(true);
                  setError(null);
                  try {
                    await sendLoginOtp(email);
                  } catch (e: any) {
                    setError(e?.message ?? "重发验证码失败");
                  } finally {
                    setIsResending(false);
                  }
                }}
              >
                <Text
                  className={[
                    "text-sm font-semibold",
                    email && !isResending ? "text-primary" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {isResending ? "重发中..." : "重发"}
                </Text>
              </Pressable>
            </View>
          </View>

          {error ? (
            <View className="bg-destructive/10 border-destructive/20 rounded-2xl border px-3 py-2">
              <Text className="text-destructive text-sm font-medium">{error}</Text>
            </View>
          ) : null}

          <Pressable
            className={[
              "rounded-2xl px-4 py-3 shadow-sm",
              canVerify && !isVerifying ? "bg-primary" : "bg-muted",
            ].join(" ")}
            disabled={!canVerify || isVerifying}
            onPress={verify}
          >
            <Text
              className={[
                "text-center font-semibold",
                canVerify && !isVerifying ? "text-primary-foreground" : "text-muted-foreground",
              ].join(" ")}
            >
              {isVerifying ? "验证中..." : "完成登录"}
            </Text>
          </Pressable>

          <Pressable
            className="bg-secondary border-border/70 items-center rounded-2xl border p-3"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-muted-foreground font-semibold">返回修改邮箱</Text>
          </Pressable>
        </Card>
      </View>
    </Screen>
  );
}

