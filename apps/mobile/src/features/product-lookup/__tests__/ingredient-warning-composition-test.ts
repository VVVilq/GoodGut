import { AvoidedIngredientProfile } from '@/domain/avoided-ingredients/profile';
import { FoundLookup, NormalizedProduct } from '@/domain/product-lookup/types';
import { PersonalProfileState } from '@/features/personal-profile/profile-store';

import { composeIngredientWarnings } from '../ingredient-warning-composition';
import { ProductLookupState } from '../lookup-state-machine';

const EMPTY_PROFILE: AvoidedIngredientProfile = {
  selections: [],
  customIngredients: [],
};
const SAVED_PROFILE: AvoidedIngredientProfile = {
  selections: [],
  customIngredients: [{ id: 'sucralose', name: 'Sucralose' }, { id: 'apple', name: 'Apple' }],
};
const CANDIDATE_PROFILE: AvoidedIngredientProfile = {
  selections: [],
  customIngredients: [{ id: 'water', name: 'Water' }],
};

describe('composeIngredientWarnings', () => {
  it('does not evaluate non-found lookup states', () => {
    expect(composeIngredientWarnings({ status: 'idle' }, ready(SAVED_PROFILE))).toEqual({
      kind: 'not_applicable',
    });
  });

  it('distinguishes profile hydration and load failure from an empty profile', () => {
    expect(composeIngredientWarnings(found(), { status: 'hydrating' })).toEqual({
      kind: 'profile_loading',
    });
    expect(
      composeIngredientWarnings(found(), { status: 'load_error', error: 'corrupt' }),
    ).toEqual({ kind: 'profile_error', error: 'corrupt' });
    expect(composeIngredientWarnings(found(), ready(EMPTY_PROFILE))).toEqual({ kind: 'no_rules' });
  });

  it.each(['missing', 'unparseable'] as const)(
    'reports %s ingredients unavailable when saved rules exist',
    (status) => {
      expect(
        composeIngredientWarnings(found({ ingredients: { status } }), ready(SAVED_PROFILE)),
      ).toEqual({ kind: 'ingredients_unavailable', reason: status, ruleCount: 2 });
    },
  );

  it('reports a trustworthy zero only after evaluating available ingredients', () => {
    expect(
      composeIngredientWarnings(
        found({ ingredients: { status: 'available', names: ['water'] } }),
        ready(SAVED_PROFILE),
      ),
    ).toEqual({ kind: 'no_triggers', ruleCount: 2 });
  });

  it('returns Polish/custom labels and every match while counting each rule once', () => {
    expect(
      composeIngredientWarnings(
        found({
          ingredients: {
            status: 'available',
            names: ['sucralose', 'E 955', 'E 955', ' apple '],
          },
        }),
        ready(SAVED_PROFILE),
      ),
    ).toEqual({
      kind: 'triggered',
      ruleCount: 2,
      triggerCount: 2,
      warnings: [
        {
          ruleId: 'custom:sucralose',
          ruleLabel: 'Sucralose',
          matchedIngredientNames: ['sucralose'],
        },
        {
          ruleId: 'custom:apple',
          ruleLabel: 'Apple',
          matchedIngredientNames: [' apple '],
        },
      ],
      matchedIngredientNames: ['sucralose', ' apple '],
    });
  });

  it.each(['saving', 'save_error'] as const)(
    'evaluates the active saved profile during %s rather than the candidate',
    (status) => {
      const profileState: PersonalProfileState = status === 'saving'
        ? { status, activeProfile: SAVED_PROFILE, candidate: CANDIDATE_PROFILE }
        : {
            status,
            activeProfile: SAVED_PROFILE,
            candidate: CANDIDATE_PROFILE,
            error: 'storage',
          };

      const result = composeIngredientWarnings(
        found({ ingredients: { status: 'available', names: ['water'] } }),
        profileState,
      );
      expect(result).toEqual({ kind: 'no_triggers', ruleCount: 2 });
    },
  );
});

function ready(profile: AvoidedIngredientProfile): PersonalProfileState {
  return { status: 'ready', activeProfile: profile };
}

function found(overrides: Partial<NormalizedProduct> = {}): ProductLookupState {
  const product: NormalizedProduct = {
    identity: { displayName: 'Product', brands: [], quantity: null, imageUrl: null },
    nutriScore: { status: 'missing' },
    ingredients: { status: 'available', names: ['water'] },
    nutrition: {
      energy_kcal: unavailable(),
      carbohydrates: unavailable(),
      sugars: unavailable(),
      fat: unavailable(),
      saturated_fat: unavailable(),
      fiber: unavailable(),
      protein: unavailable(),
      salt: unavailable(),
    },
    ...overrides,
  };
  const result: FoundLookup = {
    contractVersion: '1.0',
    outcome: 'found',
    barcode: '12345678',
    source: {
      provider: 'open_food_facts',
      providerProductUrl: null,
      fetchedAt: '2026-08-31T00:00:00Z',
    },
    product,
  };
  return { status: 'resolved', barcode: result.barcode, result };
}

function unavailable() {
  return { status: 'unavailable' as const, reason: 'missing_source' as const };
}
