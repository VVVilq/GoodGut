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
    <View style={styles.cameraFrame}>
      <CameraView
        active={focused}
        barcodeScannerSettings={{ barcodeTypes: [...supportedBarcodeTypes] }}
        onBarcodeScanned={handleScan}
        onMountError={() => setMountError(true)}
        style={styles.camera}
      />
      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.target}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <ThemedText style={styles.hint}>Ustaw kod wewnątrz ramki</ThemedText>
      </View>
    </View>
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
  cameraFrame: { width: '100%', aspectRatio: 4 / 5, borderRadius: 24, overflow: 'hidden', backgroundColor: '#17352D' },
  camera: { position: 'absolute', inset: 0 },
  overlay: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8, 26, 21, 0.18)' },
  target: { width: '82%', height: 150, position: 'relative' },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: '#D9F99D' },
  topLeft: { left: 0, top: 0, borderLeftWidth: 4, borderTopWidth: 4, borderTopLeftRadius: 12 },
  topRight: { right: 0, top: 0, borderRightWidth: 4, borderTopWidth: 4, borderTopRightRadius: 12 },
  bottomLeft: { left: 0, bottom: 0, borderLeftWidth: 4, borderBottomWidth: 4, borderBottomLeftRadius: 12 },
  bottomRight: { right: 0, bottom: 0, borderRightWidth: 4, borderBottomWidth: 4, borderBottomRightRadius: 12 },
  hint: { position: 'absolute', bottom: 24, color: '#FFFFFF', backgroundColor: 'rgba(8, 26, 21, 0.65)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  message: { gap: Spacing.two },
  action: { backgroundColor: '#1F7A57', borderRadius: 14, padding: 14, alignItems: 'center' },
  actionText: { color: '#FFFFFF', fontWeight: '700' },
});
