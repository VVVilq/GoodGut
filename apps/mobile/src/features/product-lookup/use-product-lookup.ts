import { lookupProduct } from '@/data/goodgut-api';
import { useMemo, useState, useSyncExternalStore } from 'react';

import { ProductLookupStateMachine } from './lookup-state-machine';

export function useProductLookup() {
  const [machine] = useState(() => new ProductLookupStateMachine(lookupProduct));
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
