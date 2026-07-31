import { Link, router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { ThinkingIndicator } from '@/components/thinking-indicator';
import { useGarmentSessionStore } from '@/features/garment/store/garment-session';
import { useUploadSessionStore } from '@/features/user-photo/store/upload-session';

import { ProcessingImagesRow } from '../components/processing-images-row';
import { useTryOnJob } from '../hooks/use-tryon-job';

function describeWorkingStatus(status: 'queued' | 'processing' | undefined): string {
  if (status === 'queued') return 'Queued…';
  if (status === 'processing') return 'Processing…';
  return 'Starting…';
}

const NO_WORKER_MESSAGE =
  "Your request has been queued. AI generation isn't connected yet. This job will start automatically once the inference worker is available.";

export function TryOnProcessingScreen() {
  const userImage = useUploadSessionStore((s) => s.selectedImage);
  const userPrepared = useUploadSessionStore((s) => s.preparedResult);
  const garmentImage = useGarmentSessionStore((s) => s.selectedImage);
  const garmentPrepared = useGarmentSessionStore((s) => s.preparedResult);

  const { start, isStarting, startError, job, pollingTimedOut, refetchJob } = useTryOnJob();
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
      // Unreachable today (no worker ever moves a job to `completed`) —
      // kept as-is so this screen is already correct once one exists.
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
  const isWorking = isStarting || !job || job.status === 'queued' || job.status === 'processing';
  const failed = !!startError || job?.status === 'failed';
  // Bounded polling (useTryOnJobQuery) gave up after 10s with no inference
  // worker ever advancing the job — this is not a failure, so it doesn't
  // join `failed`; it's a distinct, honest "nothing is happening yet" state.
  const waitingForWorker = isWorking && !isStarting && !!job && pollingTimedOut;

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
        {isWorking && !waitingForWorker && (
          <ThinkingIndicator
            step={describeWorkingStatus(
              job?.status === 'queued' || job?.status === 'processing' ? job.status : undefined,
            )}
          />
        )}

        {waitingForWorker && (
          <View className="items-center gap-md px-lg">
            <Text className="text-center text-ink-secondary">{NO_WORKER_MESSAGE}</Text>
            <AppButton label="Refresh" variant="secondary" onPress={() => refetchJob()} />
          </View>
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
