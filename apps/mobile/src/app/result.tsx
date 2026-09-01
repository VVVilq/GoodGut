import { router } from 'expo-router';

import { ProductResult } from '@/components/product-facts/product-result';
import { ResultAction, presentProductLookup } from '@/features/product-lookup/presentation';
import { usePersonalProfile } from '@/features/personal-profile/use-personal-profile';
import { useProductLookup } from '@/features/product-lookup/use-product-lookup';

export default function ResultScreen() {
  const lookup = useProductLookup();
  const profile = usePersonalProfile();
  const presentation = presentProductLookup(lookup.state, profile.state);

  const onAction = (action: ResultAction) => {
    if (action === 'retry') {
      void lookup.retry();
      return;
    }
    if (action === 'retry_profile') {
      void profile.retryLoad();
      return;
    }
    if (action === 'open_profile') {
      router.push('/profile');
      return;
    }
    lookup.rescan();
    router.replace('/scan');
  };

  return <ProductResult presentation={presentation} onAction={onAction} />;
}
