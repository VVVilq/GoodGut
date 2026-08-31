import { evaluatePersonalRules, ProductFacts } from '../../personal-rules';
import {
  addCustomIngredient,
  deleteCustomIngredient,
  deselectPredefinedIngredient,
  emptyAvoidedIngredientProfile,
  MAX_CUSTOM_INGREDIENT_LENGTH,
  ProfileMutationResult,
  profileToIngredientRuleDescriptors,
  profileToIngredientRules,
  renameCustomIngredient,
  selectPredefinedIngredient,
  validateAvoidedIngredientProfile,
} from '../profile';

describe('avoided ingredient profile', () => {
  it('supports immutable select, deselect, add, read, rename, and delete operations', () => {
    const empty = emptyAvoidedIngredientProfile();
    const selected = expectSuccess(selectPredefinedIngredient(empty, 'sucralose'));
    const added = expectSuccess(addCustomIngredient(selected, { id: 'one', name: '  Apple  ' }));
    const renamed = expectSuccess(renameCustomIngredient(added, 'one', 'Pear'));
    const deselected = deselectPredefinedIngredient(renamed, 'sucralose');
    const deleted = deleteCustomIngredient(deselected, 'one');

    expect(empty).toEqual({ selectedPredefinedIds: [], customIngredients: [] });
    expect(added.customIngredients).toEqual([{ id: 'one', name: 'Apple' }]);
    expect(renamed.customIngredients).toEqual([{ id: 'one', name: 'Pear' }]);
    expect(deleted).toEqual(empty);
  });

  it('rejects blank and oversized custom names without changing the profile', () => {
    const profile = emptyAvoidedIngredientProfile();
    expect(addCustomIngredient(profile, { id: 'blank', name: '   ' })).toMatchObject({
      ok: false,
      error: { code: 'blank_name' },
    });
    expect(
      addCustomIngredient(profile, {
        id: 'long',
        name: 'ą'.repeat(MAX_CUSTOM_INGREDIENT_LENGTH + 1),
      }),
    ).toMatchObject({ ok: false, error: { code: 'name_too_long' } });
    expect(profile).toEqual(emptyAvoidedIngredientProfile());
  });

  it('rejects custom duplicates and every predefined canonical or alias collision', () => {
    const withApple = expectSuccess(
      addCustomIngredient(emptyAvoidedIngredientProfile(), { id: 'apple', name: ' Apple ' }),
    );
    expect(addCustomIngredient(withApple, { id: 'duplicate', name: 'apple' })).toMatchObject({
      ok: false,
      error: { code: 'duplicate_name', conflictingId: 'apple' },
    });
    expect(addCustomIngredient(withApple, { id: 'canonical', name: 'Sucralose' })).toMatchObject({
      ok: false,
      error: { code: 'reserved_name', conflictingId: 'sucralose' },
    });
    expect(addCustomIngredient(withApple, { id: 'alias', name: ' e 955 ' })).toMatchObject({
      ok: false,
      error: { code: 'reserved_name', conflictingId: 'sucralose' },
    });
  });

  it('preserves a custom ID and old value when rename validation fails', () => {
    const profile = expectSuccess(
      addCustomIngredient(emptyAvoidedIngredientProfile(), { id: 'stable', name: 'Apple' }),
    );
    expect(renameCustomIngredient(profile, 'stable', 'E955')).toMatchObject({
      ok: false,
      error: { code: 'reserved_name', fieldId: 'stable' },
    });
    expect(profile.customIngredients).toEqual([{ id: 'stable', name: 'Apple' }]);
  });

  it('rejects unknown catalogue IDs and duplicate stable IDs', () => {
    expect(
      validateAvoidedIngredientProfile({
        selectedPredefinedIds: ['missing'],
        customIngredients: [],
      }),
    ).toMatchObject({ code: 'unknown_predefined' });
    expect(
      validateAvoidedIngredientProfile({
        selectedPredefinedIds: [],
        customIngredients: [
          { id: 'same', name: 'Apple' },
          { id: 'same', name: 'Pear' },
        ],
      }),
    ).toMatchObject({ code: 'duplicate_id' });
  });

  it('adapts saved selections to existing exact evaluator rules and counts per rule', () => {
    let profile = expectSuccess(
      selectPredefinedIngredient(emptyAvoidedIngredientProfile(), 'sucralose'),
    );
    profile = expectSuccess(addCustomIngredient(profile, { id: 'apple', name: 'Apple' }));
    const facts = product(['E 955', 'e955', ' apple ']);

    expect(evaluatePersonalRules(profileToIngredientRules(profile), facts)).toMatchObject({
      triggeredRuleIds: ['predefined:sucralose', 'custom:apple'],
      triggerCount: 2,
    });
    expect(evaluatePersonalRules(profileToIngredientRules(profile), product(['apple juice']))).toMatchObject({
      triggeredRuleIds: [],
      triggerCount: 0,
    });
  });

  it('adapts rules with shopper-facing predefined and custom labels', () => {
    let profile = expectSuccess(
      selectPredefinedIngredient(emptyAvoidedIngredientProfile(), 'sucralose'),
    );
    profile = expectSuccess(addCustomIngredient(profile, { id: 'apple', name: 'Apple' }));

    expect(profileToIngredientRuleDescriptors(profile)).toEqual([
      {
        label: 'Sukraloza',
        rule: expect.objectContaining({ id: 'predefined:sucralose', name: 'sucralose' }),
      },
      {
        label: 'Apple',
        rule: { id: 'custom:apple', kind: 'ingredient', name: 'Apple', source: 'custom' },
      },
    ]);
  });
});

function expectSuccess(result: ProfileMutationResult) {
  if (!result.ok) throw new Error('Expected profile mutation to succeed');
  return result.profile;
}

function product(names: string[]): ProductFacts {
  const unavailable = { status: 'unavailable' as const };
  return {
    ingredients: { status: 'available', names },
    nutrition: {
      energy_kcal: unavailable,
      carbohydrates: unavailable,
      sugars: unavailable,
      fat: unavailable,
      saturated_fat: unavailable,
      fiber: unavailable,
      protein: unavailable,
      salt: unavailable,
    },
  };
}
