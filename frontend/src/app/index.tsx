import { Link } from 'expo-router';
import { Text, View } from 'react-native';

import { SAVED_LOOKS_HISTORY_HREF } from '@/features/saved-looks/routes';
import { WARDROBE_HREF } from '@/features/wardrobe/routes';

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-md bg-white dark:bg-neutral-950">
      <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
        VirtualTryOn
      </Text>
      <Text className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Foundation initialized. Core upload loop in progress.
      </Text>
      <Link href="/upload-photo" className="mt-md text-sm font-semibold text-primary">
        Try the photo upload flow →
      </Link>
      <Link href="/garment-upload" className="text-sm font-semibold text-primary">
        Try the garment upload flow →
      </Link>
      <Link href="/tryon-processing" className="text-sm font-semibold text-primary">
        Try the AI processing flow →
      </Link>
      <Link href={SAVED_LOOKS_HISTORY_HREF} className="text-sm font-semibold text-primary">
        View saved looks history →
      </Link>
      <Link href={WARDROBE_HREF} className="text-sm font-semibold text-primary">
        Open your wardrobe →
      </Link>
    </View>
  );
}
