import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';

import { GARMENT_CATEGORIES } from '../types';

type CategoryPickerModalProps = {
  visible: boolean;
  selected: string | null;
  onCancel: () => void;
  onSelect: (category: string) => void;
};

/**
 * Same Modal shell as components/rename-modal.tsx (plain View backdrop,
 * explicit Cancel button — not tap-outside-to-dismiss, which would need a
 * backdrop Pressable wrapping the option Pressables; avoiding that nesting
 * entirely rather than risk the same nested-<button> issue found and
 * fixed in SavedLookCard). Tapping an option selects and closes
 * immediately — no separate Save step, since that's how a picker
 * (as opposed to a text-edit) naturally behaves.
 */
export function CategoryPickerModal({
  visible,
  selected,
  onCancel,
  onSelect,
}: CategoryPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/40 px-xl">
        <View className="w-full gap-xs rounded-xl bg-surface p-lg">
          <Text className="mb-sm text-lg font-semibold text-ink-primary">Category</Text>
          <ScrollView className="max-h-96">
            {GARMENT_CATEGORIES.map((category) => (
              <Pressable
                key={category}
                onPress={() => onSelect(category)}
                accessibilityRole="button"
                accessibilityState={{ selected: category === selected }}
                className={`rounded-md px-md py-sm ${category === selected ? 'bg-primary/10' : ''}`}
              >
                <Text
                  className={
                    category === selected ? 'font-semibold text-primary' : 'text-ink-primary'
                  }
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View className="mt-sm flex-row justify-end">
            <AppButton label="Cancel" variant="secondary" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
