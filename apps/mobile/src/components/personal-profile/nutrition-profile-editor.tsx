import { useState } from 'react';
import Slider from '@react-native-community/slider';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { nutrientSliderMaximum, nutrientSliderStep } from '@/domain/nutrition';
import { PersonalProfile } from '@/domain/personal-profile';
import {
  acceptSubmittedNutritionProfile,
  addNutritionRuleDraft,
  createNutritionEditorState,
  isNutritionDraftDirty,
  nutritionFieldError,
  prepareNutritionProfile,
  removeNutritionRuleDraft,
  resetNutritionDraft,
  unusedNutrients,
  updateNutritionRuleDraft,
} from '@/features/personal-profile/nutrition-editor-state';
import { directionLabel, nutrientLabel, nutrientUnit } from '@/features/personal-profile/nutrition-presentation';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  activeProfile: PersonalProfile;
  saving: boolean;
  recovered: boolean;
  saveFailed: boolean;
  onSave(profile: PersonalProfile): Promise<boolean>;
  onRestore(): void;
  registerDirtyGuard(isDirty: () => boolean): void;
};

export function NutritionProfileEditor({ activeProfile, saving, recovered, saveFailed, onSave, onRestore, registerDirtyGuard }: Props) {
  const [editor, setEditor] = useState(() => createNutritionEditorState(activeProfile));
  const dirty = isNutritionDraftDirty(editor);
  registerDirtyGuard(() => dirty);
  const save = async () => {
    const prepared = prepareNutritionProfile(editor);
    if (!prepared.ok) { setEditor(prepared.state); return; }
    const submitted = prepared.profile;
    if (await onSave(submitted)) setEditor((current) => acceptSubmittedNutritionProfile(current, submitted));
  };
  const restore = () => { onRestore(); setEditor((current) => resetNutritionDraft(current)); };

  return <ThemedView style={styles.screen}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <ThemedText themeColor="textSecondary">Ustaw próg jako wartość powyżej albo poniżej wybranej liczby. Próg działa dla wartości na 100 g oraz na 100 ml, zależnie od danych produktu.</ThemedText>
    <ThemedText type="small" themeColor="textSecondary">Wartość równa progowi nie uruchamia ostrzeżenia.</ThemedText>
    {recovered && <Banner text="Odzyskano ostatni poprawny profil z kopii." />}
    {saveFailed && <Banner text="Nie udało się zapisać. Poprzedni profil pozostaje aktywny." />}

    <ThemedText type="subtitle">Twoje progi</ThemedText>
    {editor.rules.length === 0 && <ThemedText themeColor="textSecondary">Nie ustawiono jeszcze żadnych progów.</ThemedText>}
    {editor.rules.map((rule) => <RuleCard key={rule.nutrient} rule={rule} editor={editor} onChange={(changes) => setEditor((current) => updateNutritionRuleDraft(current, rule.nutrient, changes))} onRemove={() => setEditor((current) => removeNutritionRuleDraft(current, rule.nutrient))} />)}

    {unusedNutrients(editor).length > 0 && <View style={styles.addSection}>
      <ThemedText type="subtitle">Dodaj wartość odżywczą</ThemedText>
      <View style={styles.addGrid}>{unusedNutrients(editor).map((nutrient) => <Action key={nutrient} label={`Dodaj: ${nutrientLabel(nutrient)}`} onPress={() => setEditor((current) => addNutritionRuleDraft(current, nutrient))} secondary />)}</View>
    </View>}

    <Action label={saving ? 'Zapisywanie…' : 'Zapisz profil'} onPress={() => void save()} disabled={saving || !dirty} />
    {(dirty || saveFailed) && <Action label="Przywróć zapisany profil" onPress={restore} secondary />}
  </ScrollView></ThemedView>;
}

