import { PersonalProfileLoadResult, PersonalProfileRepository } from '@/data/personal-profile-repository';
import { AvoidedIngredientProfile, emptyAvoidedIngredientProfile } from '@/domain/avoided-ingredients/profile';
import { activeIngredientRulesFromState, PersonalProfileStore } from '@/features/personal-profile/profile-store';

const SAVED: AvoidedIngredientProfile = { selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree' }], customIngredients: [] };
const CANDIDATE: AvoidedIngredientProfile = { selections: [], customIngredients: [{ id: 'custom-1', name: 'Inulina' }] };

class FakeRepository implements PersonalProfileRepository {
  loadResult: PersonalProfileLoadResult = { kind: 'empty', profile: emptyAvoidedIngredientProfile() };
  saveError = false;
  saved: AvoidedIngredientProfile[] = [];
  async load() { return this.loadResult; }
  async save(profile: AvoidedIngredientProfile) {
    if (this.saveError) throw new Error('save failed');
    this.saved.push(profile);
  }
}

describe('PersonalProfileStore', () => {
  it.each([
    [{ kind: 'loaded', profile: SAVED } as const, 'ready'],
    [{ kind: 'recovered', profile: SAVED } as const, 'recovered'],
    [{ kind: 'corrupt' } as const, 'load_error'],
    [{ kind: 'storage_error' } as const, 'load_error'],
  ])('maps hydration outcomes', async (result, expectedStatus) => {
    const repository = new FakeRepository(); repository.loadResult = result;
    const store = new PersonalProfileStore(repository); await store.hydrate();
    expect(store.getState().status).toBe(expectedStatus);
  });
  it('promotes and exposes evaluator rules only after save succeeds', async () => {
    const repository = new FakeRepository(); repository.loadResult = { kind: 'loaded', profile: SAVED };
    const store = new PersonalProfileStore(repository); await store.hydrate();
    await expect(store.save(CANDIDATE)).resolves.toBe(true);
    expect(store.getState()).toEqual({ status: 'ready', activeProfile: CANDIDATE });
    expect(activeIngredientRulesFromState(store.getState())).toEqual([
      { id: 'custom:custom-1', kind: 'ingredient', source: 'custom', name: 'Inulina' },
    ]);
  });
  it('isolates failed candidates and retries them', async () => {
    const repository = new FakeRepository(); repository.loadResult = { kind: 'loaded', profile: SAVED }; repository.saveError = true;
    const store = new PersonalProfileStore(repository); await store.hydrate();
    await expect(store.save(CANDIDATE)).resolves.toBe(false);
    expect(store.getState()).toEqual({ status: 'save_error', activeProfile: SAVED, candidate: CANDIDATE, error: 'storage' });
    expect(activeIngredientRulesFromState(store.getState())).toEqual([]);
    repository.saveError = false;
    await expect(store.retrySave()).resolves.toBe(true);
    expect(store.getState()).toEqual({ status: 'ready', activeProfile: CANDIDATE });
  });
  it('restores the saved profile after failure', async () => {
    const repository = new FakeRepository(); repository.loadResult = { kind: 'loaded', profile: SAVED }; repository.saveError = true;
    const store = new PersonalProfileStore(repository); await store.hydrate(); await store.save(CANDIDATE);
    expect(store.restoreSaved()).toBe(true);
    expect(store.getState()).toEqual({ status: 'ready', activeProfile: SAVED });
  });
  it('replaces corrupt storage only after explicit confirmation', async () => {
    const repository = new FakeRepository(); repository.loadResult = { kind: 'corrupt' };
    const store = new PersonalProfileStore(repository); await store.hydrate();
    expect(repository.saved).toEqual([]);
    await expect(store.replaceCorruptWithEmptyProfile()).resolves.toBe(true);
    expect(repository.saved).toEqual([emptyAvoidedIngredientProfile()]);
  });
});
