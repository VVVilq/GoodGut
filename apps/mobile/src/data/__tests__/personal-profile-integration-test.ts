import { TwoSlotPersonalProfileRepository, AsyncKeyValueStore } from '@/data/personal-profile-repository';
import { profileToIngredientRules } from '@/domain/avoided-ingredients/profile';
import { evaluateIngredientRules } from '@/domain/personal-rules';

class MemoryStorage implements AsyncKeyValueStore {
  values = new Map<string, string>();
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
}

const classifiedIngredients = {
  status: 'available' as const,
  completeness: 'complete' as const,
  names: ['goat milk', 'inulina'],
  items: [
    { displayName: 'goat milk', nodeId: 'en:goat-milk', ancestorNodeIds: ['en:milk'] },
    { displayName: 'inulina', nodeId: 'en:inulin', ancestorNodeIds: [] },
  ],
};

describe('persisted profile evaluator handoff', () => {
  it('round-trips taxonomy scope and custom exact names with stable rule identities', async () => {
    const storage = new MemoryStorage();
    const repository = new TwoSlotPersonalProfileRepository(storage);
    const profile = {
      selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree' }],
      customIngredients: [{ id: 'custom-1', name: 'Inulina' }],
    } as const;
    await repository.save(profile);
    const loaded = await repository.load();
    if (loaded.kind !== 'loaded') throw new Error(`Unexpected load result: ${loaded.kind}`);
    const rules = profileToIngredientRules(loaded.profile);
    expect(rules.map((rule) => rule.id)).toEqual(['taxonomy:en:milk', 'custom:custom-1']);
    expect(evaluateIngredientRules(rules, classifiedIngredients)).toMatchObject({
      matches: [
        { ruleId: 'taxonomy:en:milk', matchedIngredientNames: ['goat milk'] },
        { ruleId: 'custom:custom-1', matchedIngredientNames: ['inulina'] },
      ],
      triggerCount: 2,
    });
  });

  it('removes deselected and deleted rules after a subsequent save', async () => {
    const storage = new MemoryStorage();
    const repository = new TwoSlotPersonalProfileRepository(storage);
    await repository.save({ selections: [], customIngredients: [{ id: 'custom-1', name: 'Inulina' }] });
    await repository.save({ selections: [], customIngredients: [] });
    const loaded = await repository.load();
    if (loaded.kind !== 'loaded') throw new Error(`Unexpected load result: ${loaded.kind}`);
    expect(profileToIngredientRules(loaded.profile)).toEqual([]);
  });
});
