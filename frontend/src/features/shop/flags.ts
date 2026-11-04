/**
 * Match scores on product cards need `product.match` from the catalog API
 * (04-react-native.md §9), which the server doesn't send yet. Off by
 * default; set EXPO_PUBLIC_MATCH_SCORES=true once it does.
 */
export const MATCH_SCORES_ENABLED = process.env.EXPO_PUBLIC_MATCH_SCORES === 'true';
