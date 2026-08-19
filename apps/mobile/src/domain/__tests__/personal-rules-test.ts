import {
  evaluatePersonalRules,
  NutrientId,
  NutritionFact,
  PersonalRule,
  ProductFacts,
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
});
