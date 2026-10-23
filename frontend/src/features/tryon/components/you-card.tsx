import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppImage } from '@/components/app-image';
import { FadeInView } from '@/components/fade-in-view';
import {
  MY_PHOTO_HREF,
  PHOTO_ANGLES,
  displayUrl,
  myPhotoHref,
  type MyPhoto,
  type PhotoAngle,
} from '@/features/my-photo';
import { resolveMediaUrl } from '@/lib/media-url';

/**
 * The user's own photo on a plain background (when the cut-out worked),
 * with front / side / back views. A true 360° spin needs 3D or AI
 * generation; until then, side and back are photos the user adds.
 */
export function YouCard({ photos }: { photos: MyPhoto[] }) {
  const [angle, setAngle] = useState<PhotoAngle>('front');
  const photo = photos.find((p) => p.angle === angle) ?? null;
  const front = photos.find((p) => p.angle === 'front') ?? null;

  if (!front) {
    return (
      <View className="items-center rounded-[24px] border border-dashed border-neutral-300 bg-surface p-xl">
        <Text className="font-display text-2xl text-ink-primary">Add your photo</Text>
        <Text className="mt-xs text-center text-sm text-ink-secondary">
          One full-body photo, used for every try-on. We’ll show it on a plain background.
        </Text>
        <View className="mt-lg self-stretch">
          <AppButton
            label="Add your photo"
            variant="dark"
            onPress={() => router.push(MY_PHOTO_HREF)}
          />
        </View>
      </View>
    );
  }

  const label = PHOTO_ANGLES.find((v) => v.angle === angle)?.label ?? '';
  return (
    <View className="overflow-hidden rounded-[24px] border border-border bg-surface">
      <View className="items-center bg-muted pt-md">
        {photo ? (
          <FadeInView key={photo.id} className="w-3/5">
            <AppImage
              uri={resolveMediaUrl(displayUrl(photo))}
              accessibilityLabel={`Your ${label.toLowerCase()} view`}
              aspectRatio={3 / 4}
              fit="contain"
              borderRadius={16}
            />
          </FadeInView>
        ) : (
          <View className="w-3/5 items-center justify-center" style={{ aspectRatio: 3 / 4 }}>
            <Text className="text-center text-sm text-ink-secondary">
              No {label.toLowerCase()} view yet
            </Text>
            <Pressable
              onPress={() => router.push(myPhotoHref(angle))}
              accessibilityRole="button"
              className="mt-md rounded-full bg-inverse px-lg py-sm"
            >
              <Text className="text-sm font-bold text-white">Add {label.toLowerCase()} view</Text>
            </Pressable>
          </View>
        )}
        <View className="my-md flex-row gap-xs rounded-full bg-surface p-xs">
          {PHOTO_ANGLES.map((view) => {
            const active = view.angle === angle;
            return (
              <Pressable
                key={view.angle}
                onPress={() => setAngle(view.angle)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${view.label} view`}
                className={[
                  'rounded-full px-lg py-xs',
                  active ? 'bg-inverse' : 'bg-transparent',
                ].join(' ')}
              >
                <Text
                  className={
                    active
                      ? 'text-xs font-bold text-white'
                      : 'text-xs font-semibold text-ink-primary'
                  }
                >
                  {view.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Pressable
        onPress={() => router.push(myPhotoHref(angle))}
        accessibilityRole="button"
        accessibilityLabel="Manage your photos"
        className="flex-row items-center justify-between px-lg py-md"
      >
        <Text className="text-sm text-ink-secondary">
          {front.cutoutUrl ? 'Background removed' : 'Original photo'} · used for try-ons
        </Text>
        <Text className="text-sm font-semibold text-primary">Manage</Text>
      </Pressable>
    </View>
  );
}
