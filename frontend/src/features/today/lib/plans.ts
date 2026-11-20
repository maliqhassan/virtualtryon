import type { Garment } from '@/features/wardrobe';

/**
 * A day's planned pieces, in the order they were planned. Pieces deleted
 * since the plan was made just drop out. Shared by Home's hero, its week
 * cards and the calendar, so they all show a plan the same way.
 */
export function planPieces(ids: string[] | undefined, garments: Garment[]): Garment[] {
  if (!ids?.length) return [];
  const byId = new Map(garments.map((g) => [g.id, g]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

/** "1 piece", "3 pieces". */
export function piecesLabel(count: number): string {
  return `${count} ${count === 1 ? 'piece' : 'pieces'}`;
}
