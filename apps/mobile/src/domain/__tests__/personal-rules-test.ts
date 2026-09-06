import {
  evaluateIngredientRules,
  evaluatePersonalRules,
  IngredientRule,
  ingredientComparisonKey,
  NutrientId,
  NutritionFact,
  NormalizedProductFacts,
  PersonalRule,
  ProductFacts,
  productFactsFromContract,
} from '../personal-rules';

const unavailable = (): NutritionFact => ({ status: 'unavailable' });
const available = (value: number, basis: 'per_100g' | 'per_100ml' = 'per_100g'): NutritionFact => ({
  status: 'available',
  value,
  basis,
});

const nutrition = (
  overrides: Partial<Record<NutrientId, NutritionFact>> = {},
): ProductFacts['nutrition'] => ({
  energy_kcal: unavailable(),
  carbohydrates: available(12),
  sugars: available(4),
  fat: unavailable(),
  saturated_fat: unavailable(),
  fiber: unavailable(),
  protein: unavailable(),
  salt: unavailable(),
  ...overrides,
});

const product = (overrides: Partial<ProductFacts> = {}): ProductFacts => ({
  ingredients: { status: 'available', names: ['water', 'E 955'] },
  nutrition: nutrition(),
  ...overrides,
});

describe('evaluatePersonalRules', () => {
  it('uses locale-stable Unicode normalization for exact ingredient keys', () => {
    expect(ingredientComparisonKey('  Ｅ９５５ ')).toBe('e955');
    expect(ingredientComparisonKey('CAFE\u0301')).toBe(ingredientComparisonKey('café'));
  });

  it.each(['missing', 'unparseable'] as const)(
    'exposes unavailable ingredient rule IDs for %s facts',
    (status) => {
      expect(
        evaluateIngredientRules(
          [{ id: 'custom', kind: 'ingredient', name: 'Apple', source: 'custom' }],
          { status },
        ),
      ).toEqual({ matches: [], unavailableRuleIds: ['custom'], triggerCount: 0, incomplete: true });
    },
  );

  it('matches taxonomy node and subtree selections by stable OFF evidence', () => {
    const ingredients = {
      status: 'available' as const,
      completeness: 'complete' as const,
      names: ['goat milk', 'egg yolk'],
      items: [
        { recognition: 'recognized' as const, displayName: 'goat milk', nodeId: 'en:goat-milk', ancestorNodeIds: ['en:milk'] },
        { recognition: 'recognized' as const, displayName: 'egg yolk', nodeId: 'en:egg-yolk', ancestorNodeIds: ['en:egg'] },
      ],
    };
    const rules: IngredientRule[] = [
      { id: 'milk-node', kind: 'ingredient', source: 'taxonomy', name: 'Mleko', nodeId: 'en:milk', scope: 'node' },
      { id: 'milk-tree', kind: 'ingredient', source: 'taxonomy', name: 'Mleko', nodeId: 'en:milk', scope: 'subtree' },
      { id: 'yolk-node', kind: 'ingredient', source: 'taxonomy', name: 'Żółtko', nodeId: 'en:egg-yolk', scope: 'node' },
    ];

    expect(evaluateIngredientRules(rules, ingredients)).toEqual({
      matches: [
        { ruleId: 'milk-tree', matchedIngredientNames: ['goat milk'] },
        { ruleId: 'yolk-node', matchedIngredientNames: ['egg yolk'] },
      ],
      unavailableRuleIds: [],
      triggerCount: 2,
      incomplete: false,
    });
  });

  it('keeps certain taxonomy matches while marking partial non-matches unavailable', () => {
    const rules: IngredientRule[] = [
      { id: 'milk', kind: 'ingredient', source: 'taxonomy', name: 'Mleko', nodeId: 'en:milk', scope: 'subtree' },
      { id: 'egg', kind: 'ingredient', source: 'taxonomy', name: 'Jajko', nodeId: 'en:egg', scope: 'subtree' },
    ];
    expect(evaluateIngredientRules(rules, {
      status: 'available',
      completeness: 'partial',
      names: ['goat milk'],
      items: [{ recognition: 'recognized' as const, displayName: 'goat milk', nodeId: 'en:goat-milk', ancestorNodeIds: ['en:milk'] }],
    })).toEqual({
      matches: [{ ruleId: 'milk', matchedIngredientNames: ['goat milk'] }],
      unavailableRuleIds: ['egg'],
      triggerCount: 1,
      incomplete: true,
    });
  });

  it('ignores unrecognized items for taxonomy rules but allows exact custom matches', () => {
    const ingredients = {
      status: 'available' as const,
      completeness: 'partial' as const,
      names: ['bacteria'],
      items: [{ recognition: 'unrecognized' as const, displayName: 'bacteria' }],
    };
    expect(evaluateIngredientRules([
      { id: 'taxonomy', kind: 'ingredient', name: 'Bacteria', source: 'taxonomy', nodeId: 'en:bacteria', scope: 'node' },
    ], ingredients)).toMatchObject({ matches: [], unavailableRuleIds: ['taxonomy'], triggerCount: 0, incomplete: true });
    expect(evaluateIngredientRules([
      { id: 'custom', kind: 'ingredient', name: 'Bacteria', source: 'custom' },
    ], ingredients)).toEqual({
      matches: [{ ruleId: 'custom', matchedIngredientNames: ['bacteria'] }],
      unavailableRuleIds: [],
      triggerCount: 1,
      incomplete: true,
    });
  });

  it('matches a custom ingredient only by case-insensitive exact name', () => {
    const rules: PersonalRule[] = [
      { id: 'custom', kind: 'ingredient', name: 'Apple', source: 'custom' },
    ];

    expect(
      evaluatePersonalRules(rules, product({ ingredients: { status: 'available', names: [' apple '] } })),
    ).toMatchObject({ triggerCount: 1 });
    expect(
      evaluatePersonalRules(
        rules,
        product({ ingredients: { status: 'available', names: ['apple juice'] } }),
      ),
    ).toMatchObject({ triggerCount: 0 });
  });

  it.each([
    ['above', 13, 1],
    ['above', 12, 0],
    ['below', 11, 1],
    ['below', 12, 0],
  ] as const)('uses strict %s comparisons for value %s', (direction, value, expected) => {
    const rules: PersonalRule[] = [
      {
        id: 'carbs',
        kind: 'nutrition',
        nutrient: 'carbohydrates',
        direction,
        threshold: 12,
        basis: 'per_100g',
      },
    ];

    expect(
      evaluatePersonalRules(
        rules,
        product({ nutrition: nutrition({ carbohydrates: available(value) }) }),
      ).triggerCount,
    ).toBe(expected);
  });

  it('marks missing values unavailable while evaluating available facts across bases', () => {
    const rules: PersonalRule[] = [
      {
        id: 'missing-sugars',
        kind: 'nutrition',
        nutrient: 'sugars',
        direction: 'above',
        threshold: 5,
        basis: 'per_100g',
      },
      {
        id: 'wrong-basis',
        kind: 'nutrition',
        nutrient: 'carbohydrates',
        direction: 'above',
        threshold: 5,
        basis: 'per_100ml',
      },
    ];

    expect(
      evaluatePersonalRules(
        rules,
        product({
          nutrition: nutrition({
            sugars: unavailable(),
            carbohydrates: available(12, 'per_100g'),
          }),
        }),
      ),
    ).toEqual({
      triggeredRuleIds: ['wrong-basis'],
      unavailableRuleIds: ['missing-sugars'],
      triggerCount: 1,
    });
  });

  it.each(['missing', 'unparseable'] as const)(
    'marks %s ingredient facts unavailable without treating them as an empty list',
    (status) => {
      const rules: PersonalRule[] = [
        { id: 'ingredient', kind: 'ingredient', name: 'water', source: 'custom' },
      ];

      expect(evaluatePersonalRules(rules, product({ ingredients: { status } }))).toEqual({
        triggeredRuleIds: [],
        unavailableRuleIds: ['ingredient'],
        triggerCount: 0,
      });
    },
  );

  it('counts triggered rules rather than ingredient occurrences', () => {
    const rules: PersonalRule[] = [
      {
        id: 'avoid-milk',
        kind: 'ingredient',
        name: 'Mleko',
        source: 'taxonomy',
        nodeId: 'en:milk',
        scope: 'subtree',
      },
      {
        id: 'high-carbs',
        kind: 'nutrition',
        nutrient: 'carbohydrates',
        direction: 'above',
        threshold: 10,
        basis: 'per_100g',
      },
    ];

    expect(
      evaluatePersonalRules(
        rules,
        product({
          ingredients: {
            status: 'available',
            names: ['goat milk', 'sheep milk'],
            items: [
              { recognition: 'recognized' as const, displayName: 'goat milk', nodeId: 'en:goat-milk', ancestorNodeIds: ['en:milk'] },
              { recognition: 'recognized' as const, displayName: 'sheep milk', nodeId: 'en:sheep-milk', ancestorNodeIds: ['en:milk'] },
            ],
          },
        }),
      ),
    ).toMatchObject({ triggerCount: 2, triggeredRuleIds: ['avoid-milk', 'high-carbs'] });
  });

  it('evaluates schema-shaped facts without changing availability or per-value bases', () => {
    const normalized: NormalizedProductFacts = {
      ingredients: { status: 'available', names: ['carbonated water', 'sugar'] },
      nutrition: {
        energy_kcal: { status: 'available', value: 42, unit: 'kcal', basis: 'per_100ml' },
        carbohydrates: { status: 'available', value: 10.6, unit: 'g', basis: 'per_100ml' },
        sugars: { status: 'available', value: 10.6, unit: 'g', basis: 'per_100ml' },
        fat: { status: 'available', value: 0, unit: 'g', basis: 'per_100ml' },
        saturated_fat: { status: 'available', value: 0, unit: 'g', basis: 'per_100ml' },
        fiber: { status: 'unavailable', reason: 'missing_source' },
        protein: { status: 'available', value: 0, unit: 'g', basis: 'per_100ml' },
        salt: { status: 'available', value: 0, unit: 'g', basis: 'per_100ml' },
      },
    };
    const rules: PersonalRule[] = [
      { id: 'sugar', kind: 'ingredient', name: 'sugar', source: 'custom' },
      {
        id: 'sugars-ml',
        kind: 'nutrition',
        nutrient: 'sugars',
        direction: 'above',
        threshold: 10,
        basis: 'per_100ml',
      },
      {
        id: 'sugars-g',
        kind: 'nutrition',
        nutrient: 'sugars',
        direction: 'above',
        threshold: 10,
        basis: 'per_100g',
      },
      {
        id: 'fiber',
        kind: 'nutrition',
        nutrient: 'fiber',
        direction: 'below',
        threshold: 1,
        basis: 'per_100ml',
      },
    ];

    expect(evaluatePersonalRules(rules, productFactsFromContract(normalized))).toEqual({
      triggeredRuleIds: ['sugar', 'sugars-ml', 'sugars-g'],
      unavailableRuleIds: ['fiber'],
      triggerCount: 3,
    });
  });

  it.each(['missing', 'unparseable'] as const)(
    'preserves %s ingredients from schema-shaped facts as unavailable',
    (status) => {
      const normalized: NormalizedProductFacts = {
        ingredients: { status },
        nutrition: Object.fromEntries(
          [
            'energy_kcal',
            'carbohydrates',
            'sugars',
            'fat',
            'saturated_fat',
            'fiber',
            'protein',
            'salt',
          ].map((nutrient) => [nutrient, { status: 'unavailable', reason: 'missing_source' }]),
        ) as NormalizedProductFacts['nutrition'],
      };

      expect(
        evaluatePersonalRules(
          [{ id: 'ingredient', kind: 'ingredient', name: 'sugar', source: 'custom' }],
          productFactsFromContract(normalized),
        ),
      ).toMatchObject({ unavailableRuleIds: ['ingredient'], triggerCount: 0 });
    },
  );
});
