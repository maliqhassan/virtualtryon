import { useEffect, useState } from 'react';

import { getStoredToken, setStoredToken } from '@/lib/secure-token-store';

/**
 * Whether the first-launch intro has been seen. Stored with the app's
 * existing device storage helper (secure store on a phone; in memory on
 * web, so the intro shows again after a web reload).
 */
const KEY = 'onboarding_seen';

export async function markOnboardingSeen(): Promise<void> {
  await setStoredToken(KEY, '1');
}

/** `null` while loading. */
export function useOnboardingSeen(): boolean | null {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    getStoredToken(KEY)
      .then((value) => {
        if (active) setSeen(value === '1');
      })
      // If storage can't be read, show the intro rather than a blank screen.
      .catch(() => {
        if (active) setSeen(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return seen;
}
