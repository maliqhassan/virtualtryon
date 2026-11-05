import { z } from 'zod';

/**
 * Expo only inlines env vars prefixed with EXPO_PUBLIC_ into the client bundle.
 * Validating them at startup turns a missing/misconfigured .env into a loud
 * boot-time error instead of a silent undefined deep in a request.
 */
const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  // Firebase's Web client ID (not secret): Google returns a sign-in token
  // for it. Optional so the app still runs without it; Google sign-in then
  // says it isn't available.
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
});

export const env = envSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
});
