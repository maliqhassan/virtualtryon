import { Text, View } from 'react-native';

const TIPS = [
  'Your full body, from head to feet',
  'Standing straight, facing the camera',
  'Good light and a plain background',
  'Fitted clothes work best',
];

export function PhotoTips() {
  return (
    <View className="rounded-xl border border-border bg-surface p-lg">
      <Text className="text-sm font-semibold text-ink-primary">For the best result</Text>
      <View className="mt-sm gap-xs">
        {TIPS.map((tip) => (
          <View key={tip} className="flex-row gap-sm">
            <Text className="text-sm text-primary">•</Text>
            <Text className="flex-1 text-sm text-ink-secondary">{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
