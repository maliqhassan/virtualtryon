import { Pressable, Text, View } from 'react-native';

import { selectionFeedback } from '@/lib/haptics';

/**
 * A pill track with equal segments; the selected one is a white pill.
 * Try-On's Collections · My clothes, Wardrobe's Outfits · Portraits · Clothes.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" className="flex-row gap-xs rounded-full bg-muted p-xs">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (selected) return;
              selectionFeedback();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className={`flex-1 items-center rounded-full py-[10px] ${selected ? 'bg-surface' : ''}`}
            style={selected ? { boxShadow: '0px 2px 6px rgba(22, 19, 15, 0.08)' } : undefined}
          >
            <Text
              className={`font-sans-bold text-[13px] ${selected ? 'text-ink-primary' : 'text-ink-secondary'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
