import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppScaffold } from '@/components/app-scaffold';
import { ThinkingIndicator } from '@/components/thinking-indicator';

import { useCreateProfile } from '../hooks/use-create-profile';
import { useProfileQuery } from '../hooks/use-profile-query';
import { useUpdateProfile } from '../hooks/use-update-profile';

const HEIGHT_RANGE = { min: 80, max: 250 };
const WEIGHT_RANGE = { min: 20, max: 300 };
const AGE_RANGE = { min: 0, max: 120 };

function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : undefined;
}

function inRange(value: number | undefined, range: { min: number; max: number }): boolean {
  return value !== undefined && value >= range.min && value <= range.max;
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  errorText?: string;
};

function Field({ label, value, onChangeText, placeholder, keyboardType, errorText }: FieldProps) {
  return (
    <View className="gap-xs">
      <Text className="text-sm font-semibold text-ink-secondary">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType ?? 'default'}
        className="rounded-md border border-border px-md py-sm text-ink-primary"
      />
      {errorText && (
        <Text className="text-xs text-error" accessibilityRole="alert">
          {errorText}
        </Text>
      )}
    </View>
  );
}

export function EditProfileScreen() {
  const profileQuery = useProfileQuery();
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const profile = profileQuery.data;
  const isCreating = !profile;

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [age, setAge] = useState(
    profile?.age !== null && profile?.age !== undefined ? String(profile.age) : '',
  );
  const [gender, setGender] = useState(profile?.gender ?? '');
  const [heightCm, setHeightCm] = useState(profile ? String(profile.heightCm) : '');
  const [weightKg, setWeightKg] = useState(profile ? String(profile.weightKg) : '');
  const [bodyType, setBodyType] = useState(profile?.bodyType ?? '');
  const [preferredFit, setPreferredFit] = useState(profile?.preferredFit ?? '');

  if (profileQuery.isLoading) {
    return (
      <AppScaffold scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ThinkingIndicator step="Loading your profile…" />
        </View>
      </AppScaffold>
    );
  }

  const parsedHeight = parseOptionalNumber(heightCm);
  const parsedWeight = parseOptionalNumber(weightKg);
  const parsedAge = parseOptionalNumber(age);

  const heightValid = inRange(parsedHeight, HEIGHT_RANGE);
  const weightValid = inRange(parsedWeight, WEIGHT_RANGE);
  const ageValid = age.trim().length === 0 || inRange(parsedAge, AGE_RANGE);

  const canSubmit = heightValid && weightValid && ageValid;
  const mutation = isCreating ? createProfile : updateProfile;

  const handleSubmit = () => {
    if (!canSubmit || parsedHeight === undefined || parsedWeight === undefined) return;

    const input = {
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      displayName: displayName.trim() || undefined,
      age: parsedAge,
      gender: gender.trim() || undefined,
      bodyType: bodyType.trim() || undefined,
      preferredFit: preferredFit.trim() || undefined,
    };

    if (isCreating) {
      createProfile.mutate(input, { onSuccess: () => router.back() });
    } else {
      updateProfile.mutate(input, { onSuccess: () => router.back() });
    }
  };

  return (
    <AppScaffold>
      <Text className="text-2xl font-bold text-ink-primary">
        {isCreating ? 'Create Profile' : 'Edit Profile'}
      </Text>

      <View className="mt-lg gap-lg">
        <Field
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="e.g. Ada"
        />
        <Field
          label="Age"
          value={age}
          onChangeText={setAge}
          placeholder="e.g. 28"
          keyboardType="numeric"
          errorText={!ageValid ? 'Age must be between 0 and 120.' : undefined}
        />
        <Field label="Gender" value={gender} onChangeText={setGender} placeholder="e.g. female" />
        <Field
          label="Height (cm)"
          value={heightCm}
          onChangeText={setHeightCm}
          placeholder="e.g. 175"
          keyboardType="numeric"
          errorText={!heightValid ? 'Height must be between 80 and 250 cm.' : undefined}
        />
        <Field
          label="Weight (kg)"
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="e.g. 70"
          keyboardType="numeric"
          errorText={!weightValid ? 'Weight must be between 20 and 300 kg.' : undefined}
        />
        <Field
          label="Body type"
          value={bodyType}
          onChangeText={setBodyType}
          placeholder="e.g. athletic"
        />
        <Field
          label="Preferred fit"
          value={preferredFit}
          onChangeText={setPreferredFit}
          placeholder="e.g. slim"
        />

        <AppButton
          label={mutation.isPending ? 'Saving…' : 'Save'}
          variant="primary"
          onPress={handleSubmit}
          disabled={!canSubmit || mutation.isPending}
        />

        {mutation.isError && (
          <Text className="text-error" accessibilityRole="alert">
            Couldn’t save your profile. Check your connection and try again.
          </Text>
        )}
      </View>
    </AppScaffold>
  );
}
