import type { Href } from 'expo-router';

export const TRY_ON_HOME_HREF = '/' as Href;
export function tryOnJobHref(jobId: string): Href {
  return { pathname: '/tryon/[jobId]', params: { jobId } } as Href;
}
