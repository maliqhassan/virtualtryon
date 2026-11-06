import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/app-icon';
import { AppScaffold } from '@/components/app-scaffold';
import { ListCard } from '@/components/list-card';
import { ScreenHeader } from '@/components/screen-header';
import { themeColors } from '@/constants/theme';
import { CHAT_HREF } from '@/features/today';

const QUESTIONS = [
  {
    q: 'Taking a good body photo',
    a: 'Stand alone against a plain wall in daylight, facing the camera, head to toe in view, arms a little away from your body. Fitted clothes give the truest try-ons.',
  },
  {
    q: 'Trying on something from a store',
    a: 'Open the product in your browser, copy its link, and paste it in Shop. Links to a single product work; links to a whole category or the home page don’t.',
  },
  {
    q: 'Where my photos are stored',
    a: 'On our server, only to create your try-ons. Nothing is posted. To make a try-on, your photo and the piece’s photo go to our try-on partner, Texel.Moda (through RapidAPI), which sends back the result. When you add a piece, its photo (never a photo of you) goes to our image-recognition partner, api4.ai, to suggest its category. Settings → Delete all my data removes your photos, wardrobe, looks and every stored image on our server.',
  },
  {
    q: 'A try-on failed',
    a: 'Failed try-ons never count against your allowance. Try again, or use a clearer photo of you and of the piece.',
  },
  {
    q: 'Plans and payments',
    a: 'Free includes one try-on; Pro and Pro Plus add daily try-ons. Payments aren’t open yet, so nothing is charged.',
  },
];

/** Searchable answers, then Noor for anything else. */
export function HelpScreen() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const needle = query.trim().toLowerCase();
  const shown = QUESTIONS.filter(
    ({ q, a }) => !needle || q.toLowerCase().includes(needle) || a.toLowerCase().includes(needle),
  );

  return (
    <AppScaffold back>
      <ScreenHeader variant="editorial" title="How can we" italic="help?" italicInline />

      <View className="flex-row items-center gap-[10px] rounded-full border border-[rgba(22,19,15,0.1)] bg-surface px-lg">
        <AppIcon name="search" size="sm" color={themeColors.neutral400} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search help"
          placeholderTextColor={themeColors.neutral400}
          accessibilityLabel="Search help"
          className="flex-1 py-[13px] font-sans text-[13.5px] text-ink-primary"
        />
      </View>

      <View className="mt-[14px]">
        <ListCard>
          {shown.map(({ q, a }) => {
            const expanded = open === q;
            return (
              <Pressable
                key={q}
                onPress={() => setOpen(expanded ? null : q)}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                className="px-lg py-[14px]"
              >
                <View className="flex-row items-center justify-between gap-md">
                  <Text className="flex-1 font-sans-semibold text-[13px] text-ink-primary">
                    {q}
                  </Text>
                  <AppIcon
                    name={expanded ? 'expand_less' : 'chevron_right'}
                    size={17}
                    color={themeColors.neutral300}
                  />
                </View>
                {expanded && (
                  <Text className="mt-sm font-sans text-[12.5px] leading-[19px] text-ink-secondary">
                    {a}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </ListCard>
        {shown.length === 0 && (
          <Text className="mt-md text-center font-sans text-[12.5px] text-ink-secondary">
            Nothing matches “{query.trim()}”.
          </Text>
        )}
      </View>

      <View className="mt-[14px] rounded-[22px] bg-inverse p-lg">
        <Text className="font-display text-[22px] text-cream">Still stuck?</Text>
        <Text className="mt-xs font-sans text-[12px] leading-[18px] text-neutral-400">
          Ask Noor about styling, try-ons and your wardrobe.
        </Text>
        <Pressable
          onPress={() => router.push(CHAT_HREF)}
          accessibilityRole="button"
          className="mt-md self-start rounded-[11px] bg-gold-soft px-[14px] py-[10px]"
        >
          <Text className="font-sans-bold text-[12px] text-night">Ask Noor</Text>
        </Pressable>
      </View>
    </AppScaffold>
  );
}
