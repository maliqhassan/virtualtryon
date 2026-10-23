import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { PickedImage } from '@/types';

import { deleteMyPhotos, listMyPhotos, uploadMyPhoto } from '../services/my-photo-api';
import type { MyPhoto, PhotoAngle } from '../types';

export const MY_PHOTO_QUERY_KEY = ['my-photos'] as const;

/** Every view the user has added. */
export function useMyPhotosQuery() {
  return useQuery({ queryKey: MY_PHOTO_QUERY_KEY, queryFn: listMyPhotos });
}

/** The front photo: the one every try-on uses (null until it's added). */
export function useMyPhotoQuery() {
  return useQuery({
    queryKey: MY_PHOTO_QUERY_KEY,
    queryFn: listMyPhotos,
    select: (photos: MyPhoto[]) => photos.find((p) => p.angle === 'front') ?? null,
  });
}

export function useUploadMyPhoto() {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation<MyPhoto, Error, { image: PickedImage; angle: PhotoAngle }>({
    retry: false, // uploadImage already retries the errors worth retrying
    mutationFn: ({ image, angle }) => {
      setProgress(0);
      return uploadMyPhoto(image, angle, setProgress);
    },
    onSuccess: (photo) =>
      queryClient.setQueryData<MyPhoto[]>(MY_PHOTO_QUERY_KEY, (current = []) => [
        ...current.filter((p) => p.angle !== photo.angle),
        photo,
      ]),
  });

  return { ...mutation, progress };
}

export function useDeleteMyPhotos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMyPhotos,
    onSuccess: () => queryClient.setQueryData(MY_PHOTO_QUERY_KEY, []),
  });
}
