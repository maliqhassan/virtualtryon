import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { useGarmentSessionStore } from '@/features/garment/store/garment-session';
import { useUploadSessionStore } from '@/features/user-photo/store/upload-session';

import { CompareToggle, type CompareMode } from '../components/compare-toggle';
import { ResultCanvas } from '../components/result-canvas';
import { SourceImagesRow } from '../components/source-images-row';
import { useTryOnJobQuery } from '../hooks/use-tryon-job-query';

export function TryOnResultsScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const jobQuery = useTryOnJobQuery(jobId ?? null);
  const job = jobQuery.data ?? null;

  const userImage = useUploadSessionStore((s) => s.selectedImage);
  const garmentImage = useGarmentSessionStore((s) => s.selectedImage);

  const [compareMode, setCompareMode] = useState<CompareMode>('after');
  const [isSaved, setIsSaved] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: 'Check out my virtual try-on with VirtualTryOn!' });
    } catch {
      // Share sheet dismissed/cancelled — not an error worth surfacing.
    }
  }, []);

  const handleRetry = useCallback(() => {
    router.replace('/tryon-processing');
  }, []);

  // No job id at all — shouldn't happen via the app's own navigation (the
  // route requires it), but guards a malformed/manual URL.
  if (!jobId) {
    return (
      <AppScaffold>
        <Text className="text-2xl font-bold text-ink-primary">No result to show</Text>
        <Text className="mt-xs text-ink-secondary">This link is missing a try-on reference.</Text>
        <Link href="/" className="mt-lg text-sm font-semibold text-primary">
          Go home →
        </Link>
      </AppScaffold>
    );
  }

  if (jobQuery.isLoading) {
    return (
      <AppScaffold>
        <Text className="text-2xl font-bold text-ink-primary">Loading your result…</Text>
      </AppScaffold>
    );
  }

  if (jobQuery.isError || !job) {
    return (
      <AppScaffold>
        <Text className="text-2xl font-bold text-ink-primary">Couldn&rsquo;t find this result</Text>
        <Text className="mt-xs text-ink-secondary">
          This try-on may have expired. Start a new one instead.
        </Text>
        <Link href="/tryon-processing" className="mt-lg text-sm font-semibold text-primary">
          Start a new try-on →
        </Link>
      </AppScaffold>
    );
  }

  if (job.status === 'failed') {
    return (
      <AppScaffold>
        <Text className="text-2xl font-bold text-ink-primary">Generation failed</Text>
        <Text className="mt-xs text-error" accessibilityRole="alert">
          {job.errorMessage ?? 'Something went wrong.'}
        </Text>
        <AppButton label="Try Again" variant="secondary" onPress={handleRetry} />
      </AppScaffold>
    );
  }

  if (job.status !== 'completed' || !job.result) {
    // Reachable only via a direct/stale link to a job that's still running —
    // normal in-app navigation only arrives here once completed. Points
    // back at processing rather than trying to resume watching this
    // specific (possibly long-gone) job id.
    return (
      <AppScaffold>
        <Text className="text-2xl font-bold text-ink-primary">Still processing</Text>
        <Text className="mt-xs text-ink-secondary">
          This try-on hasn&rsquo;t finished generating yet.
        </Text>
        <Link href="/tryon-processing" className="mt-lg text-sm font-semibold text-primary">
          Go to processing →
        </Link>
      </AppScaffold>
    );
  }

  const { result } = job;

  return (
    <AppScaffold>
      <Text className="text-2xl font-bold text-ink-primary">Your try-on</Text>

      <View className="mt-lg">
        <SourceImagesRow userImage={userImage} garmentImage={garmentImage} />
      </View>

      <View className="mt-lg">
        <CompareToggle mode={compareMode} onChange={setCompareMode} />
      </View>

      <View className="mt-md">
        {compareMode === 'after' ? (
          <ResultCanvas
            uri={result.imageUri}
            placeholderCaption={result.mockCaption ?? undefined}
            caption={result.reasoning}
          />
        ) : (
          <ResultCanvas
            uri={userImage?.uri ?? null}
            placeholderCaption="Original photo not available"
            caption="Your original photo"
          />
        )}
      </View>

      <View className="mt-xl gap-md">
        <AppButton
          label={isSaved ? 'Saved' : 'Save'}
          variant={isSaved ? 'secondary' : 'primary'}
          onPress={() => setIsSaved((saved) => !saved)}
        />
        <AppButton label="Share" variant="secondary" onPress={handleShare} />
        <AppButton label="Retry" variant="secondary" onPress={handleRetry} />
      </View>
    </AppScaffold>
  );
}
