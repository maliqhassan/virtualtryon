import type { ImageSourcePropType } from 'react-native';

/**
 * Stock photos bundled with the app (Pexels; sources in
 * assets/images/stock/CREDITS.md), 600x800 WebP. They illustrate
 * onboarding, photo tips and decorative cards; nothing here is the user's.
 * Each screen names a photo here instead of repeating a file path.
 */
export const STOCK_PHOTOS = {
  // Photo tips: three to copy, three to avoid.
  tipSoloFront: require('@/assets/images/stock/tip-solo-front.webp'),
  tipGroup: require('@/assets/images/stock/tip-group.webp'),
  tipPlainWall: require('@/assets/images/stock/tip-plain-wall.webp'),
  tipBack: require('@/assets/images/stock/tip-back.webp'),
  tipArmsRelaxed: require('@/assets/images/stock/tip-arms-relaxed.webp'),
  tipMirror: require('@/assets/images/stock/tip-mirror.webp'),
  // Style quiz.
  styleWClassic: require('@/assets/images/stock/style-w-classic.webp'),
  // The same photo as the plain-wall tip: neutral, fitted, plain wall.
  styleWMinimal: require('@/assets/images/stock/tip-plain-wall.webp'),
  styleWWedding: require('@/assets/images/stock/style-w-wedding.webp'),
  styleWSmartCasual: require('@/assets/images/stock/style-w-smart-casual.webp'),
  styleWModest: require('@/assets/images/stock/style-w-modest.webp'),
  styleWStreet: require('@/assets/images/stock/style-w-street.webp'),
  styleMSuits: require('@/assets/images/stock/style-m-suits.webp'),
  styleMMinimal: require('@/assets/images/stock/style-m-minimal.webp'),
  styleMShirt: require('@/assets/images/stock/style-m-shirt.webp'),
  styleMSmartCasual: require('@/assets/images/stock/style-m-smart-casual.webp'),
  styleMOldMoney: require('@/assets/images/stock/style-m-old-money.webp'),
  styleMStreet: require('@/assets/images/stock/style-m-street.webp'),
  // Onboarding and decorative cards.
  welcomeCloset: require('@/assets/images/stock/welcome-closet.webp'),
  welcomeTryOn: require('@/assets/images/stock/welcome-try-on.webp'),
  welcomeStylist: require('@/assets/images/stock/welcome-stylist.webp'),
  lookLavender: require('@/assets/images/stock/look-lavender.webp'),
  lookVelvet: require('@/assets/images/stock/look-velvet.webp'),
  lookYellow: require('@/assets/images/stock/look-yellow.webp'),
  lookPinkTrousers: require('@/assets/images/stock/look-pink-trousers.webp'),
  lookNavyTee: require('@/assets/images/stock/look-navy-tee.webp'),
  // The man in styleMMinimal, same shoot, in white trousers: the pair is the
  // before/after on How it works and Plans. Swap both or neither.
  sameManAfter: require('@/assets/images/stock/same-man-after.webp'),
} satisfies Record<string, ImageSourcePropType>;

export type StockPhoto = keyof typeof STOCK_PHOTOS;
