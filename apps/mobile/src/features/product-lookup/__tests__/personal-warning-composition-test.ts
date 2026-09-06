import { nutrientIds, NutritionBasis, NutritionDirection } from '@/domain/nutrition';
import { emptyPersonalProfile, NutritionThreshold, PersonalProfile } from '@/domain/personal-profile';
import { NormalizedProduct, NutritionFact } from '@/domain/product-lookup/types';
import { PersonalProfileState } from '@/features/personal-profile/profile-store';

import { ProductLookupState } from '../lookup-state-machine';
import { composePersonalWarnings } from '../personal-warning-composition';

const threshold = (changes: Partial<NutritionThreshold> = {}): NutritionThreshold => ({
  id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 10, basis: 'per_100g', ...changes,
});
const profile = (changes: Partial<PersonalProfile> = {}): PersonalProfile => ({
  ...emptyPersonalProfile(), nutritionThresholds: [threshold()], ...changes,
});
const ready = (value = profile()): PersonalProfileState => ({ status: 'ready', activeProfile: value });
const available = (value = 12, basis: NutritionBasis = 'per_100g'): NutritionFact => ({
  status: 'available', value, unit: 'g', basis,
});
const ingredients = (partial = false): NormalizedProduct['ingredients'] => ({
  status: 'available', completeness: partial ? 'partial' : 'complete', catalogueVersion: 'fixture',
  names: ['goat milk', 'goat milk', 'inulin'],
  items: [
    { recognition: 'recognized', displayName: 'goat milk', nodeId: 'en:goat-milk', ancestorNodeIds: ['en:milk'] },
    { recognition: 'recognized', displayName: 'goat milk', nodeId: 'en:goat-milk', ancestorNodeIds: ['en:milk'] },
    { recognition: 'unrecognized', displayName: 'inulin' },
  ],
});
function found(fact = available(), ingredientFacts = ingredients()): ProductLookupState {
  return {
    status: 'resolved', barcode: '12345678', result: {
      contractVersion: '3.0', outcome: 'found', barcode: '12345678',
      source: { provider: 'open_food_facts', providerProductUrl: null, fetchedAt: '2026-09-05T00:00:00Z' },
      product: {
        identity: { displayName: 'Fixture', brands: [], quantity: null, imageUrl: null },
        nutriScore: { status: 'missing' }, ingredients: ingredientFacts,
        nutrition: {
          energy_kcal: { status: 'unavailable', reason: 'missing_source' },
          carbohydrates: { status: 'unavailable', reason: 'missing_source' },
          sugars: fact,
          fat: { status: 'unavailable', reason: 'missing_source' },
          saturated_fat: { status: 'unavailable', reason: 'missing_source' },
          fiber: { status: 'unavailable', reason: 'missing_source' },
          protein: { status: 'unavailable', reason: 'missing_source' },
          salt: { status: 'unavailable', reason: 'missing_source' },
        },
      },
    },
  };
}
function evaluated(lookup = found(), state = ready()) {
  const result = composePersonalWarnings(lookup, state);
  if (result.kind !== 'evaluated') throw new Error(`Expected evaluation, got ${result.kind}`);
  const unavailableIds = result.unavailableRules.map((item) => item.kind === 'ingredient' ? item.ruleId : item.rule.id);
  expect(result.triggeredRuleIds.some((id) => unavailableIds.includes(id))).toBe(false);
  expect(result.triggerCount).toBe(result.triggeredRuleIds.length);
  return result;
}

