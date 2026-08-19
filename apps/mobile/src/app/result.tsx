import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { ProductLookupState } from '@/features/product-lookup/lookup-state-machine';
import { useProductLookup } from '@/features/product-lookup/use-product-lookup';

export default function ResultScreen() {
  const lookup = useProductLookup();
  const scanAnother = () => {
    lookup.rescan();
    router.replace('/scan');
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['bottom']} style={styles.content}>
        <ResultSummary state={lookup.state} />
        {(lookup.state.status === 'client_error' ||
          (lookup.state.status === 'resolved' && lookup.state.result.outcome === 'source_error')) && (
          <Action text="Spróbuj ponownie" onPress={() => void lookup.retry()} />
        )}
        <Action text="Skanuj kolejny produkt" onPress={scanAnother} secondary />
      </SafeAreaView>
    </ThemedView>
  );
}

function ResultSummary({ state }: { state: ProductLookupState }) {
  if (state.status === 'loading') {
    return <Message title="Wyszukiwanie…" detail={`Kod: ${state.barcode}`} />;
  }
  if (state.status === 'resolved') {
    if (state.result.outcome === 'found') {
      return <Message title="Produkt znaleziony" detail={state.result.product.identity.displayName} />;
    }
    if (state.result.outcome === 'not_found') {
      return <Message title="Nie znaleziono produktu" detail={`Kod: ${state.barcode}`} />;
    }
    return <Message title="Źródło jest chwilowo niedostępne" detail={state.result.errorCategory} />;
  }
  if (state.status === 'client_error') {
    return <Message title="Nie udało się pobrać produktu" detail={state.error.kind} />;
  }
  return <Message title="Brak aktywnego wyszukiwania" detail="Wróć do skanera i podaj kod." />;
}

function Message({ title, detail }: { title: string; detail: string }) {
  return (
    <View style={styles.message}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText themeColor="textSecondary">{detail}</ThemedText>
    </View>
  );
}

function Action({ text, onPress, secondary = false }: { text: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.action, secondary && styles.secondary]}>
      <ThemedText style={[styles.actionText, secondary && styles.secondaryText]}>{text}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.three },
  message: { gap: Spacing.two },
  action: { backgroundColor: '#208AEF', borderRadius: 12, padding: 14, alignItems: 'center' },
  actionText: { color: '#FFFFFF', fontWeight: '700' },
  secondary: { backgroundColor: '#E6F4FE' },
  secondaryText: { color: '#0B5CAD' },
});
