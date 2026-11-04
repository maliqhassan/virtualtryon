import type { Garment } from '../types';

const TOPS = ['Shirts', 'T-Shirts', 'Hoodies', 'Jackets', 'Dresses'];
const BOTTOMS = ['Pants', 'Shorts'];
const SHOES = ['Shoes'];

/**
 * A travel capsule: about one top per two days, one bottom per three days
 * and a pair of shoes, from the user's pieces, then one outfit per day
 * rotating through them. Pieces without a matching category fill gaps.
 */
export function buildCapsule(
  garments: Garment[],
  days: number,
): { pieces: Garment[]; outfits: Garment[][] } {
  const take = (categories: string[], count: number) =>
    garments.filter((g) => categories.includes(g.category)).slice(0, count);

  const tops = take(TOPS, Math.ceil(days / 2));
  const bottoms = take(BOTTOMS, Math.ceil(days / 3));
  const shoes = take(SHOES, 1);
  const others = garments.filter((g) => ![...tops, ...bottoms, ...shoes].includes(g));
  const topsOrAny = tops.length ? tops : others.slice(0, Math.ceil(days / 2));
  const pieces = [...new Set([...topsOrAny, ...bottoms, ...shoes])];
  if (pieces.length === 0) return { pieces, outfits: [] };

  const outfits = Array.from({ length: days }, (_, day) =>
    [
      topsOrAny[day % Math.max(topsOrAny.length, 1)],
      bottoms[day % Math.max(bottoms.length, 1)],
      shoes[0],
    ].filter((g): g is Garment => g !== undefined),
  );
  return { pieces, outfits };
}
