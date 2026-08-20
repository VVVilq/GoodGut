import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ManualBarcodeEntry } from '@/components/product-scan/manual-barcode-entry';
import { ProductScanner } from '@/components/product-scan/product-scanner';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useProductLookup } from '@/features/product-lookup/use-product-lookup';

export default function ScanScreen() {
  const lookup = useProductLookup();
  const { rescan } = lookup;

  useFocusEffect(
    useCallback(() => {
      rescan();
    }, [rescan]),
  );

  const beginLookup = (barcode: string) => {
    void lookup.capture(barcode);
    router.replace('/result');
  };

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.intro}>
            <ThemedText type="subtitle">Zeskanuj kod kreskowy</ThemedText>
            <ThemedText themeColor="textSecondary">
              Umieść kod kreskowy produktu w kadrze. Pierwszy poprawny odczyt rozpocznie wyszukiwanie.
            </ThemedText>
          </View>
          <ProductScanner onBarcode={beginLookup} />
          <ManualBarcodeEntry onSubmit={beginLookup} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  intro: { gap: Spacing.two },
});
