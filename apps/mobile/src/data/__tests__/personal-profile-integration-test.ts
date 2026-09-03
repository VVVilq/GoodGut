import { TwoSlotPersonalProfileRepository, AsyncKeyValueStore } from '@/data/personal-profile-repository';
import { profileToIngredientRules } from '@/domain/avoided-ingredients/profile';
import { profileToPersonalRules } from '@/domain/personal-profile';
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
      selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree', ancestorNodeIds: [] }],
      customIngredients: [{ id: 'custom-1', name: 'Inulina' }],
      nutritionThresholds: [],
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
    await repository.save({ selections: [], customIngredients: [{ id: 'custom-1', name: 'Inulina' }], nutritionThresholds: [] });
    await repository.save({ selections: [], customIngredients: [], nutritionThresholds: [] });
    const loaded = await repository.load();
    if (loaded.kind !== 'loaded') throw new Error(`Unexpected load result: ${loaded.kind}`);
    expect(profileToIngredientRules(loaded.profile)).toEqual([]);
  });

  it('round-trips a mixed profile and preserves each rule family across edits', async () => {
    const storage = new MemoryStorage();
    const repository = new TwoSlotPersonalProfileRepository(storage);
    await repository.save({
      selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'node', ancestorNodeIds: [] }],
      customIngredients: [],
      nutritionThresholds: [{ id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 5.5, basis: 'per_100g' }],
    });
    const first = await repository.load();
    if (first.kind !== 'loaded') throw new Error(`Unexpected load result: ${first.kind}`);
    await repository.save({ ...first.profile, customIngredients: [{ id: 'one', name: 'Inulina' }] });
    const second = await repository.load();
    if (second.kind !== 'loaded') throw new Error(`Unexpected load result: ${second.kind}`);
    expect(profileToPersonalRules(second.profile).map(({ id }) => id)).toEqual([
      'taxonomy:en:milk', 'custom:one', 'nutrition:sugars',
    ]);
    await repository.save({ ...second.profile, nutritionThresholds: [] });
    const third = await repository.load();
    if (third.kind !== 'loaded') throw new Error(`Unexpected load result: ${third.kind}`);
    expect(profileToIngredientRules(third.profile).map(({ id }) => id)).toEqual([
      'taxonomy:en:milk', 'custom:one',
    ]);
  });
});
