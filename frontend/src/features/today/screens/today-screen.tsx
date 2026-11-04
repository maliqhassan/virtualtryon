import { AppScaffold } from '@/components/app-scaffold';
import { ScreenHeader } from '@/components/screen-header';

/** Today: the app's default tab. */
export function TodayScreen() {
  return (
    <AppScaffold inTabs>
      <ScreenHeader variant="editorial" eyebrow="Today" title="Good morning" />
    </AppScaffold>
  );
}
