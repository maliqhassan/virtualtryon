import axios from 'axios';
import { Platform } from 'react-native';

import { withRetry } from '@/lib/with-retry';
import type { PickedImage } from '@/types';

import { uploadClient } from './upload-client';

/**
 * Thrown when the backend genuinely can't be reached (no response at all,
 * even after retries) or doesn't have this route yet (404 — today's actual
 * reality, since the real upload endpoints aren't built yet). Callers catch
 * this specifically and fall back to a mock response — any other error
 * means the backend responded for real and should be surfaced, not hidden.
 */
export class BackendUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'BackendUnavailableError';
    this.cause = options?.cause;
  }
}

export type UploadImageOptions = {
  path: string;
  fieldName: string;
  image: PickedImage;
  /** Extra form fields sent alongside the file part (e.g. width/height). */
  fields?: Record<string, string | number>;
  onProgress?: (percent: number) => void;
  maxRetries?: number;
};

function inferFileName(image: PickedImage): string {
  if (image.mimeType === 'image/png') return 'upload.png';
  if (image.mimeType === 'image/heic' || image.mimeType === 'image/heif') return 'upload.heic';
  return 'upload.jpg';
}

async function buildFormData(
  image: PickedImage,
  fieldName: string,
  fields?: Record<string, string | number>,
): Promise<FormData> {
  const formData = new FormData();
  if (Platform.OS === 'web') {
    // Web's real FormData/fetch needs an actual Blob for the file part.
    // RN's { uri, name, type } convention (used below) only means something
    // to RN's native networking layer — in a browser it just gets
    // stringified to "[object Object]". image.uri is a data:/blob: URI on
    // web (from expo-image-picker or expo-camera's web implementations), so
    // fetching it back yields the real Blob to append instead.
    const blob = await (await fetch(image.uri)).blob();
    formData.append(fieldName, blob, image.fileName ?? inferFileName(image));
  } else {
    // React Native's FormData accepts a { uri, name, type } object for a file
    // part — a platform-specific shape the DOM-oriented FormData.append types
    // (Blob | string) don't model, hence the cast. This is a real RN/TS
    // mismatch, not a type-safety hole: RN's networking layer specifically
    // recognizes this shape and reads the file from `uri`.
    formData.append(fieldName, {
      uri: image.uri,
      name: image.fileName ?? inferFileName(image),
      type: image.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
  }
  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, String(value));
    }
  }
  return formData;
}

function isRetriableAxiosError(error: unknown): boolean {
  // eslint-disable-next-line import/no-named-as-default-member -- axios.isAxiosError is the documented API; the rule false-positives on axios's dual export shape.
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true; // no response at all — network error / timeout, worth retrying
  return error.response.status >= 500; // server error — worth retrying
}

function extractErrorDetail(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    // FastAPI validation errors put an array here rather than a string;
    // parsing that shape isn't worth it against a backend that doesn't
    // exist yet to test it — falls back to a generic message instead.
    if (typeof detail === 'string') return detail;
  }
  return undefined;
}

function classifyUploadError(error: unknown): Error {
  // eslint-disable-next-line import/no-named-as-default-member -- axios.isAxiosError is the documented API; the rule false-positives on axios's dual export shape.
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new BackendUnavailableError('No response from backend after retries.', {
        cause: error,
      });
    }
    if (error.response.status === 404) {
      return new BackendUnavailableError(
        'Backend is reachable but this route does not exist yet.',
        {
          cause: error,
        },
      );
    }
    if (error.response.status >= 500) {
      return new Error(`Server error (${error.response.status}). Please try again later.`);
    }
    return new Error(
      extractErrorDetail(error.response.data) ?? `Request failed (${error.response.status}).`,
    );
  }
  return error instanceof Error ? error : new Error('Unknown upload error.');
}

/**
 * Uploads a picked image as multipart/form-data, with progress reporting
 * and automatic retry on transient failures (network errors, 5xx). Throws
 * `BackendUnavailableError` when the backend can't be reached at all or
 * doesn't have this route — callers decide what to do about that (the two
 * current callers fall back to a mock). Any other thrown error is a real
 * response from a real backend and should be surfaced as-is.
 */
export async function uploadImage<T>(options: UploadImageOptions): Promise<T> {
  const { path, fieldName, image, fields, onProgress, maxRetries = 2 } = options;

  const attempt = async (): Promise<T> => {
    onProgress?.(0);
    const formData = await buildFormData(image, fieldName, fields);
    const response = await uploadClient.post<T>(path, formData, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
    return response.data;
  };

  try {
    return await withRetry(attempt, {
      maxRetries,
      baseDelayMs: 500,
      shouldRetry: isRetriableAxiosError,
    });
  } catch (error) {
    throw classifyUploadError(error);
  }
}
