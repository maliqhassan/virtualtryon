import { Link, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppProgressBar } from '@/components/app-progress-bar';
import { AppScaffold } from '@/components/app-scaffold';
import { ThinkingIndicator } from '@/components/thinking-indicator';
import { useGarmentSessionStore } from '@/features/garment/store/garment-session';
import { useUploadSessionStore } from '@/features/user-photo/store/upload-session';

import { ProcessingImagesRow } from '../components/processing-images-row';
import { useTryOnJob } from '../hooks/use-tryon-job';
import { TRYON_STEP_LABELS } from '../services/tryon-job';

export function TryOnProcessingScreen() {
  const userImage = useUploadSessionStore((s) => s.selectedImage);
  const userPrepared = useUploadSessionStore((s) => s.preparedResult);
  const garmentImage = useGarmentSessionStore((s) => s.selectedImage);
  const garmentPrepared = useGarmentSessionStore((s) => s.preparedResult);

  const { start, isStarting, startError, job } = useTryOnJob();
  const hasAutoStarted = useRef(false);

  const bothReady = !!userPrepared && !!garmentPrepared;

  // Auto-starts once, when both inputs first become ready. Landing on a
  // screen named "processing" implies it's already processing — no extra
  // button tap to begin. The "Try Again" button below calls `start` again
  // directly, independent of this guard.
  useEffect(() => {
    if (bothReady && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      start({ userPhotoId: userPrepared!.id, garmentId: garmentPrepared!.id });
    }
  }, [bothReady, userPrepared, garmentPrepared, start]);

  useEffect(() => {
    if (job?.status === 'completed') {
      // replace, not push — "back" shouldn't return to a finished,
      // now-stale processing screen. Object form (not a template-literal
      // string) is what Expo Router's typed routes (app.json's
      // `typedRoutes` experiment) actually type-checks for a dynamic route.
      router.replace({ pathname: '/tryon-results/[jobId]', params: { jobId: job.id } });
    }
  }, [job]);

  if (!bothReady) {
    return (
      <AppScaffold>
        <Text className="text-2xl font-bold text-ink-primary">Almost there</Text>
        <Text className="mt-xs text-ink-secondary">
          You need both a photo of yourself and a clothing item before generating a try-on.
        </Text>

        <ProcessingImagesRow
          userImage={userImage}
          userReady={!!userPrepared}
          garmentImage={garmentImage}
          garmentReady={!!garmentPrepared}
        />

        <View className="mt-lg gap-sm">
          {!userPrepared && (
            <Link href="/upload-photo" className="text-sm font-semibold text-primary">
              Add your photo →
            </Link>
          )}
          {!garmentPrepared && (
            <Link href="/garment-upload" className="text-sm font-semibold text-primary">
              Add a garment →
            </Link>
          )}
        </View>
      </AppScaffold>
    );
  }

  const retry = () => start({ userPhotoId: userPrepared!.id, garmentId: garmentPrepared!.id });
  const isWorking = isStarting || !job || job.status === 'pending' || job.status === 'processing';
  const failed = !!startError || job?.status === 'failed';

  return (
    <AppScaffold scroll={false}>
      <Text className="text-2xl font-bold text-ink-primary">Generating your try-on</Text>

      <ProcessingImagesRow
        userImage={userImage}
        userReady
        garmentImage={garmentImage}
        garmentReady
      />

      <View className="flex-1 items-center justify-center gap-lg">
        {isWorking && (
          <>
            <ThinkingIndicator step={job?.stepId ? TRYON_STEP_LABELS[job.stepId] : 'Starting…'} />
            <View className="w-full gap-sm">
              <Text className="text-center text-ink-secondary">{job?.progress ?? 0}%</Text>
              <AppProgressBar value={job?.progress ?? 0} />
            </View>
          </>
        )}

        {failed && (
          <View className="items-center gap-md">
            <Text className="text-center text-error" accessibilityRole="alert">
              {startError?.message ?? job?.errorMessage ?? 'Something went wrong.'}
            </Text>
            <AppButton label="Try Again" variant="secondary" onPress={retry} />
          </View>
        )}
      </View>
    </AppScaffold>
  );
}
