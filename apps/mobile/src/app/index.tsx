import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.content}>
        <View style={styles.copy}>
          <ThemedText type="title">GoodGut</ThemedText>
          <ThemedText themeColor="textSecondary">
            Zeskanuj kod kreskowy, aby zobaczyć dostępne informacje o produkcie.
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => router.push('/scan')}>
          <ThemedText style={styles.buttonText}>Skanuj produkt</ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.five },
  copy: { gap: Spacing.three },
  button: { backgroundColor: '#208AEF', borderRadius: 16, padding: Spacing.three, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.75 },
});
