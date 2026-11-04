import type { Garment } from '@/features/wardrobe';

const TOPS = ['Shirts', 'T-Shirts', 'Hoodies', 'Jackets'];
const BOTTOMS = ['Pants', 'Shorts'];
const ONE_PIECE = ['Dresses'];
const FINISHERS = ['Shoes', 'Bags', 'Accessories'];

function pick<T>(items: T[], seed: number): T | undefined {
  return items.length ? items[seed % items.length] : undefined;
}

/** Days since the epoch, so the pick changes once a day, not on every render. */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/**
 * Up to three pieces that make an outfit: a top and a bottom (or a dress),
 * then shoes or an accessory, filled from anything else when a slot is
 * empty. Deterministic for a seed, so "Shuffle" steps through combinations.
 *
 * A stand-in for the server's daily outfit (dailyOutfit in
 * 04-react-native.md §9), built only from what the user owns.
 */
export function pickOutfit(garments: Garment[], seed: number): Garment[] {
  const by = (categories: string[]) => garments.filter((g) => categories.includes(g.category));
  const onePieces = by(ONE_PIECE);
  const useOnePiece = onePieces.length > 0 && seed % 3 === 0;

  const chosen: (Garment | undefined)[] = useOnePiece
    ? [pick(onePieces, seed), pick(by(FINISHERS), seed + 1)]
    : [pick(by(TOPS), seed), pick(by(BOTTOMS), seed + 1), pick(by(FINISHERS), seed + 2)];

  const outfit = chosen.filter((g): g is Garment => g !== undefined);
  const rest = garments.filter((g) => !outfit.includes(g));
  for (let i = 0; outfit.length < 3 && i < rest.length; i += 1) {
    outfit.push(rest[(seed + i) % rest.length]);
  }
  return [...new Set(outfit)].slice(0, 3);
}
