import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import {
  cameraPermissionView,
  ScanCapturePolicy,
  supportedBarcodeTypes,
} from '@/features/product-lookup/scan-policy';

export function ProductScanner({ onBarcode }: { onBarcode: (barcode: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [mountError, setMountError] = useState(false);
  const policy = useMemo(() => new ScanCapturePolicy(), []);

  useFocusEffect(
    useCallback(() => {
      policy.reset();
      setFocused(true);
      return () => setFocused(false);
    }, [policy]),
  );

  const handleScan = (result: BarcodeScanningResult) => {
    if (policy.accept(result.type, result.data)) onBarcode(result.data);
  };

  const view = cameraPermissionView(permission);
  if (view === 'loading') return <ThemedText>Sprawdzanie uprawnień aparatu…</ThemedText>;
  if (view === 'request') {
    return <Action text="Zezwól na użycie aparatu" onPress={() => void requestPermission()} />;
  }
  if (view === 'denied') {
    return (
      <View style={styles.message}>
        <ThemedText>Aparat jest wyłączony dla GoodGut. Włącz go w ustawieniach urządzenia.</ThemedText>
        <Action text="Otwórz ustawienia" onPress={() => void Linking.openSettings()} />
      </View>
    );
  }
  if (mountError) {
    return <ThemedText>Nie udało się uruchomić aparatu. Nadal możesz wpisać kod ręcznie.</ThemedText>;
  }
  if (!focused) return null;

  return (
    <CameraView
      active={focused}
      barcodeScannerSettings={{ barcodeTypes: [...supportedBarcodeTypes] }}
      onBarcodeScanned={handleScan}
      onMountError={() => setMountError(true)}
      style={styles.camera}
    />
  );
}

function Action({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable style={styles.action} onPress={onPress} accessibilityRole="button">
      <ThemedText style={styles.actionText}>{text}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  camera: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16, overflow: 'hidden' },
  message: { gap: Spacing.two },
  action: { backgroundColor: '#208AEF', borderRadius: 12, padding: 14, alignItems: 'center' },
  actionText: { color: '#FFFFFF', fontWeight: '700' },
});
