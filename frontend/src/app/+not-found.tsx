import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View className="flex-1 items-center justify-center gap-3 bg-white p-6 dark:bg-neutral-950">
        <Text className="text-base text-neutral-900 dark:text-neutral-50">
          This screen does not exist.
        </Text>
        <Link href="/" className="text-sm text-blue-600 dark:text-blue-400">
          Go to home screen
        </Link>
      </View>
    </>
  );
}
