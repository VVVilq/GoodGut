export type NutritionBasis = 'per_100g' | 'per_100ml';

export type NutrientId =
  | 'energy_kcal'
  | 'carbohydrates'
  | 'sugars'
  | 'fat'
  | 'saturated_fat'
  | 'fiber'
  | 'protein'
  | 'salt';

export type IngredientRule = {
  id: string;
  kind: 'ingredient';
  name: string;
  source: 'predefined' | 'custom';
  aliases?: readonly string[];
};

export type NutritionRule = {
  id: string;
  kind: 'nutrition';
  nutrient: NutrientId;
  direction: 'above' | 'below';
  threshold: number;
  basis: NutritionBasis;
};

export type PersonalRule = IngredientRule | NutritionRule;

export type IngredientFacts =
  | { status: 'available'; names: readonly string[] }
  | { status: 'missing' | 'unparseable' };

export type NutritionFact =
  | { status: 'available'; value: number; basis: NutritionBasis }
  | { status: 'unavailable' };

export type ProductFacts = {
  ingredients: IngredientFacts;
  nutrition: Readonly<Record<NutrientId, NutritionFact>>;
};

export type RuleEvaluation = {
  triggeredRuleIds: string[];
  unavailableRuleIds: string[];
  triggerCount: number;
};

const normalizeIngredient = (value: string) => value.trim().toLocaleLowerCase();

function ingredientTriggers(rule: IngredientRule, ingredients: readonly string[]): boolean {
  const productIngredients = new Set(ingredients.map(normalizeIngredient));
  const candidates =
    rule.source === 'predefined' ? [rule.name, ...(rule.aliases ?? [])] : [rule.name];

  return candidates.map(normalizeIngredient).some((candidate) => productIngredients.has(candidate));
}

export function evaluatePersonalRules(
  rules: readonly PersonalRule[],
  product: ProductFacts,
): RuleEvaluation {
  const triggeredRuleIds: string[] = [];
  const unavailableRuleIds: string[] = [];

  for (const rule of rules) {
    if (rule.kind === 'ingredient') {
      if (product.ingredients.status !== 'available') {
        unavailableRuleIds.push(rule.id);
      } else if (ingredientTriggers(rule, product.ingredients.names)) {
        triggeredRuleIds.push(rule.id);
      }
      continue;
    }

    const fact = product.nutrition[rule.nutrient];
    if (fact.status !== 'available' || fact.basis !== rule.basis) {
      unavailableRuleIds.push(rule.id);
      continue;
    }

    const triggered =
      rule.direction === 'above' ? fact.value > rule.threshold : fact.value < rule.threshold;
    if (triggered) {
      triggeredRuleIds.push(rule.id);
    }
  }

  return {
    triggeredRuleIds,
    unavailableRuleIds,
    triggerCount: triggeredRuleIds.length,
  };
}
