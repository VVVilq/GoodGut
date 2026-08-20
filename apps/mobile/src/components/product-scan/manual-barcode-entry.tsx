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
      <View style={styles.heading}>
        <View style={styles.rule} />
        <ThemedText type="small" themeColor="textSecondary">lub wpisz kod ręcznie</ThemedText>
        <View style={styles.rule} />
      </View>
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
        placeholderTextColor="#8A9B94"
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
  heading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginVertical: Spacing.one },
  rule: { height: 1, flex: 1, backgroundColor: '#D9E3DD' },
  input: { backgroundColor: '#FFFFFF', color: '#17352D', borderColor: '#D4E1DA', borderWidth: 1, borderRadius: 14, padding: 15, fontSize: 17, letterSpacing: 1.2 },
  error: { color: '#B42318' },
  button: { backgroundColor: '#1F7A57', borderRadius: 14, padding: 14, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
});
