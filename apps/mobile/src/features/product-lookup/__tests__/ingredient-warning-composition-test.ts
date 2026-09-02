import { AvoidedIngredientProfile } from '@/domain/avoided-ingredients/profile';
import { FoundLookup, NormalizedProduct } from '@/domain/product-lookup/types';
import { decodeProductLookup } from '@/domain/product-lookup/decoder';
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
  it('triggers from the real imported-taxonomy API boundary fixture', () => {
    const decoded = decodeProductLookup(fixture(
      'docs/reference/examples/ingredient-warning-imported-taxonomy.json',
    ));
    if (decoded.outcome !== 'found') throw new Error('expected found boundary fixture');
    const profile: AvoidedIngredientProfile = {
      selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree', ancestorNodeIds: [] }],
      customIngredients: [],
    };

    const result = composeIngredientWarnings(
      { status: 'resolved', barcode: decoded.barcode, result: decoded },
      ready(profile),
    );

    expect(result).toMatchObject({
      kind: 'triggered',
      triggerCount: 1,
      matchedIngredientNames: ['goat milk'],
    });
  });

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
        found({ ingredients: availableIngredients(['water']) }),
        ready(SAVED_PROFILE),
      ),
    ).toEqual({ kind: 'no_triggers', ruleCount: 2 });
  });

  it('matches node and subtree selections once and keeps saved Polish labels', () => {
    const profile: AvoidedIngredientProfile = {
      selections: [
        { nodeId: 'en:goat-milk', labelPl: 'Mleko kozie', scope: 'node', ancestorNodeIds: ['en:milk'] },
        { nodeId: 'en:egg', labelPl: 'Jajko', scope: 'subtree', ancestorNodeIds: [] },
      ],
      customIngredients: [],
    };
    expect(composeIngredientWarnings(found({ ingredients: evidenceIngredients('complete') }), ready(profile))).toEqual({
      kind: 'triggered',
      ruleCount: 2,
      triggerCount: 2,
      incomplete: false,
      warnings: [
        { ruleId: 'taxonomy:en:goat-milk', ruleLabel: 'Mleko kozie', matchedIngredientNames: ['goat milk'] },
        { ruleId: 'taxonomy:en:egg', ruleLabel: 'Jajko', matchedIngredientNames: ['egg yolk'] },
      ],
      matchedIngredientNames: ['goat milk', 'egg yolk'],
    });
  });

  it('never reports a neutral zero for partial taxonomy evidence', () => {
    const profile: AvoidedIngredientProfile = {
      selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'node', ancestorNodeIds: [] }],
      customIngredients: [],
    };
    expect(composeIngredientWarnings(found({ ingredients: evidenceIngredients('partial') }), ready(profile))).toEqual({
      kind: 'incomplete',
      ruleCount: 1,
    });
  });

  it('returns Polish/custom labels and every match while counting each rule once', () => {
    expect(
      composeIngredientWarnings(
        found({
          ingredients: availableIngredients(['sucralose', 'E 955', 'E 955', ' apple ']),
        }),
        ready(SAVED_PROFILE),
      ),
    ).toEqual({
      kind: 'triggered',
      ruleCount: 2,
      triggerCount: 2,
      incomplete: false,
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
        found({ ingredients: availableIngredients(['water']) }),
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
    ingredients: availableIngredients(['water']),
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
    contractVersion: '2.0',
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

function evidenceIngredients(completeness: 'complete' | 'partial'): NormalizedProduct['ingredients'] {
  const items = [
    { displayName: 'goat milk', nodeId: 'en:goat-milk', ancestorNodeIds: ['en:milk'] },
    { displayName: 'egg yolk', nodeId: 'en:egg-yolk', ancestorNodeIds: ['en:egg'] },
  ];
  return { status: 'available', completeness, catalogueVersion: 'fixture', items, names: items.map(({ displayName }) => displayName) };
}

function fixture(repositoryPath: string): object {
  const path = jest.requireActual<{ resolve: (...segments: string[]) => string }>('path');
  const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
  const file = path.resolve(process.cwd(), '..', '..', repositoryPath);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as object;
}
