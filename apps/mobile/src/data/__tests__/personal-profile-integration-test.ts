import {
  TwoSlotPersonalProfileRepository,
  AsyncKeyValueStore,
  PERSONAL_PROFILE_KEYS,
} from '@/data/personal-profile-repository';
import { profileToIngredientRules } from '@/domain/avoided-ingredients/profile';
import { PersonalProfile, profileToPersonalRules } from '@/domain/personal-profile';
import { evaluateIngredientRules, evaluatePersonalRules, ProductFacts } from '@/domain/personal-rules';
import { PersonalProfileStore } from '@/features/personal-profile/profile-store';

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
    { recognition: 'recognized' as const, displayName: 'goat milk', nodeId: 'en:goat-milk', ancestorNodeIds: ['en:milk'] },
    { recognition: 'recognized' as const, displayName: 'inulina', nodeId: 'en:inulin', ancestorNodeIds: [] },
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

  it('hydrates all eight persisted nutrition rules through the store with exact evaluator fields', async () => {
    const storage = new MemoryStorage();
    const repository = new TwoSlotPersonalProfileRepository(storage);
    const nutritionThresholds: PersonalProfile['nutritionThresholds'] = [
      { id: 'nutrition:energy_kcal', nutrient: 'energy_kcal', direction: 'above', threshold: 0, basis: 'per_100g' },
      { id: 'nutrition:carbohydrates', nutrient: 'carbohydrates', direction: 'below', threshold: 10.5, basis: 'per_100ml' },
      { id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 5.5, basis: 'per_100g' },
      { id: 'nutrition:fat', nutrient: 'fat', direction: 'below', threshold: 20, basis: 'per_100ml' },
      { id: 'nutrition:saturated_fat', nutrient: 'saturated_fat', direction: 'above', threshold: 3.2, basis: 'per_100g' },
      { id: 'nutrition:fiber', nutrient: 'fiber', direction: 'below', threshold: 2, basis: 'per_100ml' },
      { id: 'nutrition:protein', nutrient: 'protein', direction: 'above', threshold: 7, basis: 'per_100g' },
      { id: 'nutrition:salt', nutrient: 'salt', direction: 'below', threshold: 1.1, basis: 'per_100ml' },
    ];
    const profile: PersonalProfile = {
      selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree', ancestorNodeIds: [] }],
      customIngredients: [{ id: 'one', name: 'Inulina' }],
      nutritionThresholds,
    };
    await repository.save(profile);

    const store = new PersonalProfileStore(repository);
    await store.hydrate();
    expect(store.getState()).toEqual({ status: 'ready', activeProfile: { ...profile, nutritionThresholds: profile.nutritionThresholds.map(({ id, nutrient, direction, threshold }) => ({ id, nutrient, direction, threshold })) } });
    expect(profileToPersonalRules(profile)).toEqual([
      { id: 'taxonomy:en:milk', kind: 'ingredient', name: 'Mleko', source: 'taxonomy', nodeId: 'en:milk', scope: 'subtree' },
      { id: 'custom:one', kind: 'ingredient', name: 'Inulina', source: 'custom' },
      ...nutritionThresholds.map(({ id, nutrient, direction, threshold }) => ({ id, nutrient, direction, threshold, kind: 'nutrition' as const })),
    ]);
  });

  it('evaluates persisted thresholds without treating equality, missing values, or basis mismatches as non-matches', async () => {
    const storage = new MemoryStorage();
    const repository = new TwoSlotPersonalProfileRepository(storage);
    const profile: PersonalProfile = {
      selections: [],
      customIngredients: [],
      nutritionThresholds: [
        { id: 'nutrition:energy_kcal', nutrient: 'energy_kcal', direction: 'above', threshold: 100, basis: 'per_100g' },
        { id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 5.5, basis: 'per_100g' },
        { id: 'nutrition:fiber', nutrient: 'fiber', direction: 'below', threshold: 2, basis: 'per_100ml' },
        { id: 'nutrition:salt', nutrient: 'salt', direction: 'below', threshold: 1, basis: 'per_100ml' },
      ],
    };
    await repository.save(profile);
    const loaded = await repository.load();
    if (loaded.kind !== 'loaded') throw new Error(`Unexpected load result: ${loaded.kind}`);
    const unavailable = { status: 'unavailable' as const };
    const product: ProductFacts = {
      ingredients: { status: 'available', names: [] },
      nutrition: {
        energy_kcal: { status: 'available', value: 100, basis: 'per_100g' },
        carbohydrates: unavailable,
        sugars: { status: 'available', value: 6, basis: 'per_100g' },
        fat: unavailable,
        saturated_fat: unavailable,
        fiber: unavailable,
        protein: unavailable,
        salt: { status: 'available', value: 0.5, basis: 'per_100g' },
      },
    };

    expect(evaluatePersonalRules(profileToPersonalRules(loaded.profile), product)).toEqual({
      triggeredRuleIds: ['nutrition:sugars', 'nutrition:salt'],
      unavailableRuleIds: ['nutrition:fiber'],
      triggerCount: 2,
    });
  });

  it('migrates persisted v2 ingredients before saving and projecting a v3 mixed profile', async () => {
    const storage = new MemoryStorage();
    storage.values.set(PERSONAL_PROFILE_KEYS.v2Active, 'a');
    storage.values.set(PERSONAL_PROFILE_KEYS.v2A, JSON.stringify({
      schemaVersion: 2,
      profile: {
        selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree', ancestorNodeIds: [] }],
        customIngredients: [{ id: 'one', name: 'Inulina' }],
      },
    }));
    const repository = new TwoSlotPersonalProfileRepository(storage);
    const migrated = await repository.load();
    if (migrated.kind !== 'migrated') throw new Error(`Unexpected load result: ${migrated.kind}`);
    const upgraded: PersonalProfile = {
      ...migrated.profile,
      nutritionThresholds: [
        { id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 0, basis: 'per_100g' },
      ],
    };
    await repository.save(upgraded);
    const loaded = await repository.load();
    if (loaded.kind !== 'loaded') throw new Error(`Unexpected load result: ${loaded.kind}`);

    expect(profileToPersonalRules(loaded.profile).map(({ id }) => id)).toEqual([
      'taxonomy:en:milk',
      'custom:one',
      'nutrition:sugars',
    ]);
    expect(storage.values.get(PERSONAL_PROFILE_KEYS.v2A)).toBeDefined();
  });
});
