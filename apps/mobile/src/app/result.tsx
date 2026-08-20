import { router } from 'expo-router';

import { ProductResult } from '@/components/product-facts/product-result';
import { ResultAction, presentProductLookup } from '@/features/product-lookup/presentation';
import { useProductLookup } from '@/features/product-lookup/use-product-lookup';

export default function ResultScreen() {
  const lookup = useProductLookup();
  const presentation = presentProductLookup(lookup.state);

  const onAction = (action: ResultAction) => {
    if (action === 'retry') {
      void lookup.retry();
      return;
    }
    lookup.rescan();
    router.replace('/scan');
  };

  return <ProductResult presentation={presentation} onAction={onAction} />;
}
