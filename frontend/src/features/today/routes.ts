import type { Href } from 'expo-router';

/** Screens Today links to (design_handoff_ai_stylist/04-react-native.md §3). */
export const CHAT_HREF = '/chat' as Href;
export const RATE_HREF = '/rate' as Href;
export const GENERATE_HREF = '/generate' as Href;
export const CALENDAR_HREF = '/calendar' as Href;
/** The calendar opened on one day (a dayNumber); the screen checks it's in range. */
export function calendarDayHref(day: number): Href {
  return { pathname: '/calendar', params: { day: String(day) } } as Href;
}
export const NOTIFICATIONS_HREF = '/notifications' as Href;
