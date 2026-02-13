import type { ReactNode } from "react";
import type { TextInputProps, ViewProps } from "react-native";
import { Text, TextInput, View } from "react-native";
import clsx from "clsx";

type Props = {
  left?: ReactNode;
  right?: ReactNode;
  height?: number;
  radius?: number;
  containerClassName?: string;
  inputClassName?: string;
} & Omit<TextInputProps, "style"> &
  Pick<ViewProps, "style">;

export function Input({
  left,
  right,
  height = 48,
  radius = 12,
  containerClassName,
  inputClassName,
  style,
  ...inputProps
}: Props) {
  const isReadOnly = inputProps.editable === false;
  const displayText =
    typeof inputProps.value === "string" || typeof inputProps.value === "number"
      ? String(inputProps.value)
      : "";

  return (
    <View
      className={clsx("border-stroke-subtle bg-card flex-row items-center gap-3 border px-4", containerClassName)}
      style={[{ height, borderRadius: radius }, style]}
    >
      {left}
      {isReadOnly ? (
        <Text
          className={clsx(
            "flex-1 text-[15px]",
            displayText ? "text-foreground" : "text-muted-foreground",
            inputClassName,
          )}
          numberOfLines={1}
        >
          {displayText || inputProps.placeholder || ""}
        </Text>
      ) : (
        <TextInput
          className={clsx("text-foreground flex-1 text-[15px]", inputClassName)}
          {...inputProps}
        />
      )}
      {right}
    </View>
  );
}

