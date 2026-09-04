import { useNavigation } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { confirmDiscard } from '@/components/personal-profile/profile-editor';
import { NutritionProfileEditor } from '@/components/personal-profile/nutrition-profile-editor';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { usePersonalProfile } from './use-personal-profile';

export function PersonalProfileNutritionScreen() {
  const profile = usePersonalProfile();
  const navigation = useNavigation();
  const isDirty = useRef<() => boolean>(() => false);
  const allowNavigation = useRef(false);
  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (allowNavigation.current || !isDirty.current()) return;
    event.preventDefault();
    confirmDiscard(() => { allowNavigation.current = true; navigation.dispatch(event.data.action); });
  }), [navigation]);

  if (profile.state.status === 'hydrating') return <Message title="Wczytywanie profilu…" />;
  if (profile.state.status === 'load_error') return <Message title="Nie można odczytać profilu"><Action label="Spróbuj ponownie" onPress={() => void profile.retryLoad()} /></Message>;
  const saveAndReturn = async (candidate: Parameters<typeof profile.save>[0]) => {
    const saved = await profile.save(candidate);
    if (saved) { allowNavigation.current = true; navigation.goBack(); }
    return saved;
  };
  return <NutritionProfileEditor activeProfile={profile.state.activeProfile} saving={profile.state.status === 'saving'} recovered={profile.state.status === 'recovered'} saveFailed={profile.state.status === 'save_error'} onSave={saveAndReturn} onRestore={profile.restoreSaved} registerDirtyGuard={(guard) => { isDirty.current = guard; }} />;
}

function Message({ title, children }: { title: string; children?: React.ReactNode }) { return <ThemedView style={styles.screen}><View style={styles.content}><ThemedText type="subtitle">{title}</ThemedText>{children}</View></ThemedView>; }
function Action({ label, onPress }: { label: string; onPress(): void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}><ThemedText style={styles.buttonText}>{label}</ThemedText></Pressable>; }
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: Spacing.four, gap: Spacing.three }, button: { minHeight: 44, justifyContent: 'center', backgroundColor: '#1F7A57', padding: 14, borderRadius: 14, alignItems: 'center' }, buttonText: { color: '#FFFFFF', fontWeight: '700' } });
