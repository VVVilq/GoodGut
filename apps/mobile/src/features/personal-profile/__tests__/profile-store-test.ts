import { PersonalProfileLoadResult, PersonalProfileRepository } from '@/data/personal-profile-repository';
import { emptyPersonalProfile, PersonalProfile } from '@/domain/personal-profile';
import { activeIngredientRulesFromState, activePersonalRulesFromState, PersonalProfileStore } from '@/features/personal-profile/profile-store';

const SAVED: PersonalProfile = { selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree', ancestorNodeIds: [] }], customIngredients: [], nutritionThresholds: [] };
const CANDIDATE: PersonalProfile = { selections: [], customIngredients: [{ id: 'custom-1', name: 'Inulina' }], nutritionThresholds: [{ id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 5, basis: 'per_100g' }] };

class FakeRepository implements PersonalProfileRepository {
  loadResult: PersonalProfileLoadResult = { kind: 'empty', profile: emptyPersonalProfile() }; saveError = false; saved: PersonalProfile[] = [];
  async load() { return this.loadResult; }
  async save(profile: PersonalProfile) { if (this.saveError) throw new Error('save failed'); this.saved.push(profile); }
}

describe('PersonalProfileStore', () => {
  it.each([
    [{ kind: 'loaded', profile: SAVED } as const, 'ready'],
    [{ kind: 'migrated', profile: SAVED } as const, 'migrated'],
    [{ kind: 'recovered', profile: SAVED } as const, 'recovered'],
    [{ kind: 'corrupt' } as const, 'load_error'],
    [{ kind: 'storage_error' } as const, 'load_error'],
  ])('maps hydration outcomes', async (result, expectedStatus) => { const repository = new FakeRepository(); repository.loadResult = result; const store = new PersonalProfileStore(repository); await store.hydrate(); expect(store.getState().status).toBe(expectedStatus); });

  it('promotes and exposes combined evaluator rules only after save succeeds', async () => {
    const repository = new FakeRepository(); repository.loadResult = { kind: 'loaded', profile: SAVED }; const store = new PersonalProfileStore(repository); await store.hydrate();
    await expect(store.save(CANDIDATE)).resolves.toBe(true);
    expect(store.getState()).toEqual({ status: 'ready', activeProfile: CANDIDATE });
    expect(activeIngredientRulesFromState(store.getState())).toEqual([{ id: 'custom:custom-1', kind: 'ingredient', source: 'custom', name: 'Inulina' }]);
    expect(activePersonalRulesFromState(store.getState())).toEqual([
      { id: 'custom:custom-1', kind: 'ingredient', source: 'custom', name: 'Inulina' },
      { id: 'nutrition:sugars', kind: 'nutrition', nutrient: 'sugars', direction: 'above', threshold: 5, basis: 'per_100g' },
    ]);
  });

  it('isolates failed candidates and retries the submitted snapshot', async () => {
    const repository = new FakeRepository(); repository.loadResult = { kind: 'loaded', profile: SAVED }; repository.saveError = true; const store = new PersonalProfileStore(repository); await store.hydrate();
    await expect(store.save(CANDIDATE)).resolves.toBe(false);
    expect(store.getState()).toEqual({ status: 'save_error', activeProfile: SAVED, candidate: CANDIDATE, error: 'storage' });
    expect(activePersonalRulesFromState(store.getState())?.[0].id).toBe('taxonomy:en:milk');
    repository.saveError = false; await expect(store.retrySave()).resolves.toBe(true); expect(store.getState()).toEqual({ status: 'ready', activeProfile: CANDIDATE });
  });

  it('snapshots the submitted candidate before asynchronous persistence', async () => {
    let release!: () => void;
    const repository = new FakeRepository();
    repository.loadResult = { kind: 'loaded', profile: SAVED };
    repository.save = async (profile: PersonalProfile) => { await new Promise<void>((resolve) => { release = resolve; }); repository.saved.push(profile); };
    const store = new PersonalProfileStore(repository); await store.hydrate();
    const mutable = { ...CANDIDATE, customIngredients: [...CANDIDATE.customIngredients] };
    const saving = store.save(mutable);
    mutable.customIngredients.push({ id: 'late', name: 'Late' });
    release(); await expect(saving).resolves.toBe(true);
    expect(repository.saved[0].customIngredients).toEqual(CANDIDATE.customIngredients);
    expect(store.getState()).toEqual({ status: 'ready', activeProfile: CANDIDATE });
  });

  it('restores the saved profile and replaces corruption only after confirmation', async () => {
    const repository = new FakeRepository(); repository.loadResult = { kind: 'loaded', profile: SAVED }; repository.saveError = true; const store = new PersonalProfileStore(repository); await store.hydrate(); await store.save(CANDIDATE);
    expect(store.restoreSaved()).toBe(true); expect(store.getState()).toEqual({ status: 'ready', activeProfile: SAVED });
    repository.loadResult = { kind: 'corrupt' }; repository.saveError = false; await store.hydrate(); expect(repository.saved).toEqual([]);
    await expect(store.replaceCorruptWithEmptyProfile()).resolves.toBe(true); expect(repository.saved).toEqual([emptyPersonalProfile()]);
  });
});
