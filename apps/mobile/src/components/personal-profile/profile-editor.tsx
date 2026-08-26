import { useMemo, useState } from 'react';
import { Alert, Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { AvoidedIngredientProfile } from '@/domain/avoided-ingredients/profile';
import { findPredefinedIngredient } from '@/domain/avoided-ingredients/catalog';
import {
  acceptSavedDraft,
  addCustom,
  catalogueSections,
  clearFieldError,
  createProfileEditorState,
  isProfileDraftDirty,
  profileErrorMessage,
  removeCustom,
  renameCustom,
  resetDraft,
  togglePredefined,
} from '@/features/personal-profile/profile-editor-state';

type Props = {
  activeProfile: AvoidedIngredientProfile;
  saving: boolean;
  recovered: boolean;
  saveFailed: boolean;
  onSave(profile: AvoidedIngredientProfile): Promise<boolean>;
  onRestore(): void;
  registerDirtyGuard(isDirty: () => boolean): void;
};

export function ProfileEditor({ activeProfile, saving, recovered, saveFailed, onSave, onRestore, registerDirtyGuard }: Props) {
  const [editor, setEditor] = useState(() => createProfileEditorState(activeProfile));
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const newId = 'new-custom';
  const dirty = isProfileDraftDirty(editor);
  const hasErrors = Object.keys(editor.fieldErrors).length > 0;
  registerDirtyGuard(() => dirty);
  const sections = useMemo(() => catalogueSections(query), [query]);
  const formatError = (error: import('@/domain/avoided-ingredients/profile').ProfileValidationError) => {
    const label = error.conflictingId
      ? findPredefinedIngredient(error.conflictingId)?.labelPl
        ?? editor.draft.customIngredients.find((ingredient) => ingredient.id === error.conflictingId)?.name
      : undefined;
    return profileErrorMessage(error, label);
  };

  const add = () => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const next = addCustom(clearFieldError(editor, newId), id, newName);
    setEditor(next.fieldErrors[id]
      ? { ...next, fieldErrors: { ...next.fieldErrors, [newId]: next.fieldErrors[id] } }
      : next);
    if (!next.fieldErrors[id]) setNewName('');
  };
  const save = async () => {
    const submitted = editor.draft;
    if (await onSave(submitted)) {
      setEditor((current) => JSON.stringify(current.draft) === JSON.stringify(submitted)
        ? acceptSavedDraft(current)
        : { ...current, active: submitted });
    }
  };
  const restore = () => {
    onRestore();
    setEditor((current) => resetDraft(current));
  };

  return (
    <ThemedView style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={(
          <View style={styles.header}>
            <ThemedText themeColor="textSecondary">
              Wybierz składniki, których osobiście chcesz unikać. Lista nie jest poradą medyczną ani pełnym wykazem alergenów.
            </ThemedText>
            {recovered && <Banner text="Odzyskano ostatni poprawny profil z kopii." />}
            {saveFailed && <Banner error text="Nie udało się zapisać. Poprzedni profil pozostaje aktywny." />}
            <TextInput
              accessibilityLabel="Szukaj składnika"
              onChangeText={setQuery}
              placeholder="Szukaj składnika lub numeru E"
              placeholderTextColor="#75867F"
              style={styles.input}
              value={query}
            />
          </View>
        )}
        renderSectionHeader={({ section }) => <ThemedText type="smallBold" style={styles.sectionTitle}>{section.title}</ThemedText>}
        renderItem={({ item }) => {
          const selected = editor.draft.selectedPredefinedIds.includes(item.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => setEditor((current) => togglePredefined(current, item.id))}
              style={[styles.row, selected && styles.selectedRow]}>
              <ThemedText>{item.labelPl}</ThemedText>
              <ThemedText style={styles.check}>{selected ? '✓' : ''}</ThemedText>
            </Pressable>
          );
        }}
        ListFooterComponent={(
          <View style={styles.customSection}>
            <ThemedText type="subtitle">Własne składniki</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Dopasowanie odbywa się wyłącznie do dokładnej nazwy.</ThemedText>
            {editor.draft.customIngredients.map((ingredient) => (
              <CustomRow
                key={`${ingredient.id}:${ingredient.name}`}
                id={ingredient.id}
                name={ingredient.name}
                error={editor.fieldErrors[ingredient.id] && formatError(editor.fieldErrors[ingredient.id])}
                onRename={(name) => setEditor((current) => renameCustom(current, ingredient.id, name))}
                onDelete={() => setEditor((current) => removeCustom(current, ingredient.id))}
              />
            ))}
            <View style={styles.addRow}>
              <TextInput
                accessibilityLabel="Nowy własny składnik"
                onChangeText={(value) => {
                  setNewName(value);
                  setEditor((current) => clearFieldError(current, newId));
                }}
                onSubmitEditing={add}
                placeholder="np. inulina"
                placeholderTextColor="#75867F"
                style={[styles.input, styles.flex]}
                value={newName}
              />
              <ActionButton label="Dodaj" onPress={add} disabled={saving} />
            </View>
            {editor.fieldErrors[newId] && <ThemedText style={styles.error}>{formatError(editor.fieldErrors[newId])}</ThemedText>}
            <View style={styles.actions}>
              <ActionButton label={saving ? 'Zapisywanie…' : 'Zapisz profil'} onPress={() => void save()} disabled={saving || !dirty || hasErrors} />
              {saveFailed && <ActionButton label="Ponów zapis" onPress={() => void save()} disabled={saving || hasErrors} secondary />}
              {(dirty || saveFailed) && <ActionButton label="Przywróć zapisany profil" onPress={restore} disabled={saving} secondary />}
            </View>
          </View>
        )}
      />
    </ThemedView>
  );
}

