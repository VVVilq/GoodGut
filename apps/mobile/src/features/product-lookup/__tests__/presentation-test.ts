import { NormalizedProduct, ProductLookup } from '@/domain/product-lookup/types';
import { AvoidedIngredientProfile } from '@/domain/avoided-ingredients/profile';
import { PersonalProfileState } from '@/features/personal-profile/profile-store';
import { ProductLookupState } from '../lookup-state-machine';
import { presentProductLookup } from '../presentation';

const nutrition: NormalizedProduct['nutrition'] = {
  energy_kcal: { status: 'available', value: 0, unit: 'kcal', basis: 'per_100g' },
  carbohydrates: { status: 'available', value: 10.6, unit: 'g', basis: 'per_100ml' },
  sugars: { status: 'unavailable', reason: 'missing_source' },
  fat: { status: 'unavailable', reason: 'unknown_basis' },
  saturated_fat: { status: 'unavailable', reason: 'invalid_value' },
  fiber: { status: 'unavailable', reason: 'unsupported_unit' },
  protein: { status: 'available', value: 2, unit: 'g', basis: 'per_100g' },
  salt: { status: 'available', value: 0, unit: 'g', basis: 'per_100ml' },
};

const product = (overrides: Partial<NormalizedProduct> = {}): NormalizedProduct => ({
  identity: { displayName: 'Example', brands: [], quantity: null, imageUrl: null },
  nutriScore: { status: 'missing' },
  ingredients: { status: 'missing' },
  nutrition,
  ...overrides,
});

const resolved = (result: ProductLookup): ProductLookupState => ({
  status: 'resolved',
  barcode: result.barcode,
  result,
});

const EMPTY_PROFILE: AvoidedIngredientProfile = {
  selections: [],
  customIngredients: [],
};
const ready = (profile: AvoidedIngredientProfile = EMPTY_PROFILE): PersonalProfileState => ({
  status: 'ready',
  activeProfile: profile,
});

