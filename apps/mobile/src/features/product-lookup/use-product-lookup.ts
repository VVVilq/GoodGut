import { lookupProduct } from '@/data/goodgut-api';
import {
  createContext,
  createElement,
  ReactNode,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';

import { ProductLookupStateMachine } from './lookup-state-machine';

type ProductLookupContextValue = ReturnType<typeof useProductLookupValue>;

const ProductLookupContext = createContext<ProductLookupContextValue | null>(null);

function useProductLookupValue() {
  const [machine] = useState(
    () => new ProductLookupStateMachine((barcode, signal) => lookupProduct(barcode, { signal })),
  );
  const state = useSyncExternalStore(machine.subscribe, machine.getState, machine.getState);
  const actions = useMemo(
    () => ({
      submit: machine.submit.bind(machine),
      capture: machine.capture.bind(machine),
      retry: machine.retry.bind(machine),
      rescan: machine.rescan.bind(machine),
    }),
    [machine],
  );
  return { state, ...actions };
}

export function ProductLookupProvider({ children }: { children: ReactNode }) {
  const value = useProductLookupValue();
  return createElement(ProductLookupContext.Provider, { value }, children);
}

export function useProductLookup() {
  const value = useContext(ProductLookupContext);
  if (value === null) throw new Error('useProductLookup must be used inside ProductLookupProvider');
  return value;
}
