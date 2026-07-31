import { useState } from 'react';
import { Modal, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/app-button';

export type RenameModalProps = {
  visible: boolean;
  title: string;
  placeholder: string;
  initialValue: string;
  onCancel: () => void;
  onSave: (value: string) => void;
};

/**
 * Generic rename/text-edit modal — promoted from features/saved-looks'
 * originally-feature-local RenameLookModal once Wardrobe became a second
 * real consumer of the exact same shape, matching the same "second
 * consumer justifies promoting to shared" precedent already used on the
 * backend (app/services/image_validation.py).
 *
 * A custom Modal + TextInput, not Alert.prompt — that API is iOS-only and
 * would silently do nothing on Android.
 */
export function RenameModal({
  visible,
  title,
  placeholder,
  initialValue,
  onCancel,
  onSave,
}: RenameModalProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/40 px-xl">
        <View className="w-full gap-md rounded-xl bg-surface p-lg">
          <Text className="text-lg font-semibold text-ink-primary">{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            autoFocus
            maxLength={200}
            placeholder={placeholder}
            className="rounded-md border border-border px-md py-sm text-ink-primary"
          />
          <View className="flex-row justify-end gap-sm">
            <AppButton label="Cancel" variant="secondary" onPress={onCancel} />
            <AppButton
              label="Save"
              variant="primary"
              onPress={() => onSave(value.trim())}
              disabled={!value.trim()}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
