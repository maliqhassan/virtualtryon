import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/**
 * Where persisted client state (Zustand stores: laundry, wishlist, plans,
 * onboarding answers) lives. AsyncStorage, not secure storage: this isn't
 * secret, and secure storage rejects values over ~2 KB on some phones, which
 * a growing wishlist or calendar would exceed. Credentials stay in
 * lib/secure-token-store.ts.
 */
export const appStateStorage = createJSONStorage(() => AsyncStorage);
