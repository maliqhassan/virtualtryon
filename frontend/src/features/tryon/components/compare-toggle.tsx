import { Pressable, Text, View } from 'react-native';

import { selectionFeedback } from '@/lib/haptics';

export type CompareMode = 'before' | 'after';

type CompareToggleProps = {
  mode: CompareMode;
  onChange: (mode: CompareMode) => void;
};

const OPTIONS: { value: CompareMode; label: string }[] = [
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
];

/** Before/after as a pill segment in the result header (dark stage). */
export function CompareToggle({ mode, onChange }: CompareToggleProps) {
  return (
    <View
      className="flex-row rounded-full bg-[rgba(255,255,255,0.08)] p-[3px]"
      accessibilityRole="tablist"
    >
      {OPTIONS.map((option) => {
        const active = option.value === mode;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              selectionFeedback();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`rounded-full px-[14px] py-[7px] ${active ? 'bg-cream' : ''}`}
          >
            <Text
              className={`font-sans-bold text-[12px] ${active ? 'text-ink-primary' : 'text-night-body'}`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
