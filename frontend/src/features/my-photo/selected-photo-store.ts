import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { appStateStorage } from '@/lib/app-storage';
import { onIdentityChange } from '@/lib/identity-events';

type SelectedPhotoState = {
  /** The model photo the user picked for try-ons; null means "the newest". */
  photoId: string | null;
  select: (photoId: string | null) => void;
};

/**
 * Which of the user's model photos try-ons use. Kept on the phone (a choice,
 * not server data): the server checks the id belongs to the user each time,
 * and a photo that's since been deleted just falls back to the newest
 * (useMyPhotoQuery).
 */
export const useSelectedPhoto = create<SelectedPhotoState>()(
  persist(
    (set) => ({
      photoId: null,
      select: (photoId) => set({ photoId }),
    }),
    {
      name: 'selected-model-photo',
      storage: appStateStorage,
      partialize: ({ photoId }) => ({ photoId }),
    },
  ),
);

// Another person's photos must not carry over after signing in or out.
onIdentityChange(() => useSelectedPhoto.setState(useSelectedPhoto.getInitialState(), true));
