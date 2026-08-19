import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { isValidBarcode } from '@/features/product-lookup/lookup-state-machine';

export function ManualBarcodeEntry({ onSubmit }: { onSubmit: (barcode: string) => void }) {
  const [value, setValue] = useState('');
  const [showError, setShowError] = useState(false);

  const submit = () => {
    if (!isValidBarcode(value)) {
      setShowError(true);
      return;
    }
    setShowError(false);
    onSubmit(value);
  };

  return (
    <View style={styles.container}>
      <ThemedText type="smallBold">Wpisz kod ręcznie</ThemedText>
      <TextInput
        accessibilityLabel="Kod kreskowy"
        keyboardType="number-pad"
        maxLength={14}
        onChangeText={(text) => {
          setValue(text);
          setShowError(false);
        }}
        onSubmitEditing={submit}
        placeholder="8–14 cyfr"
        style={styles.input}
        value={value}
      />
      {showError && <ThemedText style={styles.error}>Kod musi zawierać od 8 do 14 cyfr.</ThemedText>}
      <Pressable style={styles.button} onPress={submit} accessibilityRole="button">
        <ThemedText style={styles.buttonText}>Sprawdź produkt</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  input: { backgroundColor: '#FFFFFF', borderColor: '#A0A0A0', borderWidth: 1, borderRadius: 12, padding: 14 },
  error: { color: '#B42318' },
  button: { backgroundColor: '#208AEF', borderRadius: 12, padding: 14, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
