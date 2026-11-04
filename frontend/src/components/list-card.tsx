import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { themeColors } from '@/constants/theme';

import { AppIcon } from './app-icon';

/** A white card of rows separated by hairlines (You, Settings, Help). */
export function ListCard({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View className="overflow-hidden rounded-[22px] border border-[rgba(22,19,15,0.07)] bg-surface">
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 && <View className="h-px bg-[rgba(22,19,15,0.06)]" />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type ListRowProps = {
  label: string;
  icon?: string;
  iconColor?: string;
  /** Mono metadata on the right (a count, a place). */
  meta?: string;
  /** A coloured action word on the right instead of a chevron ("Manage", "Delete"). */
  action?: { label: string; color?: string };
  /** Any control on the right (a toggle, a value). */
  right?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function ListRow({
  label,
  icon,
  iconColor = themeColors.inkSecondary,
  meta,
  action,
  right,
  onPress,
  accessibilityLabel,
}: ListRowProps) {
  const content = (
    <>
      {icon && <AppIcon name={icon} size="md" color={iconColor} />}
      <Text className="flex-1 font-sans-semibold text-[14px] text-ink-primary">{label}</Text>
      {meta && <Text className="font-mono text-[10.5px] text-neutral-400">{meta}</Text>}
      {right}
      {action ? (
        <Text
          className="font-sans-semibold text-[13.5px]"
          style={{ color: action.color ?? themeColors.primary }}
        >
          {action.label}
        </Text>
      ) : (
        onPress && <AppIcon name="chevron_right" size="sm" color={themeColors.neutral300} />
      )}
    </>
  );
  const className = 'min-h-[50px] flex-row items-center gap-[13px] px-lg py-[14px]';
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      className={className}
    >
      {content}
    </Pressable>
  ) : (
    <View className={className}>{content}</View>
  );
}

/** The mono overline above a group of rows. */
export function ListSectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-[10px] mt-[20px] font-mono text-[10px] uppercase tracking-[1.4px] text-neutral-500">
      {children}
    </Text>
  );
}
