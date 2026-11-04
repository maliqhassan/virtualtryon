import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppIcon } from '@/components/app-icon';
import { AppScaffold } from '@/components/app-scaffold';
import { FadeInView } from '@/components/fade-in-view';
import { ListSectionLabel } from '@/components/list-card';
import { ScreenHeader } from '@/components/screen-header';
import { themeColors } from '@/constants/theme';
import { pickOutfit } from '@/features/today';
import { useGarmentsQuery, useLaundry } from '@/features/wardrobe';
import { selectionFeedback } from '@/lib/haptics';

import { OutfitRow } from '../components/outfit-row';

const OCCASIONS = [
  ['business_center', 'Office'],
  ['celebration', 'Eid & weddings'],
  ['flight', 'Travel'],
  ['school', 'Campus'],
  ['fitness_center', 'Active'],
  ['mosque', 'Jummah'],
] as const;
const FORMALITY = ['Relaxed', 'Smart', 'Formal'] as const;
const MIX = ['Eastern', 'Western', 'Fusion'] as const;

function seedFor(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row gap-[7px]" accessibilityRole="radiogroup">
      {options.map((option) => {
        const on = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => {
              selectionFeedback();
              onChange(option);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            className={`flex-1 items-center rounded-full py-[9px] ${on ? 'bg-inverse' : 'border border-border bg-surface'}`}
          >
            <Text
              className={`font-sans-semibold text-[12.5px] ${on ? 'text-white' : 'text-ink-primary'}`}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Style an occasion: three outfits from the user's own pieces for the
 * choices made. Matching pieces to the occasion and formality needs Noor's
 * styling model; until then the choices vary the combinations.
 */
export function GenerateScreen() {
  const [occasion, setOccasion] = useState<string>(OCCASIONS[0][1]);
  const [formality, setFormality] = useState<(typeof FORMALITY)[number]>('Smart');
  const [mix, setMix] = useState<(typeof MIX)[number]>('Fusion');
  const [round, setRound] = useState<number | null>(null);
  const inWash = useLaundry((state) => state.garmentIds);
  const garments = (useGarmentsQuery().data ?? []).filter((g) => !inWash.includes(g.id));

  const base = seedFor(`${occasion}|${formality}|${mix}`) + (round ?? 0) * 7;
  const outfits = round === null ? [] : [0, 1, 2].map((i) => pickOutfit(garments, base + i * 3));

  return (
    <AppScaffold back>
      <ScreenHeader variant="editorial" title="Style an" italic="occasion." italicInline />

      <ListSectionLabel>Where are you going?</ListSectionLabel>
      <View className="flex-row flex-wrap justify-between gap-y-sm">
        {OCCASIONS.map(([icon, label]) => {
          const on = label === occasion;
          return (
            <Pressable
              key={label}
              onPress={() => {
                selectionFeedback();
                setOccasion(label);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              className={`w-[48.5%] rounded-[18px] p-lg ${on ? 'bg-inverse' : 'border border-border bg-surface'}`}
            >
              <AppIcon
                name={icon}
                size={24}
                color={on ? themeColors.goldSoft : themeColors.secondary}
              />
              <Text
                className={`mt-sm font-sans-bold text-[13.5px] ${on ? 'text-cream' : 'text-ink-primary'}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ListSectionLabel>Formality</ListSectionLabel>
      <Chips options={FORMALITY} value={formality} onChange={setFormality} />
      <ListSectionLabel>Mix</ListSectionLabel>
      <Chips options={MIX} value={mix} onChange={setMix} />

      <View className="mt-xl">
        <AppButton
          label={round === null ? 'Style 3 outfits' : 'Style 3 more'}
          variant="accent"
          icon="auto_awesome"
          onPress={() => setRound((r) => (r === null ? 0 : r + 1))}
          disabled={garments.length === 0}
        />
        <Text className="mt-sm text-center font-sans text-[11px] text-ink-secondary">
          {garments.length === 0
            ? 'Add pieces to your wardrobe to style an occasion.'
            : 'Built only from pieces you own (not the laundry).'}
        </Text>
      </View>

      {outfits.length > 0 && (
        <View className="mt-lg gap-sm">
          {outfits.map((outfit, index) => (
            <FadeInView key={`${base}-${index}`} index={index}>
              <OutfitRow title={`${occasion} · look ${index + 1}`} outfit={outfit} />
            </FadeInView>
          ))}
        </View>
      )}
    </AppScaffold>
  );
}
