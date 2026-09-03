import {
  addNutritionThreshold,
  emptyPersonalProfile,
  parseNutritionThresholdInput,
  profileToPersonalRules,
  removeNutritionThreshold,
  updateNutritionThreshold,
  validateNutritionThresholds,
} from '../personal-profile';
import { nutrientCatalogue, nutrientIds } from '../nutrition';

describe('nutrition catalogue', () => {
  it('is the canonical eight-item catalogue with reviewed labels and units', () => {
    expect(nutrientCatalogue.map(({ id }) => id)).toEqual(nutrientIds);
    expect(new Set(nutrientIds).size).toBe(8);
    expect(nutrientCatalogue).toEqual([
      { id: 'energy_kcal', labelPl: 'Wartość energetyczna', unit: 'kcal' },
      { id: 'carbohydrates', labelPl: 'Węglowodany', unit: 'g' },
      { id: 'sugars', labelPl: 'Cukry', unit: 'g' },
      { id: 'fat', labelPl: 'Tłuszcz', unit: 'g' },
      { id: 'saturated_fat', labelPl: 'Kwasy tłuszczowe nasycone', unit: 'g' },
      { id: 'fiber', labelPl: 'Błonnik', unit: 'g' },
      { id: 'protein', labelPl: 'Białko', unit: 'g' },
      { id: 'salt', labelPl: 'Sól', unit: 'g' },
    ]);
  });
});

describe('nutrition threshold input', () => {
  it.each([
    ['0', 0],
    ['12', 12],
    ['12.5', 12.5],
    [' 12,5 ', 12.5],
    ['00,50', 0.5],
  ])('parses %s', (input, expected) => {
    expect(parseNutritionThresholdInput(input)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ['', 'blank_threshold'],
    ['  ', 'blank_threshold'],
    ['-1', 'negative_threshold'],
    ['1,2.3', 'invalid_threshold'],
    ['1 000', 'invalid_threshold'],
    ['1.', 'invalid_threshold'],
    ['1mg', 'invalid_threshold'],
    ['Infinity', 'invalid_threshold'],
    ['1e3', 'invalid_threshold'],
  ])('rejects %s', (input, error) => {
    expect(parseNutritionThresholdInput(input)).toEqual({ ok: false, error });
  });
});

describe('personal profile nutrition thresholds', () => {
  const sugars = {
    nutrient: 'sugars' as const,
    direction: 'above' as const,
    threshold: 5.5,
    basis: 'per_100g' as const,
  };

  it('adds, updates, and removes a stable rule', () => {
    const added = addNutritionThreshold(emptyPersonalProfile(), sugars);
    expect(added).toEqual({
      ok: true,
      profile: {
        selections: [],
        customIngredients: [],
        nutritionThresholds: [{ id: 'nutrition:sugars', ...sugars }],
      },
    });
    if (!added.ok) throw new Error('expected add to succeed');

    const updated = updateNutritionThreshold(added.profile, 'sugars', {
      direction: 'below',
      threshold: 0,
      basis: 'per_100ml',
    });
    expect(updated.ok && updated.profile.nutritionThresholds).toEqual([
      { id: 'nutrition:sugars', nutrient: 'sugars', direction: 'below', threshold: 0, basis: 'per_100ml' },
    ]);
    if (!updated.ok) throw new Error('expected update to succeed');
    expect(removeNutritionThreshold(updated.profile, 'sugars')).toEqual(emptyPersonalProfile());
  });

  it('keeps catalogue order and rejects a second rule for one nutrient', () => {
    const salt = addNutritionThreshold(emptyPersonalProfile(), {
      nutrient: 'salt', direction: 'above', threshold: 1, basis: 'per_100g',
    });
    if (!salt.ok) throw new Error('expected salt add to succeed');
    const energy = addNutritionThreshold(salt.profile, {
      nutrient: 'energy_kcal', direction: 'below', threshold: 100, basis: 'per_100ml',
    });
    expect(energy.ok && energy.profile.nutritionThresholds.map(({ nutrient }) => nutrient)).toEqual([
      'energy_kcal', 'salt',
    ]);
    if (!energy.ok) throw new Error('expected energy add to succeed');
    expect(addNutritionThreshold(energy.profile, sugars)).toEqual({
      ok: true,
      profile: expect.any(Object),
    });
    const duplicate = addNutritionThreshold(
      (addNutritionThreshold(emptyPersonalProfile(), sugars) as { ok: true; profile: ReturnType<typeof emptyPersonalProfile> }).profile,
      { ...sugars, threshold: 6 },
    );
    expect(duplicate).toEqual({
      ok: false,
      error: {
        code: 'duplicate_nutrient',
        fieldId: 'nutrition:sugars',
        conflictingId: 'nutrition:sugars',
      },
    });
  });

  it('rejects invalid ids, enum values, thresholds, and duplicate nutrients', () => {
    expect(validateNutritionThresholds([
      { id: 'other', ...sugars },
    ])?.code).toBe('invalid_nutrition_id');
    expect(validateNutritionThresholds([
      { id: 'nutrition:sugars', ...sugars, direction: 'sideways' as 'above' },
    ])?.code).toBe('invalid_direction');
    expect(validateNutritionThresholds([
      { id: 'nutrition:sugars', ...sugars, basis: 'per_serving' as 'per_100g' },
    ])?.code).toBe('invalid_basis');
    expect(validateNutritionThresholds([
      { id: 'nutrition:sugars', ...sugars, threshold: Number.NaN },
    ])?.code).toBe('invalid_threshold');
    expect(validateNutritionThresholds([
      { id: 'nutrition:sugars', ...sugars },
      { id: 'nutrition:sugars', ...sugars, threshold: 6 },
    ])?.code).toBe('duplicate_nutrient');
  });

  it('projects ingredient and nutrition rules without partial acceptance', () => {
    const profile = {
      selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree' as const, ancestorNodeIds: [] }],
      customIngredients: [{ id: 'custom-1', name: 'Inulina' }],
      nutritionThresholds: [
        { id: 'nutrition:sugars', ...sugars },
        { id: 'nutrition:fiber', nutrient: 'fiber' as const, direction: 'below' as const, threshold: 2, basis: 'per_100ml' as const },
      ],
    };
    expect(profileToPersonalRules(profile)).toEqual([
      { id: 'taxonomy:en:milk', kind: 'ingredient', name: 'Mleko', source: 'taxonomy', nodeId: 'en:milk', scope: 'subtree' },
      { id: 'custom:custom-1', kind: 'ingredient', name: 'Inulina', source: 'custom' },
      { id: 'nutrition:sugars', kind: 'nutrition', ...sugars },
      { id: 'nutrition:fiber', kind: 'nutrition', nutrient: 'fiber', direction: 'below', threshold: 2, basis: 'per_100ml' },
    ]);

    expect(() => profileToPersonalRules({
      ...profile,
      nutritionThresholds: [{ id: 'wrong', ...sugars }],
    })).toThrow('Invalid personal profile: nutrition:invalid_nutrition_id');
  });
});
