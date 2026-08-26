import { TwoSlotPersonalProfileRepository, AsyncKeyValueStore } from '@/data/personal-profile-repository';
import { profileToIngredientRules } from '@/domain/avoided-ingredients/profile';
import { evaluatePersonalRules, ProductFacts } from '@/domain/personal-rules';

class MemoryStorage implements AsyncKeyValueStore {
  values = new Map<string, string>();
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
}

const facts: ProductFacts = { ingredients: { status: 'available', names: ['E955', 'inulina'] }, nutrition: {} as ProductFacts['nutrition'] };

describe('persisted profile evaluator handoff', () => {
  it('round-trips predefined aliases and custom exact names with stable rule identities', async () => {
    const storage = new MemoryStorage();
    const repository = new TwoSlotPersonalProfileRepository(storage);
    const profile = { selectedPredefinedIds: ['sucralose'], customIngredients: [{ id: 'custom-1', name: 'Inulina' }] } as const;
    await repository.save(profile);
    const loaded = await repository.load();
    if (loaded.kind !== 'loaded') throw new Error(`Unexpected load result: ${loaded.kind}`);
    const rules = profileToIngredientRules(loaded.profile);
    expect(rules.map((rule) => rule.id)).toEqual(['predefined:sucralose', 'custom:custom-1']);
    expect(evaluatePersonalRules(rules, facts)).toMatchObject({
      triggeredRuleIds: ['predefined:sucralose', 'custom:custom-1'],
      triggerCount: 2,
    });
  });

  it('removes deselected and deleted rules after a subsequent save', async () => {
    const storage = new MemoryStorage();
    const repository = new TwoSlotPersonalProfileRepository(storage);
    await repository.save({ selectedPredefinedIds: ['sucralose'], customIngredients: [{ id: 'custom-1', name: 'Inulina' }] });
    await repository.save({ selectedPredefinedIds: [], customIngredients: [] });
    const loaded = await repository.load();
    if (loaded.kind !== 'loaded') throw new Error(`Unexpected load result: ${loaded.kind}`);
    expect(profileToIngredientRules(loaded.profile)).toEqual([]);
  });
});
