import { Pressable, Text, View } from 'react-native';

export type CompareMode = 'before' | 'after';

type CompareToggleProps = {
  mode: CompareMode;
  onChange: (mode: CompareMode) => void;
};

const OPTIONS: { value: CompareMode; label: string }[] = [
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
];

export function CompareToggle({ mode, onChange }: CompareToggleProps) {
  return (
    <View className="flex-row gap-sm">
      {OPTIONS.map((option) => {
        const active = option.value === mode;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={[
              'flex-1 items-center rounded-lg py-sm',
              active ? 'bg-primary' : 'border border-border bg-transparent',
            ].join(' ')}
          >
            <Text
              className={
                active
                  ? 'text-sm font-semibold text-ink-onPrimary'
                  : 'text-sm font-semibold text-ink-primary'
              }
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
