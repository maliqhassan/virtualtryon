import { Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';

type StoreCardProps = {
  name: string;
  subtitle: string;
  accentColor: string;
  selected: boolean;
  onPress: () => void;
};

/** A store in the horizontal store rail. The initial sits on the store's own colour. */
export function StoreCard({ name, subtitle, accentColor, selected, onPress }: StoreCardProps) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${subtitle}`}
      containerClassName="w-[150px]"
      className={[
        'rounded-xxl p-md',
        selected ? 'bg-inverse' : 'border border-border bg-surface',
      ].join(' ')}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: accentColor }}
      >
        <Text className="font-display text-xl text-white">{name.charAt(0)}</Text>
      </View>
      <Text
        numberOfLines={1}
        className={
          selected
            ? 'mt-sm text-sm font-bold text-white'
            : 'mt-sm text-sm font-bold text-ink-primary'
        }
      >
        {name}
      </Text>
      <Text
        numberOfLines={1}
        className={selected ? 'text-xs text-neutral-300' : 'text-xs text-ink-secondary'}
      >
        {subtitle}
      </Text>
    </PressableScale>
  );
}
