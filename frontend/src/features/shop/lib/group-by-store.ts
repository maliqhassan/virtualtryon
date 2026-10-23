import type { Garment } from '@/features/wardrobe';

/** A store the user has added pieces from by pasting links ("Your stores"). */
export type MyStore = {
  /** The store's web address without "www.", e.g. "outfitters.com.pk"; the group key. */
  host: string;
  /** The store's own address as it was linked (scheme, www., port), for "Visit store". */
  homeUrl: string;
  name: string;
  accentColor: string;
  garments: Garment[];
};

// The app's warm palette, so every store card fits the theme.
const ACCENTS = ['#8E3324', '#4A5578', '#2F6B4F', '#7A4E8C', '#B0662E', '#2E6A80'];

// scheme://[user@]host[:port] — the server only stores http(s) links without
// a user name, but parse strictly anyway. Not `new URL()`: React Native's URL
// support is incomplete on older engines.
const ORIGIN = /^(https?):\/\/(?:[^/?#@]*@)?([^/?#:@]+)(:\d+)?/i;

export function storeHost(url: string): string | null {
  const match = ORIGIN.exec(url);
  return match ? match[2].toLowerCase().replace(/^www\./, '') : null;
}

function storeHomeUrl(url: string): string | null {
  const match = ORIGIN.exec(url);
  return match ? `${match[1].toLowerCase()}://${match[2].toLowerCase()}${match[3] ?? ''}` : null;
}

function accentFor(host: string): string {
  let hash = 0;
  for (const char of host) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return ACCENTS[hash % ACCENTS.length];
}

/**
 * Groups pasted-link pieces by store. Stores come in the order of their most
 * recent piece (the wardrobe list is newest first). Pieces added before the
 * store's name was saved fall back to its web address.
 */
export function groupByStore(garments: Garment[]): MyStore[] {
  const stores = new Map<string, MyStore>();
  for (const garment of garments) {
    const host = garment.sourceUrl ? storeHost(garment.sourceUrl) : null;
    const homeUrl = garment.sourceUrl ? storeHomeUrl(garment.sourceUrl) : null;
    if (!host || !homeUrl) continue;
    const store = stores.get(host);
    if (store) {
      store.garments.push(garment);
      if (store.name === host && garment.sourceStore) store.name = garment.sourceStore;
    } else {
      stores.set(host, {
        host,
        homeUrl,
        name: garment.sourceStore || host,
        accentColor: accentFor(host),
        garments: [garment],
      });
    }
  }
  return [...stores.values()];
}
