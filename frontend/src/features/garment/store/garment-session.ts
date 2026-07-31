import { createImageSessionStore } from '@/lib/images/create-image-session-store';

// A separate instance from user-photo's store, same shape — see
// docs/roadmap and this feature's design brief for why they aren't merged.
export const useGarmentSessionStore = createImageSessionStore();
