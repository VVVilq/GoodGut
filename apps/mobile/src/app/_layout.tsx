import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ProductLookupProvider } from '@/features/product-lookup/use-product-lookup';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <ProductLookupProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'GoodGut' }} />
          <Stack.Screen name="scan" options={{ title: 'Skanuj produkt' }} />
          <Stack.Screen name="result" options={{ title: 'Wynik' }} />
        </Stack>
      </ProductLookupProvider>
    </ThemeProvider>
  );
}
