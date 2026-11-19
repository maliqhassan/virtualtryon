import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { PickedImage } from '@/types';

import { useSelectedPhoto } from '../selected-photo-store';
import {
  deleteMyPhoto,
  deleteMyPhotos,
  listMyPhotos,
  uploadMyPhoto,
} from '../services/my-photo-api';
import type { MyPhoto } from '../types';

export const MY_PHOTO_QUERY_KEY = ['my-photos'] as const;

/** All of the user's model photos, newest first. */
export function useMyPhotosQuery() {
  return useQuery({ queryKey: MY_PHOTO_QUERY_KEY, queryFn: listMyPhotos });
}

/** The photo the user picked, or the newest when they haven't (or it's gone). */
export function pickInUse(photos: MyPhoto[], selectedId: string | null): MyPhoto | null {
  return photos.find((p) => p.id === selectedId) ?? photos[0] ?? null;
}

/** The photo try-ons use: the one the user picked, else the newest (null
 * until they've added one). */
export function useMyPhotoQuery() {
  const selectedId = useSelectedPhoto((state) => state.photoId);
  return useQuery({
    queryKey: MY_PHOTO_QUERY_KEY,
    queryFn: listMyPhotos,
    select: (photos: MyPhoto[]) => pickInUse(photos, selectedId),
  });
}

/** The id of the photo try-ons use: from the loaded list, or, before it has
 * loaded, the user's saved pick (the server checks it either way). */
export function useInUsePhotoId(): string | undefined {
  const selectedId = useSelectedPhoto((state) => state.photoId);
  const inUse = useMyPhotoQuery().data;
  return inUse?.id ?? selectedId ?? undefined;
}

/** Adds a model photo and makes it the one in use. */
export function useUploadMyPhoto() {
  const queryClient = useQueryClient();
  const select = useSelectedPhoto((state) => state.select);
  const [progress, setProgress] = useState(0);

  const mutation = useMutation<MyPhoto, Error, { image: PickedImage }>({
    retry: false, // uploadImage already retries the errors worth retrying
    mutationFn: ({ image }) => {
      setProgress(0);
      return uploadMyPhoto(image, setProgress);
    },
    onSuccess: (photo) => {
      queryClient.setQueryData<MyPhoto[]>(MY_PHOTO_QUERY_KEY, (current = []) => [
        photo,
        ...current.filter((p) => p.id !== photo.id),
      ]);
      select(photo.id);
    },
  });

  return { ...mutation, progress };
}

/** Deletes one model photo. If it was in use, the newest remaining one is. */
export function useDeleteMyPhoto() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: deleteMyPhoto,
    onSuccess: (_, photoId) =>
      queryClient.setQueryData<MyPhoto[]>(MY_PHOTO_QUERY_KEY, (current = []) =>
        current.filter((p) => p.id !== photoId),
      ),
  });
}

export function useDeleteMyPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMyPhotos,
    onSuccess: () => queryClient.setQueryData(MY_PHOTO_QUERY_KEY, []),
  });
}
