import { Image } from 'expo-image';
import { Text, View } from 'react-native';

type ResultCanvasProps = {
  /** A real image to display. Null renders the placeholder instead — this
   * is the branch that starts rendering something real, with no changes
   * needed here, once a real inference worker populates
   * TryOnJob.generatedImageUrl (see ../types). */
  uri: string | null;
  /** Shown inside the placeholder box when `uri` is null. */
  placeholderCaption?: string;
  /** Shown below the image/placeholder either way (e.g. AI reasoning, or a simple label). */
  caption?: string;
};

export function ResultCanvas({ uri, placeholderCaption, caption }: ResultCanvasProps) {
  return (
    <View className="gap-sm">
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 20 }}
          contentFit="cover"
          accessibilityLabel="Try-on result"
        />
      ) : (
        <View className="aspect-[3/4] w-full items-center justify-center rounded-xxl bg-neutral-200 p-lg">
          <Text className="text-center text-sm text-ink-secondary">{placeholderCaption}</Text>
        </View>
      )}
      {caption && <Text className="text-center text-sm text-ink-secondary">{caption}</Text>}
    </View>
  );
}
