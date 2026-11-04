import { type Href, router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppScaffold } from '@/components/app-scaffold';
import { BreathingOrb } from '@/components/breathing-orb';
import { IconButton } from '@/components/icon-button';
import { themeColors } from '@/constants/theme';
import { MY_PHOTO_HREF } from '@/features/my-photo';
import { GENERATE_HREF } from '@/features/today';
import { WARDROBE_HREF } from '@/features/wardrobe';

// The design's prompts, each sent to the screen that answers it today.
const PROMPTS: [string, Href][] = [
  ['I have a mehndi Friday', GENERATE_HREF],
  ['What colour suits me?', MY_PHOTO_HREF],
  ['Suggest shoes', WARDROBE_HREF],
];

function Bubble({ children }: { children: string }) {
  return (
    <View className="max-w-[86%] self-start rounded-[20px] rounded-tl-[6px] border border-border bg-surface px-lg py-md">
      <Text className="font-sans text-[13.5px] leading-[20px] text-ink-primary">{children}</Text>
    </View>
  );
}

/**
 * Ask Noor. Conversation needs Noor's language model on the server, which
 * isn't connected yet, so the composer is off and each prompt opens the
 * part of the app that can already help.
 */
export function ChatScreen() {
  return (
    <AppScaffold scroll={false}>
      <View className="flex-row items-center gap-md">
        <View className="h-10 w-10 items-center justify-center">
          <BreathingOrb size={40} tone="brand" />
        </View>
        <View className="flex-1">
          <Text className="font-sans-bold text-[15px] text-ink-primary">Noor</Text>
          <Text className="font-mono text-[10px] text-neutral-500">your stylist · coming soon</Text>
        </View>
        <IconButton icon="close" accessibilityLabel="Close" onPress={() => router.back()} />
      </View>

      <View className="mt-xl flex-1 gap-sm">
        <Bubble>Hi, I’m Noor. I’ll plan outfits with you, from your wardrobe and any store.</Bubble>
        <Bubble>
          Chatting with me arrives in an update. Until then, pick a question and I’ll take you to
          the right place.
        </Bubble>
      </View>

      <View className="mb-md flex-row flex-wrap gap-[7px]">
        {PROMPTS.map(([prompt, href]) => (
          <Pressable
            key={prompt}
            onPress={() => router.push(href)}
            accessibilityRole="button"
            className="rounded-full border border-border bg-surface px-[14px] py-[9px]"
          >
            <Text className="font-sans-semibold text-[12.5px] text-ink-primary">{prompt}</Text>
          </Pressable>
        ))}
      </View>
      <View className="mb-lg flex-row items-center gap-sm rounded-full border border-border bg-surface pl-lg pr-[6px]">
        <TextInput
          editable={false}
          placeholder="Chat with Noor is coming soon"
          placeholderTextColor={themeColors.neutral400}
          accessibilityLabel="Message Noor (not available yet)"
          className="flex-1 py-[13px] font-sans text-[13.5px]"
        />
        <View className="h-9 w-9 items-center justify-center rounded-full bg-neutral-200">
          <Text className="font-sans-bold text-ink-secondary">↑</Text>
        </View>
      </View>
    </AppScaffold>
  );
}
