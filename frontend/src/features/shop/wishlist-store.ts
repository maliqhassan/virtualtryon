import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { deleteStoredToken, getStoredToken, setStoredToken } from '@/lib/secure-token-store';

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
      storage: createJSONStorage(() => ({
        getItem: getStoredToken,
        setItem: setStoredToken,
        removeItem: deleteStoredToken,
      })),
      partialize: ({ productIds }) => ({ productIds }),
    },
  ),
);
