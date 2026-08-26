import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.screen}>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <SafeAreaView style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <ThemedText style={styles.logoLeaf}>●</ThemedText>
          </View>
          <ThemedText type="smallBold">GOODGUT</ThemedText>
        </View>

        <View style={styles.hero}>
          <View style={styles.eyebrow}>
            <ThemedText type="smallBold" style={styles.eyebrowText}>PROSTE FAKTY O PRODUKCIE</ThemedText>
          </View>
          <ThemedText type="title">Wiesz, co wybierasz.</ThemedText>
          <ThemedText style={styles.lead} themeColor="textSecondary">
            Zeskanuj kod kreskowy i zobacz składniki, Nutri-Score oraz wartości odżywcze bez szukania drobnego druku.
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.scanCard}>
          <View style={styles.scanIcon}>
            <View style={styles.barcodeLines}>
              {[2, 1, 3, 1, 2, 3, 1].map((width, index) => (
                <View key={index} style={[styles.barcodeLine, { width }]} />
              ))}
            </View>
          </View>
          <View style={styles.cardCopy}>
            <ThemedText type="smallBold">Gotowy do skanowania?</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Aparat rozpozna kod automatycznie.</ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={() => router.push('/scan')}>
            <ThemedText style={styles.buttonText}>Skanuj produkt</ThemedText>
            <ThemedText style={styles.arrow}>→</ThemedText>
          </Pressable>
        </ThemedView>

        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
          onPress={() => router.push('/profile' as Href)}>
          <View>
            <ThemedText type="smallBold">Unikane składniki</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Ustaw własną listę wyborów</ThemedText>
          </View>
          <ThemedText style={styles.profileArrow}>→</ThemedText>
        </Pressable>

        <View style={styles.trustRow}>
          <ThemedText type="small" themeColor="textSecondary">Dane: Open Food Facts</ThemedText>
          <View style={styles.dot} />
          <ThemedText type="small" themeColor="textSecondary">Bez historii skanów</ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  content: { flex: 1, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, justifyContent: 'space-between' },
  glowOne: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: '#DDF3D8', top: -130, right: -120, opacity: 0.75 },
  glowTwo: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#E8F2D8', bottom: -100, left: -100, opacity: 0.65 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#1F7A57', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }] },
  logoLeaf: { color: '#CFF08C', fontSize: 16 },
  hero: { gap: Spacing.three },
  eyebrow: { alignSelf: 'flex-start', backgroundColor: '#E3F2E8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  eyebrowText: { color: '#1F7A57', fontSize: 11, letterSpacing: 0.7 },
  lead: { fontSize: 18, lineHeight: 27 },
  scanCard: { borderRadius: 26, padding: Spacing.three, gap: Spacing.three, shadowColor: '#17352D', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  scanIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: '#E3F2E8', alignItems: 'center', justifyContent: 'center' },
  barcodeLines: { height: 24, flexDirection: 'row', alignItems: 'stretch', gap: 3 },
  barcodeLine: { backgroundColor: '#1F7A57', borderRadius: 1 },
  cardCopy: { gap: 3 },
  button: { backgroundColor: '#1F7A57', borderRadius: 16, paddingHorizontal: Spacing.three, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  arrow: { color: '#FFFFFF', fontSize: 23 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  profileButton: { borderColor: '#BFD4C7', borderWidth: 1, borderRadius: 18, padding: Spacing.three, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F6FAF7' },
  profileArrow: { color: '#1F7A57', fontSize: 23 },
  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#8A9B94' },
});
