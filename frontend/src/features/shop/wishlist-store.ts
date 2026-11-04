import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appStateStorage } from '@/lib/app-storage';
import { onIdentityChange } from '@/lib/identity-events';

type WishlistState = {
  /** Saved product ids, newest first. */
  productIds: string[];
  toggle: (productId: string) => void;
};

/**
 * Products the user bookmarked in Shop, kept on the phone. Client state:
 * there's no wishlist on the server yet, and nothing else needs it there.
 */
export const useWishlist = create<WishlistState>()(
  persist(
    (set) => ({
      productIds: [],
      toggle: (productId) =>
        set((state) => ({
          productIds: state.productIds.includes(productId)
            ? state.productIds.filter((id) => id !== productId)
            : [productId, ...state.productIds],
        })),
    }),
    {
      name: 'wishlist',
      storage: appStateStorage,
      partialize: ({ productIds }) => ({ productIds }),
    },
  ),
);

// Another person's data must not carry over after signing in or out.
onIdentityChange(() => useWishlist.setState(useWishlist.getInitialState(), true));