function CustomRow({ id, name, error, onRename, onDelete }: { id: string; name: string; error?: string; onRename(name: string): void; onDelete(): void }) {
  const [value, setValue] = useState(name);
  return (
    <View style={styles.customRow}>
      <View style={styles.flex}>
        <TextInput accessibilityLabel={`Nazwa składnika ${name}`} onChangeText={setValue} onEndEditing={() => onRename(value)} style={styles.input} value={value} />
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
      </View>
      <Pressable accessibilityLabel={`Usuń ${name}`} accessibilityRole="button" onPress={onDelete} style={styles.deleteButton}>
        <ThemedText style={styles.deleteText}>Usuń</ThemedText>
      </Pressable>
    </View>
  );
}

function ActionButton({ label, onPress, disabled, secondary = false }: { label: string; onPress(): void; disabled?: boolean; secondary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondaryButton, disabled && styles.disabled]}>
      <ThemedText style={secondary ? styles.secondaryText : styles.buttonText}>{label}</ThemedText>
    </Pressable>
  );
}

function Banner({ text, error = false }: { text: string; error?: boolean }) {
  return <View style={[styles.banner, error && styles.errorBanner]}><ThemedText type="small">{text}</ThemedText></View>;
}

export function confirmDiscard(onDiscard: () => void) {
  Alert.alert('Odrzucić zmiany?', 'Niezapisane zmiany zostaną utracone.', [
    { text: 'Zostań', style: 'cancel' },
    { text: 'Odrzuć', style: 'destructive', onPress: onDiscard },
  ]);
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: Spacing.three, paddingBottom: Spacing.five },
  header: { gap: Spacing.two, marginBottom: Spacing.three },
  input: { backgroundColor: '#FFFFFF', color: '#17352D', borderColor: '#CCDAD2', borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
  sectionTitle: { backgroundColor: '#F4F8F5', paddingVertical: 10, marginTop: Spacing.two },
  row: { minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E1E9E4', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedRow: { backgroundColor: '#E3F2E8' }, check: { color: '#1F7A57', fontWeight: '800' },
  customSection: { gap: Spacing.two, marginTop: Spacing.four }, customRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  addRow: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' }, flex: { flex: 1 },
  deleteButton: { padding: 12 }, deleteText: { color: '#B42318', fontWeight: '700' }, error: { color: '#B42318', marginTop: 4 },
  actions: { gap: Spacing.two, marginTop: Spacing.two }, button: { backgroundColor: '#1F7A57', borderRadius: 14, padding: 14, alignItems: 'center' },
  secondaryButton: { backgroundColor: '#E3F2E8' }, buttonText: { color: '#FFFFFF', fontWeight: '700' }, secondaryText: { color: '#1F7A57', fontWeight: '700' }, disabled: { opacity: 0.5 },
  banner: { backgroundColor: '#FFF5CC', borderRadius: 12, padding: 12 }, errorBanner: { backgroundColor: '#FDE7E5' },
});