type RuleDraft = ReturnType<typeof createNutritionEditorState>['rules'][number];
function RuleCard({ rule, editor, onChange, onRemove }: { rule: RuleDraft; editor: ReturnType<typeof createNutritionEditorState>; onChange(changes: Partial<Pick<RuleDraft, 'direction' | 'threshold'>>): void; onRemove(): void }) {
  const theme = useTheme();
  const directionError = nutritionFieldError(editor, rule.nutrient, 'direction');
  const maximum = nutrientSliderMaximum(rule.nutrient);
  const displayValue = String(rule.threshold).replace('.', ',');
  return <View style={[styles.card, { borderColor: theme.textSecondary, backgroundColor: theme.backgroundElement }]}>
    <View style={styles.cardHeader}><View style={styles.flex}><ThemedText type="smallBold">{nutrientLabel(rule.nutrient)}</ThemedText><ThemedText type="small" themeColor="textSecondary">Jednostka: {nutrientUnit(rule.nutrient)}</ThemedText></View><Action label={`Usuń ${nutrientLabel(rule.nutrient)}`} visibleLabel="Usuń" onPress={onRemove} secondary /></View>
    <RadioGroup label="Kierunek" error={directionError}>{(['above', 'below'] as const).map((direction) => <Radio key={direction} label={directionLabel(direction)} selected={rule.direction === direction} onPress={() => onChange({ direction })} />)}</RadioGroup>
    <View style={styles.field}><View style={styles.valueRow}><ThemedText type="smallBold">Próg</ThemedText><ThemedText accessibilityLiveRegion="polite" type="smallBold">{displayValue} {nutrientUnit(rule.nutrient)}</ThemedText></View><Slider accessibilityLabel={`Próg dla ${nutrientLabel(rule.nutrient)}`} accessibilityHint={`Zakres od 0 do ${maximum} ${nutrientUnit(rule.nutrient)}`} accessibilityValue={{ min: 0, max: maximum, now: rule.threshold, text: `${displayValue} ${nutrientUnit(rule.nutrient)}` }} minimumValue={0} maximumValue={maximum} step={nutrientSliderStep(rule.nutrient)} value={rule.threshold} onValueChange={(threshold) => onChange({ threshold: normalizeSliderValue(threshold) })} minimumTrackTintColor={rule.direction === 'below' ? theme.warning : theme.textSecondary} maximumTrackTintColor={rule.direction === 'above' ? theme.warning : theme.textSecondary} thumbTintColor={theme.warning} /></View>
  </View>;
}

function RadioGroup({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.field}><ThemedText type="smallBold">{label}</ThemedText><View style={styles.radioRow}>{children}</View>{error && <ErrorText text={error} />}</View>; }
function Radio({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) { return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={label} onPress={onPress} style={[styles.radio, selected && styles.radioSelected]}><ThemedText type="smallBold" style={selected && styles.radioSelectedText}>{label}</ThemedText></Pressable>; }
function ErrorText({ text }: { text: string }) { const theme = useTheme(); return <ThemedText accessibilityRole="alert" type="small" style={{ color: theme.warning }}>{text}</ThemedText>; }
function Action({ label, visibleLabel, onPress, disabled, secondary }: { label: string; visibleLabel?: string; onPress(): void; disabled?: boolean; secondary?: boolean }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, disabled && styles.disabled]}><ThemedText style={secondary ? styles.secondaryText : styles.buttonText}>{visibleLabel ?? label}</ThemedText></Pressable>; }
function Banner({ text }: { text: string }) { const theme = useTheme(); return <View accessibilityRole="alert" style={[styles.banner, { backgroundColor: theme.backgroundSelected, borderColor: theme.textSecondary }]}><ThemedText type="small">{text}</ThemedText></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: Spacing.three }, cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two }, flex: { flex: 1 },
  field: { gap: Spacing.two }, valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  radioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }, radio: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderColor: '#60736C', borderRadius: 10 }, radioSelected: { backgroundColor: '#1F7A57', borderColor: '#1F7A57' }, radioSelectedText: { color: '#FFFFFF' },
  addSection: { gap: Spacing.two }, addGrid: { gap: Spacing.two }, button: { minHeight: 44, justifyContent: 'center', backgroundColor: '#1F7A57', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' }, secondary: { backgroundColor: '#E3F2E8' }, buttonText: { color: '#FFFFFF', fontWeight: '700' }, secondaryText: { color: '#1F7A57', fontWeight: '700' }, disabled: { opacity: 0.5 }, banner: { borderWidth: 1, borderRadius: 12, padding: 12 },
});

function normalizeSliderValue(value: number) { return Math.round(value * 10) / 10; }
