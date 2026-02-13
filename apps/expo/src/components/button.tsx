import type { PropsWithChildren, ReactNode } from "react";
import type { PressableProps } from "react-native";
import { Pressable, Text, View } from "react-native";
import clsx from "clsx";

type Variant = "primary" | "ghost" | "outline";
type Size = "md" | "sm" | "icon";

type Props = PropsWithChildren<
  PressableProps & {
    variant?: Variant;
    size?: Size;
    left?: ReactNode;
    right?: ReactNode;
    labelClassName?: string;
  }
>;

export function Button({
  children,
  variant = "primary",
  size = "md",
  left,
  right,
  className,
  labelClassName,
  disabled,
  ...props
}: Props) {
  const base = clsx(
    "items-center justify-center",
    size === "icon" ? "h-11 w-11 rounded-full" : "rounded-full px-4 py-2",
    variant === "primary" && "bg-primary shadow-md",
    variant === "outline" && "bg-card border-stroke-subtle border",
    variant === "ghost" && "bg-transparent",
    disabled && "opacity-60",
    className,
  );

  const label = clsx(
    "font-semibold",
    size === "sm" ? "text-xs" : "text-base",
    variant === "primary" ? "text-primary-foreground" : "text-primary",
    labelClassName,
  );

  return (
    <Pressable className={base} disabled={disabled} {...props}>
      <View className="flex-row items-center gap-2">
        {left}
        <Text className={label}>{children}</Text>
        {right}
      </View>
    </Pressable>
  );
}

