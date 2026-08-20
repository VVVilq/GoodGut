import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ProductLookupPresentation, ResultAction } from '@/features/product-lookup/presentation';

export function ProductResult({
  presentation,
  onAction,
}: {
  presentation: ProductLookupPresentation;
  onAction: (action: ResultAction) => void;
}) {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          {presentation.kind === 'found' ? (
            <FoundProduct presentation={presentation} />
          ) : (
            <ThemedView type="backgroundElement" style={styles.statusCard}>
              {presentation.kind === 'loading' ? (
                <ActivityIndicator size="large" color="#1F7A57" />
              ) : (
                <View style={styles.statusIcon}>
                  <ThemedText style={styles.statusIconText}>
                    {presentation.kind === 'not_found' ? '?' : '!'}
                  </ThemedText>
                </View>
              )}
              <ThemedText type="subtitle">{presentation.title}</ThemedText>
              <ThemedText style={styles.statusDetail} themeColor="textSecondary">{presentation.detail}</ThemedText>
            </ThemedView>
          )}
          <View style={styles.actions}>
            {presentation.actions.map((action) => (
              <Action key={action} action={action} onPress={() => onAction(action)} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function FoundProduct({ presentation }: { presentation: Extract<ProductLookupPresentation, { kind: 'found' }> }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed ? null : presentation.identity.imageUrl;
  return (
    <>
      <View style={styles.header}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.image} contentFit="contain" onError={() => setImageFailed(true)} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <ThemedText themeColor="textSecondary">Brak zdjęcia</ThemedText>
          </View>
        )}
        <View style={styles.section}>
          <ThemedText type="subtitle">{presentation.identity.displayName}</ThemedText>
          {presentation.identity.brands && <ThemedText>{presentation.identity.brands}</ThemedText>}
          {presentation.identity.quantity && (
            <ThemedText themeColor="textSecondary">{presentation.identity.quantity}</ThemedText>
          )}
          <ThemedText type="small" themeColor="textSecondary">Kod: {presentation.barcode}</ThemedText>
        </View>
      </View>

      <FactSection title="Nutri-Score">
        <View style={[styles.nutriScore, nutriScoreStyle(presentation.nutriScore)]}>
          <ThemedText style={styles.nutriScoreText}>{presentation.nutriScore}</ThemedText>
        </View>
      </FactSection>
      <FactSection title="Składniki">
        <ThemedText themeColor={presentation.ingredients.available ? 'text' : 'textSecondary'}>
          {presentation.ingredients.text}
        </ThemedText>
      </FactSection>
      <FactSection title="Wartości odżywcze">
        {presentation.nutrients.map((row) => (
          <View key={row.id} style={styles.nutrientRow}>
            <ThemedText style={styles.nutrientLabel}>{row.label}</ThemedText>
            <ThemedText themeColor={row.available ? 'text' : 'textSecondary'}>{row.displayValue}</ThemedText>
          </View>
        ))}
      </FactSection>
      <FactSection title="Źródło">
        <ThemedText themeColor="textSecondary">Open Food Facts</ThemedText>
        {presentation.providerProductUrl && (
          <Pressable onPress={() => void Linking.openURL(presentation.providerProductUrl!)}>
            <ThemedText type="linkPrimary">Zobacz produkt w Open Food Facts</ThemedText>
          </Pressable>
        )}
      </FactSection>
    </>
  );
}

function FactSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </ThemedView>
  );
}

function Action({ action, onPress }: { action: ResultAction; onPress: () => void }) {
  const secondary = action === 'scan_another';
  return (
    <Pressable onPress={onPress} style={[styles.action, secondary && styles.secondary]} accessibilityRole="button">
      <ThemedText style={[styles.actionText, secondary && styles.secondaryText]}>
        {action === 'retry' ? 'Spróbuj ponownie' : 'Skanuj kolejny produkt'}
      </ThemedText>
    </Pressable>
  );
}

function nutriScoreStyle(score: string) {
  const colors: Record<string, string> = {
    A: '#16834B',
    B: '#75A934',
    C: '#E0A521',
    D: '#DB762B',
    E: '#C5483A',
  };
  return { backgroundColor: colors[score] ?? '#E3EAE6' };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  header: { gap: Spacing.three },
  image: { width: '100%', height: 240, borderRadius: 22 },
  placeholder: { backgroundColor: '#E8E8E8', alignItems: 'center', justifyContent: 'center' },
  section: { gap: Spacing.two },
  card: { borderRadius: 20, padding: Spacing.three, gap: 12, shadowColor: '#17352D', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DCE6E0', paddingTop: 10 },
  nutrientLabel: { flex: 1 },
  nutriScore: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  nutriScoreText: { color: '#FFFFFF', fontWeight: '800', fontSize: 22 },
  statusCard: { marginTop: Spacing.five, borderRadius: 24, padding: Spacing.four, alignItems: 'center', gap: Spacing.three, shadowColor: '#17352D', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  statusIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: '#E3F2E8', alignItems: 'center', justifyContent: 'center' },
  statusIconText: { color: '#1F7A57', fontSize: 28, fontWeight: '800' },
  statusDetail: { textAlign: 'center', lineHeight: 24 },
  actions: { gap: Spacing.two },
  action: { backgroundColor: '#1F7A57', borderRadius: 15, padding: 15, alignItems: 'center' },
  actionText: { color: '#FFFFFF', fontWeight: '700' },
  secondary: { backgroundColor: '#E3F2E8' },
  secondaryText: { color: '#1F6A4D' },
});