describe('product lookup presentation', () => {
  it('keeps all eight nutrients in stable order and preserves zero and both bases', () => {
    const presentation = presentProductLookup(
      resolved({
        contractVersion: '2.0',
        outcome: 'found',
        barcode: '12345678',
        source: { provider: 'open_food_facts', providerProductUrl: null, fetchedAt: '2026-08-19T00:00:00Z' },
        product: product(),
      }),
      ready(),
    );
    expect(presentation.kind).toBe('found');
    if (presentation.kind !== 'found') throw new Error('expected found');
    expect(presentation.nutrients.map((row) => row.id)).toEqual([
      'energy_kcal', 'carbohydrates', 'sugars', 'fat', 'saturated_fat', 'fiber', 'protein', 'salt',
    ]);
    expect(presentation.nutrients[0].displayValue).toBe('0 kcal / 100 g');
    expect(presentation.nutrients[1].displayValue).toBe('10.6 g / 100 ml');
    expect(presentation.nutrients[2].displayValue).toBe('Brak danych');
  });

  it.each([
    ['missing', 'Brak danych o składnikach'],
    ['unparseable', 'Nie udało się wiarygodnie odczytać składników'],
  ] as const)('distinguishes %s ingredients', (status, expected) => {
    const presentation = foundPresentation(product({ ingredients: { status } }));
    expect(presentation.ingredients).toEqual({ text: expected, available: false });
  });

  it('preserves nullable identity and missing Nutri-Score without inventing values', () => {
    const presentation = foundPresentation(product());
    expect(presentation.identity).toMatchObject({ brands: null, quantity: null, imageUrl: null });
    expect(presentation.nutriScore).toBe('Brak danych');
  });

  it.each([
    ['not_found', 'not_found', ['scan_another']],
    ['rate_limited', 'source_error', ['retry', 'scan_another']],
    ['network_error', 'source_error', ['retry', 'scan_another']],
    ['invalid_source_response', 'source_error', ['retry', 'scan_another']],
    ['source_unavailable', 'source_error', ['retry', 'scan_another']],
  ] as const)('maps contract state %s to stable copy and actions', (category, kind, actions) => {
    const result: ProductLookup = category === 'not_found'
      ? { contractVersion: '2.0', outcome: 'not_found', barcode: '12345678', source: { provider: 'open_food_facts' }, reason: 'not_in_source' }
      : { contractVersion: '2.0', outcome: 'source_error', barcode: '12345678', source: { provider: 'open_food_facts' }, errorCategory: category };
    expect(presentProductLookup(resolved(result), ready())).toMatchObject({ kind, actions });
  });

  it.each(['missing_configuration', 'transport_failure', 'http_error', 'invalid_response', 'unexpected'] as const)(
    'maps client error %s to retry and scan-another actions',
    (kind) => {
      expect(
        presentProductLookup(
          { status: 'client_error', barcode: '12345678', error: { kind } },
          ready(),
        ),
      ).toMatchObject({ kind: 'client_error', actions: ['retry', 'scan_another'] });
    },
  );

  it('places triggered warning evidence before facts and marks every matched ingredient', () => {
    const presentation = foundPresentation(
      product({ ingredients: availableIngredients(['water', 'E 955', 'sucralose']) }),
      ready({ selections: [], customIngredients: [{ id: 'sucralose', name: 'Sucralose' }] }),
    );

    expect(presentation.ingredientWarnings).toEqual({
      kind: 'triggered',
      title: '1 ostrzeżenie',
      detail: 'Produkt zawiera składniki pasujące do Twoich reguł.',
      warnings: [{
        ruleId: 'custom:sucralose',
        ruleLabel: 'Sucralose',
        matchedIngredientNames: ['sucralose'],
      }],
      actions: [],
    });
    expect(presentation.ingredients).toEqual({
      available: true,
      items: [
        { text: 'water', warning: false },
        { text: 'E 955', warning: false },
        { text: 'sucralose', warning: true },
      ],
    });
  });

  it('distinguishes no rules, trustworthy zero, profile lifecycle, and unavailable ingredients', () => {
    const available = product({ ingredients: availableIngredients(['water']) });
    const configured = ready({
      selections: [],
      customIngredients: [{ id: 'apple', name: 'Apple' }],
    });

    expect(foundPresentation(available).ingredientWarnings).toEqual({ kind: 'none' });
    expect(foundPresentation(available, configured).ingredientWarnings).toMatchObject({
      kind: 'no_triggers',
      title: '0 ostrzeżeń',
    });
    expect(foundPresentation(available, { status: 'hydrating' }).ingredientWarnings).toMatchObject({
      kind: 'loading',
    });
    expect(
      foundPresentation(available, { status: 'load_error', error: 'storage' }).ingredientWarnings,
    ).toMatchObject({
      kind: 'profile_error',
      actions: ['retry_profile', 'open_profile'],
    });
    expect(foundPresentation(product(), configured).ingredientWarnings).toMatchObject({
      kind: 'unavailable',
    });
  });

  it('shows certain warnings and an explicit incomplete state for partial evidence', () => {
    const configured = ready({
      selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree', ancestorNodeIds: [] }],
      customIngredients: [],
    });
    const matching = foundPresentation(product({ ingredients: taxonomyIngredients('partial') }), configured);
    expect(matching.ingredientWarnings).toMatchObject({
      kind: 'triggered',
      title: '1 ostrzeżenie',
    });
    if (matching.ingredientWarnings.kind !== 'triggered') throw new Error('expected triggered');
    expect(matching.ingredientWarnings.detail).toContain('niepełna');

    const exactOnly = ready({
      selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'node', ancestorNodeIds: [] }],
      customIngredients: [],
    });
    expect(foundPresentation(product({ ingredients: taxonomyIngredients('partial') }), exactOnly).ingredientWarnings).toMatchObject({
      kind: 'incomplete',
    });
  });
});

function foundPresentation(
  value: NormalizedProduct,
  profileState: PersonalProfileState = ready(),
) {
  const presentation = presentProductLookup(
    resolved({
      contractVersion: '2.0',
      outcome: 'found',
      barcode: '12345678',
      source: { provider: 'open_food_facts', providerProductUrl: null, fetchedAt: '2026-08-19T00:00:00Z' },
      product: value,
    }),
    profileState,
  );
  if (presentation.kind !== 'found') throw new Error('expected found');
  return presentation;
}

function availableIngredients(names: readonly string[]): NormalizedProduct['ingredients'] {
  return {
    status: 'available',
    completeness: 'complete',
    catalogueVersion: 'fixture',
    items: names.map((displayName, index) => ({
      displayName,
      nodeId: `en:test-${index}`,
      ancestorNodeIds: [],
    })),
    names,
  };
}

function taxonomyIngredients(completeness: 'complete' | 'partial'): NormalizedProduct['ingredients'] {
  return {
    status: 'available',
    completeness,
    catalogueVersion: 'fixture',
    items: [{ displayName: 'goat milk', nodeId: 'en:goat-milk', ancestorNodeIds: ['en:milk'] }],
    names: ['goat milk'],
  };
}
