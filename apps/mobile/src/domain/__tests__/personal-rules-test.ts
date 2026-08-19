import {
  evaluatePersonalRules,
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
  it('matches a predefined ingredient by a known alias', () => {
    const rules: PersonalRule[] = [
      {
        id: 'avoid-sucralose',
        kind: 'ingredient',
        name: 'sucralose',
        source: 'predefined',
        aliases: ['E955', 'E 955'],
      },
    ];

    expect(evaluatePersonalRules(rules, product()).triggeredRuleIds).toEqual([
      'avoid-sucralose',
    ]);
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

  it('marks missing values and mismatched bases unavailable without triggering', () => {
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
      triggeredRuleIds: [],
      unavailableRuleIds: ['missing-sugars', 'wrong-basis'],
      triggerCount: 0,
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
        id: 'avoid-sucralose',
        kind: 'ingredient',
        name: 'sucralose',
        source: 'predefined',
        aliases: ['E 955'],
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
          ingredients: { status: 'available', names: ['sucralose', 'E 955', 'E 955'] },
        }),
      ),
    ).toMatchObject({ triggerCount: 2, triggeredRuleIds: ['avoid-sucralose', 'high-carbs'] });
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
      triggeredRuleIds: ['sugar', 'sugars-ml'],
      unavailableRuleIds: ['sugars-g', 'fiber'],
      triggerCount: 2,
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
