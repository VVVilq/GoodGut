import { asyncStorageKeyValueStore } from '@/data/async-storage-key-value-store';
import { TwoSlotPersonalProfileRepository } from '@/data/personal-profile-repository';
import { createContext, createElement, ReactNode, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { activeIngredientRulesFromState, PersonalProfileStore } from './profile-store';

type PersonalProfileContextValue = ReturnType<typeof usePersonalProfileValue>;
const PersonalProfileContext = createContext<PersonalProfileContextValue | null>(null);

function usePersonalProfileValue() {
  const [store] = useState(
    () => new PersonalProfileStore(new TwoSlotPersonalProfileRepository(asyncStorageKeyValueStore)),
  );
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  useEffect(() => { void store.hydrate(); }, [store]);
  const actions = useMemo(() => ({
    save: store.save.bind(store),
    retrySave: store.retrySave.bind(store),
    restoreSaved: store.restoreSaved.bind(store),
    retryLoad: store.hydrate.bind(store),
    replaceCorruptWithEmptyProfile: store.replaceCorruptWithEmptyProfile.bind(store),
  }), [store]);
  return { state, activeIngredientRules: activeIngredientRulesFromState(state), ...actions };
}

export function PersonalProfileProvider({ children }: { children: ReactNode }) {
  const value = usePersonalProfileValue();
  return createElement(PersonalProfileContext.Provider, { value }, children);
}

export function usePersonalProfile() {
  const value = useContext(PersonalProfileContext);
  if (value === null) throw new Error('usePersonalProfile must be used inside PersonalProfileProvider');
  return value;
}
