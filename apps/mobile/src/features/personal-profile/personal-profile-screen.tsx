import { Href, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { formatNutritionThreshold, nutrientLabel } from './nutrition-presentation';
import { usePersonalProfile } from './use-personal-profile';

export function PersonalProfileScreen() {
  const profile = usePersonalProfile();
  if (profile.state.status === 'hydrating') return <Message title="Wczytywanie profilu…" />;
  if (profile.state.status === 'load_error') return <Message title={profile.state.error === 'corrupt' ? 'Nie można odczytać profilu' : 'Pamięć urządzenia jest niedostępna'}><Action label="Spróbuj ponownie" onPress={() => void profile.retryLoad()} />{profile.state.error === 'corrupt' && <Action label="Zastąp pustym profilem" onPress={() => void profile.replaceCorruptWithEmptyProfile()} />}</Message>;

  const value = profile.state.activeProfile;
  return <ThemedView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <ThemedText themeColor="textSecondary">Tutaj znajdują się Twoje zapisane reguły. Profil pozostaje wyłącznie na tym urządzeniu.</ThemedText>
    {profile.state.status === 'reset_notice' && <Banner text="Poprzednia lista została zachowana, ale wymaga ponownego wyboru składników w nowym katalogu." />}
    {profile.state.status === 'migrated' && <Banner text="Zachowaliśmy Twoje składniki po aktualizacji profilu. Progi możesz dodać poniżej." />}

    <ThemedText type="subtitle">Unikane składniki</ThemedText>
    <Action label="Dodaj lub zmień składniki" onPress={() => router.push('/profile-ingredients')} />
    {value.selections.length === 0 && value.customIngredients.length === 0 && <ThemedText themeColor="textSecondary">Nie wybrano jeszcze żadnych składników.</ThemedText>}
    {value.selections.map((item) => <View key={item.nodeId} style={styles.card}><ThemedText type="smallBold">{item.labelPl}</ThemedText><ThemedText type="small" themeColor="textSecondary">{item.scope === 'subtree' ? 'Ten składnik i cała gałąź' : 'Tylko ten składnik'}</ThemedText></View>)}
    {value.customIngredients.map((item) => <View key={item.id} style={styles.card}><ThemedText type="smallBold">{item.name}</ThemedText><ThemedText type="small" themeColor="textSecondary">Dokładne dopasowanie nazwy</ThemedText></View>)}

    <ThemedText type="subtitle">Progi wartości odżywczych</ThemedText>
    <Action label="Dodaj lub zmień progi" onPress={() => router.push('/profile-nutrition' as Href)} />
    {value.nutritionThresholds.length === 0 && <ThemedText themeColor="textSecondary">Nie ustawiono jeszcze żadnych progów.</ThemedText>}
    {value.nutritionThresholds.map((rule) => <View key={rule.id} style={styles.card}><ThemedText type="smallBold">{nutrientLabel(rule.nutrient)}</ThemedText><ThemedText type="small" themeColor="textSecondary">{formatNutritionThreshold(rule)}</ThemedText></View>)}
  </ScrollView></ThemedView>;
}

function Message({ title, children }: { title: string; children?: React.ReactNode }) { return <ThemedView style={styles.screen}><View style={styles.content}><ThemedText type="subtitle">{title}</ThemedText>{children}</View></ThemedView>; }
function Action({ label, onPress }: { label: string; onPress(): void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}><ThemedText style={styles.buttonText}>{label}</ThemedText></Pressable>; }
function Banner({ text }: { text: string }) { return <View accessibilityRole="alert" style={styles.banner}><ThemedText style={styles.bannerText} type="small">{text}</ThemedText></View>; }
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: Spacing.four, gap: Spacing.three }, card: { borderWidth: 1, borderColor: '#60736C', borderRadius: 12, padding: 14, gap: Spacing.one }, button: { minHeight: 44, justifyContent: 'center', backgroundColor: '#1F7A57', padding: 14, borderRadius: 14, alignItems: 'center' }, buttonText: { color: '#FFFFFF', fontWeight: '700' }, banner: { backgroundColor: '#5B4300', borderRadius: 12, padding: 12 }, bannerText: { color: '#FFFFFF' } });
