import { Text } from 'react-native';

export type MatchLabel = 'perfect' | 'good' | 'poor';

const TONES: Record<MatchLabel, { fg: string; bg: string }> = {
  perfect: { fg: '#2E7050', bg: '#DCF0E4' },
  good: { fg: '#7E5A18', bg: '#F5EBD3' },
  poor: { fg: '#8E3324', bg: '#F7E5E1' },
};

/** perfect ≥ 85, good 65–84, poor < 65 (04-react-native.md §5). */
export function matchLabel(score: number): MatchLabel {
  if (score >= 85) return 'perfect';
  if (score >= 65) return 'good';
  return 'poor';
}

/** "{score} · {label}", always both, never colour alone. */
export function MatchBadge({ score }: { score: number }) {
  const label = matchLabel(score);
  const tone = TONES[label];
  return (
    <Text
      className="self-start overflow-hidden rounded-full px-[7px] py-xs font-mono-semibold text-[9.5px]"
      style={{ color: tone.fg, backgroundColor: tone.bg }}
      accessibilityLabel={`Match ${score}, ${label}`}
    >
      {score} · {label}
    </Text>
  );
}
