import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { IconButton } from '@/components/icon-button';
import { StripeFill, type StripeTone } from '@/components/stripe-fill';
import { themeColors } from '@/constants/theme';
import { settlePhotoAccess, type PhotoAccessOutcome } from '@/lib/photo-access';

const PROMISES = [
  { icon: 'check_circle', text: 'Only the photos you pick are uploaded' },
  { icon: 'lock', text: 'Private to you, never used for ads' },
  { icon: 'delete', text: 'Delete any time in Settings' },
];

// The fanned photo cards: two behind, tilted, and the front one with the icon.
const BACK_CARDS: { tone: StripeTone; style: object }[] = [
  { tone: 'lilac', style: { transform: [{ translateX: -54 }, { rotate: '-9deg' }] } },
  { tone: 'sage', style: { transform: [{ translateX: 54 }, { rotate: '9deg' }] } },
];

/**
 * Before the first photo picker (handoff v2.1 change 2): why the app needs
 * photo access and three promises. If the system won't ask again, the main
 * button opens Settings and access is rechecked on return. Whatever closes
 * this screen (a button, the close icon, a swipe) answers the waiting
 * picker as it unmounts, so the picker opens only once the modal is gone.
 */
export function PhotoAccessScreen() {
  const cameraAvailable = useLocalSearchParams<{ camera?: string }>().camera === '1';
  const outcome = useRef<PhotoAccessOutcome>('dismissed');
  const closing = useRef(false);
  const wentToSettings = useRef(false);
  const [blocked, setBlocked] = useState(false);

  // Once only: on Android, returning from the system's permission dialog
  // also fires the "app became active" check below.
  const finish = (result: PhotoAccessOutcome) => {
    if (closing.current) return;
    closing.current = true;
    outcome.current = result;
    router.back();
  };

  useEffect(() => {
    if (Platform.OS !== 'android') {
      ImagePicker.getMediaLibraryPermissionsAsync()
        .then((current) => setBlocked(!current.granted && !current.canAskAgain))
        .catch(() => {});
    }
    // Back from Settings: carry on if access was turned on there. Only after
    // a trip to Settings, so pulling down the shade doesn't open the picker.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !wentToSettings.current) return;
      wentToSettings.current = false;
      ImagePicker.getMediaLibraryPermissionsAsync()
        .then((current) => {
          if (current.granted) finish('granted');
        })
        .catch(() => {});
    });
    return () => {
      subscription.remove();
      settlePhotoAccess(outcome.current);
    };
  }, []);

  const allow = async () => {
    if (blocked) {
      wentToSettings.current = true;
      await Linking.openSettings();
      return;
    }
    // Android's photo picker needs no permission; there this is the go-ahead.
    if (Platform.OS === 'android') {
      finish('granted');
      return;
    }
    const answer = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (answer.granted) finish('granted');
    else setBlocked(!answer.canAskAgain);
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-xl pb-xl pt-md">
      <View className="items-end">
        <IconButton icon="close" accessibilityLabel="Close" onPress={() => finish('dismissed')} />
      </View>

      <View className="flex-1 justify-center">
        <View
          className="h-[150px] items-center"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {BACK_CARDS.map(({ tone, style }) => (
            <View
              key={tone}
              className="absolute top-[14px] h-[116px] w-[88px] overflow-hidden rounded-[18px]"
              style={style}
            >
              <StripeFill tone={tone} />
            </View>
          ))}
          <View
            className="h-[128px] w-[96px] items-center justify-end overflow-hidden rounded-[20px] pb-[10px]"
            style={{ boxShadow: '0px 14px 30px rgba(22, 19, 15, 0.14)' }}
          >
            <StripeFill tone="blush" />
            <View className="h-[34px] w-[34px] items-center justify-center rounded-full bg-inverse">
              <AppIcon name="photo_library" size={18} color={themeColors.goldSoft} />
            </View>
          </View>
        </View>

        <Text
          className="mt-[26px] text-center font-display text-[34px] leading-[36px] text-ink-primary"
          accessibilityRole="header"
        >
          Choose photos <Text className="font-display-italic">you’re happy with</Text>
        </Text>
        <Text className="mt-[10px] text-center font-sans text-[13.5px] leading-[21px] text-ink-secondary">
          We need photo access to pick a full-body portrait and pictures of your clothes.
        </Text>

        <View className="mt-[22px] gap-[10px] rounded-[20px] border border-border bg-surface p-lg">
          {PROMISES.map(({ icon, text }) => (
            <View key={text} className="flex-row items-center gap-[11px]">
              <AppIcon name={icon} size={19} color={themeColors.success} />
              <Text className="flex-1 font-sans-semibold text-[13px] text-ink-primary">{text}</Text>
            </View>
          ))}
        </View>
      </View>

      <AppButton
        label={blocked ? 'Open Settings' : 'Allow photo access'}
        onPress={() => void allow()}
      />
      {cameraAvailable && (
        <View className="mt-[10px]">
          <AppButton
            label="Use the camera instead"
            variant="secondary"
            icon="photo_camera"
            onPress={() => finish('camera')}
          />
        </View>
      )}
      {blocked && (
        <Text className="mt-[14px] text-center font-sans text-[11px] leading-[16px] text-neutral-500">
          You said no before, so turn on photo access for this app in Settings.
        </Text>
      )}
    </SafeAreaView>
  );
}
