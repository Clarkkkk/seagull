import type { PropsWithChildren, ReactNode } from "react";
import type { PressableProps, TextProps, ViewProps } from "react-native";
import { Pressable, Text, View } from "react-native";
import clsx from "clsx";

type Variant = "filled" | "outline";

export function Tag({
  children,
  variant = "filled",
  className,
  textClassName,
  onPress,
  disabled,
  ...rest
}: PropsWithChildren<
  (ViewProps | PressableProps) & {
    variant?: Variant;
    className?: string;
    textClassName?: string;
  }
>) {
  const base = clsx(
    "rounded-full px-[14px] py-2",
    variant === "filled" ? "bg-brand-light" : "bg-card border-stroke-subtle border",
    className,
  );

  const text = clsx(
    "text-xs font-semibold",
    variant === "filled" ? "text-primary" : "text-ink-secondary",
    textClassName,
  );

  if (onPress) {
    return (
      <Pressable className={base} onPress={onPress} disabled={disabled} {...(rest as PressableProps)}>
        <Text className={text}>{children}</Text>
      </Pressable>
    );
  }

  // If children is not plain text, render it directly for layout flexibility.
  if (typeof children !== "string" && typeof children !== "number") {
    return (
      <View className={base} {...(rest as ViewProps)}>
        {children as ReactNode}
      </View>
    );
  }

  return (
    <View className={base} {...(rest as ViewProps)}>
      <Text className={text}>{children}</Text>
    </View>
  );
}

