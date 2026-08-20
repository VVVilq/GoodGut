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
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="scan" options={{ title: 'Skanuj produkt', headerShadowVisible: false }} />
          <Stack.Screen name="result" options={{ title: 'Szczegóły produktu', headerShadowVisible: false }} />
        </Stack>
      </ProductLookupProvider>
    </ThemeProvider>
  );
}
