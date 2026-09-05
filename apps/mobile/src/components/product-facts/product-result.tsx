import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ProductLookupPresentation, ResultAction } from '@/features/product-lookup/presentation';
import { useTheme } from '@/hooks/use-theme';

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
            <FoundProduct presentation={presentation} onAction={onAction} />
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

function FoundProduct({
  presentation,
  onAction,
}: {
  presentation: Extract<ProductLookupPresentation, { kind: 'found' }>;
  onAction: (action: ResultAction) => void;
}) {
  const theme = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed ? null : presentation.identity.imageUrl;
  const ingredientItems = presentation.ingredients.available
    ? presentation.ingredients.items
    : null;
  const unavailableIngredientText = presentation.ingredients.available
    ? null
    : presentation.ingredients.text;
  return (
    <>
      <IngredientWarningSummary
        presentation={presentation.ingredientWarnings}
        onAction={onAction}
      />
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
        {ingredientItems ? (
          <View style={styles.ingredientList}>
            {presentation.ingredients.available && presentation.ingredients.partialSummary && (
              <ThemedText style={styles.partialSummary} themeColor="textSecondary">
                {presentation.ingredients.partialSummary}
              </ThemedText>
            )}
            {ingredientItems.map((item, index) => (
              <ThemedText
                key={`${index}:${item.text}`}
                accessibilityLabel={item.accessibilityLabel}
                style={item.state === 'warning'
                  ? [styles.warningIngredient, { color: theme.warning }]
                  : item.state === 'unrecognized'
                    ? [styles.unrecognizedIngredient, { color: theme.ingredientUnrecognized }]
                    : undefined}
              >
                {item.state === 'warning' ? '⚠ ' : ''}{item.text}
                {index < ingredientItems.length - 1 ? ', ' : ''}
              </ThemedText>
            ))}
          </View>
        ) : (
          <ThemedText themeColor="textSecondary">{unavailableIngredientText}</ThemedText>
        )}
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

function IngredientWarningSummary({
  presentation,
  onAction,
}: {
  presentation: Extract<ProductLookupPresentation, { kind: 'found' }>['ingredientWarnings'];
  onAction: (action: ResultAction) => void;
}) {
  const theme = useTheme();
  if (presentation.kind === 'none') return null;

  const warning = presentation.kind === 'triggered'
    || presentation.kind === 'unavailable'
    || presentation.kind === 'incomplete'
    || presentation.kind === 'profile_error';

  return (
    <View
      accessibilityRole={warning ? 'alert' : undefined}
      style={[
        styles.warningSummary,
        {
          backgroundColor: warning ? theme.warningBackground : theme.backgroundSelected,
          borderColor: warning ? theme.warning : theme.textSecondary,
        },
      ]}
    >
      <View style={styles.warningTitleRow}>
        {presentation.kind === 'loading' ? (
          <ActivityIndicator accessibilityLabel="Wczytywanie profilu" color="#1F7A57" />
        ) : warning ? (
          <ThemedText accessibilityElementsHidden style={[styles.warningIcon, { color: theme.warning }]}>⚠</ThemedText>
        ) : null}
        <ThemedText type="smallBold" style={warning && { color: theme.warning }}>
          {presentation.title}
        </ThemedText>
      </View>
      <ThemedText type="small">{presentation.detail}</ThemedText>
      {presentation.kind === 'triggered' && presentation.warnings.map((item) => (
        <View key={item.ruleId} style={styles.warningRow}>
          <ThemedText type="smallBold" style={{ color: theme.warning }}>
            ⚠ {item.ruleLabel}
          </ThemedText>
          <ThemedText type="small">
            Dopasowano: {item.matchedIngredientNames.join(', ')}
          </ThemedText>
        </View>
      ))}
      {presentation.actions.map((action) => (
        <Action key={action} action={action} onPress={() => onAction(action)} />
      ))}
    </View>
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
  const secondary = action === 'scan_another' || action === 'open_profile';
  const labels: Record<ResultAction, string> = {
    retry: 'Spróbuj ponownie',
    scan_another: 'Skanuj kolejny produkt',
    retry_profile: 'Wczytaj profil ponownie',
    open_profile: 'Otwórz profil',
  };
  return (
    <Pressable onPress={onPress} style={[styles.action, secondary && styles.secondary]} accessibilityRole="button">
      <ThemedText style={[styles.actionText, secondary && styles.secondaryText]}>
        {labels[action]}
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
  warningSummary: { borderWidth: 1, borderRadius: 20, padding: Spacing.three, gap: 12 },
  warningTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  warningIcon: { fontSize: 20, fontWeight: '800' },
  warningRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#C86A62', paddingTop: 10, gap: 2 },
  card: { borderRadius: 20, padding: Spacing.three, gap: 12, shadowColor: '#17352D', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  ingredientList: { flexDirection: 'row', flexWrap: 'wrap' },
  partialSummary: { width: '100%' },
  warningIngredient: { fontWeight: '800' },
  unrecognizedIngredient: { fontWeight: '500' },
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