describe('composePersonalWarnings', () => {
  it.each<ProductLookupState>([
    { status: 'idle' }, { status: 'loading', barcode: '12345678' },
    { status: 'validation_error', input: 'bad' },
    { status: 'client_error', barcode: '12345678', error: { kind: 'transport_failure' } },
    { status: 'resolved', barcode: '12345678', result: {
      contractVersion: '3.0', outcome: 'not_found', barcode: '12345678',
      source: { provider: 'open_food_facts' }, reason: 'not_in_source',
    } },
    { status: 'resolved', barcode: '12345678', result: {
      contractVersion: '3.0', outcome: 'source_error', barcode: '12345678',
      source: { provider: 'open_food_facts' }, errorCategory: 'network_error',
    } },
  ])('does not evaluate non-found lookup %j', (lookup) => {
    expect(composePersonalWarnings(lookup, { status: 'hydrating' })).toEqual({ kind: 'not_applicable' });
  });

  it('distinguishes loading, errors, and no configured rules', () => {
    expect(composePersonalWarnings(found(), { status: 'hydrating' })).toEqual({ kind: 'profile_loading' });
    for (const error of ['corrupt', 'storage'] as const) {
      expect(composePersonalWarnings(found(), { status: 'load_error', error })).toEqual({ kind: 'profile_error', error });
    }
    expect(composePersonalWarnings(found(), ready(emptyPersonalProfile()))).toEqual({ kind: 'no_rules' });
  });

  describe.each<NutritionBasis>(['per_100g', 'per_100ml'])('strict comparisons on %s', (basis) => {
    it.each<[NutritionDirection, number, number, number]>([
      ['above', 10, 10, 0], ['above', 10.01, 10, 1], ['above', 9.99, 10, 0],
      ['below', 10, 10, 0], ['below', 9.99, 10, 1], ['below', 10.01, 10, 0],
      ['below', 0, 0.1, 1], ['above', 0, 0, 0], ['below', 0, 0, 0],
    ])('%s: value %s, threshold %s gives %s triggers', (direction, value, limit, count) => {
      const rule = threshold({ direction, threshold: limit, basis });
      const fact = available(value, basis);
      expect(evaluated(found(fact), ready(profile({ nutritionThresholds: [rule] })))).toMatchObject({
        ruleCount: 1, triggerCount: count, incomplete: false, unavailableRules: [],
        ingredientWarnings: [], ingredientSourceIncomplete: false,
        nutritionWarnings: count ? [{ rule: { id: rule.id, kind: 'nutrition', nutrient: rule.nutrient, direction: rule.direction, threshold: rule.threshold }, fact }] : [],
      });
    });
  });

  it.each<NutritionBasis>(['per_100g', 'per_100ml'])('evaluates across product basis for legacy rule basis %s', (basis) => {
    const productBasis = basis === 'per_100g' ? 'per_100ml' : 'per_100g';
    expect(evaluated(found(available(12, productBasis)), ready(profile({ nutritionThresholds: [threshold({ basis })] })))).toMatchObject({
      triggerCount: 1, incomplete: false, nutritionWarnings: [{ rule: { kind: 'nutrition', threshold: 10 }, fact: { value: 12, basis: productBasis } }],
      unavailableRules: [],
    });
  });

  it.each(['missing_source', 'unknown_basis', 'invalid_value', 'unsupported_unit'] as const)(
    'preserves unavailable nutrition reason %s', (reason) => {
      expect(evaluated(found({ status: 'unavailable', reason }))).toMatchObject({
        triggerCount: 0, incomplete: true,
        unavailableRules: [{ kind: 'nutrition', rule: { id: 'nutrition:sugars' }, reason }],
      });
    },
  );

  describe.each<NormalizedProduct['ingredients']>([
    ingredients(true), { status: 'missing' }, { status: 'unparseable' },
  ])('nutrition-only with ingredient evidence %j', (facts) => {
    it.each([[12, 1], [10, 0]])('value %s still yields complete count %s', (value, count) => {
      expect(evaluated(found(available(value), facts))).toMatchObject({
        triggerCount: count, incomplete: false, ingredientSourceIncomplete: false,
        ingredientWarnings: [], unavailableRules: [],
      });
    });
  });

  it('counts overlapping taxonomy/custom rules once each and preserves match labels', () => {
    const result = evaluated(found(available(), ingredients(true)), ready(profile({
      selections: [
        { nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree', ancestorNodeIds: [] },
        { nodeId: 'en:goat-milk', labelPl: 'Mleko kozie', scope: 'node', ancestorNodeIds: ['en:milk'] },
      ],
      customIngredients: [{ id: 'milk', name: ' GOAT MILK ' }, { id: 'inulin', name: 'Inulin' }],
    })));
    expect(result).toMatchObject({
      ruleCount: 5, triggerCount: 5, incomplete: true, ingredientSourceIncomplete: true,
      matchedIngredientNames: ['goat milk', 'inulin'], unavailableRules: [],
      ingredientWarnings: [
        { ruleId: 'taxonomy:en:milk', ruleLabel: 'Mleko', matchedIngredientNames: ['goat milk'] },
        { ruleId: 'taxonomy:en:goat-milk', ruleLabel: 'Mleko kozie', matchedIngredientNames: ['goat milk'] },
        { ruleId: 'custom:milk', ruleLabel: ' GOAT MILK ', matchedIngredientNames: ['goat milk'] },
        { ruleId: 'custom:inulin', ruleLabel: 'Inulin', matchedIngredientNames: ['inulin'] },
      ],
    });
  });

  it('keeps confirmed matches while reporting only unmatched partial rules unavailable', () => {
    expect(evaluated(found(available(), ingredients(true)), ready(profile({
      customIngredients: [{ id: 'inulin', name: 'inulin' }, { id: 'water', name: 'water' }],
      selections: [{ nodeId: 'en:inulin', labelPl: 'Inulina', scope: 'node', ancestorNodeIds: [] }],
      nutritionThresholds: [threshold(), threshold({ id: 'nutrition:fat', nutrient: 'fat' })],
    })))).toMatchObject({
      triggerCount: 2, incomplete: true,
      unavailableRules: [
        { kind: 'ingredient', ruleId: 'taxonomy:en:inulin', reason: 'partial' },
        { kind: 'ingredient', ruleId: 'custom:water', reason: 'partial' },
        { kind: 'nutrition', rule: { id: 'nutrition:fat' }, reason: 'missing_source' },
      ],
    });
  });

  it.each(['missing', 'unparseable'] as const)('still triggers nutrition with %s configured ingredients', (status) => {
    expect(evaluated(found(available(), { status }), ready(profile({
      customIngredients: [{ id: 'milk', name: 'milk' }],
    })))).toMatchObject({
      ruleCount: 2, triggerCount: 1, incomplete: true, ingredientSourceIncomplete: true,
      unavailableRules: [{ kind: 'ingredient', ruleId: 'custom:milk', ruleLabel: 'milk', reason: status }],
    });
  });

  it('returns a complete ingredient-only zero without evaluating unrelated absent nutrients', () => {
    expect(evaluated(found(), ready(profile({
      nutritionThresholds: [], customIngredients: [{ id: 'water', name: 'water' }],
    })))).toMatchObject({ ruleCount: 1, triggerCount: 0, incomplete: false, unavailableRules: [] });
  });

  it('orders all eight nutrition rules by catalogue rather than input order', () => {
    const rules = [...nutrientIds].reverse().map((nutrient) => threshold({ id: `nutrition:${nutrient}`, nutrient }));
    const lookup = found();
    if (lookup.status !== 'resolved' || lookup.result.outcome !== 'found') throw new Error('expected found');
    for (const nutrient of nutrientIds) {
      lookup.result.product.nutrition = { ...lookup.result.product.nutrition,
        [nutrient]: { ...available(), unit: nutrient === 'energy_kcal' ? 'kcal' : 'g' } };
    }
    const result = evaluated(lookup, ready(profile({ nutritionThresholds: rules })));
    expect(result.triggerCount).toBe(8);
    expect(result.nutritionWarnings.map(({ rule }) => rule.nutrient)).toEqual(nutrientIds);
    expect(result.nutritionWarnings[0].fact.unit).toBe('kcal');
  });

  it.each(['saving', 'save_error'] as const)('uses saved thresholds during %s, then reflects the successful save', (status) => {
    const activeProfile = profile();
    const candidate = profile({ nutritionThresholds: [threshold({ threshold: 20 })] });
    const state: PersonalProfileState = status === 'saving'
      ? { status, activeProfile, candidate }
      : { status, activeProfile, candidate, error: 'storage' };
    const lookup = found();
    expect(evaluated(lookup, state).triggerCount).toBe(1);
    expect(evaluated(lookup, ready(candidate)).triggerCount).toBe(0);
  });

  it.each(['ready', 'migrated', 'recovered', 'reset_notice'] as const)('uses the active profile in %s state', (status) => {
    expect(evaluated(found(), { status, activeProfile: profile() }).triggerCount).toBe(1);
  });
});
