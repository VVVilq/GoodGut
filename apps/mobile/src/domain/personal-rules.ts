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
} & ({
  source: 'taxonomy';
  nodeId: string;
  scope: 'node' | 'subtree';
} | {
  source: 'custom';
});

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
  | {
      status: 'available';
      names: readonly string[];
      completeness?: 'complete' | 'partial';
      items?: readonly IngredientEvidenceItem[];
    }
  | { status: 'missing' | 'unparseable' };

export type IngredientEvidenceItem = {
  displayName: string;
  nodeId: string;
  ancestorNodeIds: readonly string[];
};

export type NutritionFact =
  | { status: 'available'; value: number; basis: NutritionBasis }
  | { status: 'unavailable' };

export type ProductFacts = {
  ingredients: IngredientFacts;
  nutrition: Readonly<Record<NutrientId, NutritionFact>>;
};

export type ContractNutritionFact =
  | { status: 'available'; value: number; unit: 'kcal' | 'g'; basis: NutritionBasis }
  | {
      status: 'unavailable';
      reason: 'missing_source' | 'unknown_basis' | 'invalid_value' | 'unsupported_unit';
    };

export type NormalizedProductFacts = {
  ingredients: IngredientFacts;
  nutrition: Readonly<Record<NutrientId, ContractNutritionFact>>;
};

export type RuleEvaluation = {
  triggeredRuleIds: string[];
  unavailableRuleIds: string[];
  triggerCount: number;
};

export type IngredientRuleMatch = {
  ruleId: string;
  matchedIngredientNames: readonly string[];
};

export type IngredientRuleEvaluation = {
  matches: readonly IngredientRuleMatch[];
  unavailableRuleIds: readonly string[];
  triggerCount: number;
  incomplete: boolean;
};

export const ingredientComparisonKey = (value: string) =>
  value.normalize('NFKC').trim().toLowerCase();

export function productFactsFromContract(product: NormalizedProductFacts): ProductFacts {
  return {
    ingredients: product.ingredients,
    nutrition: Object.fromEntries(
      Object.entries(product.nutrition).map(([nutrient, fact]) => [
        nutrient,
        fact.status === 'available'
          ? { status: 'available', value: fact.value, basis: fact.basis }
          : { status: 'unavailable' },
      ]),
    ) as Record<NutrientId, NutritionFact>,
  };
}

function matchingIngredientNames(
  rule: IngredientRule,
  ingredients: Extract<IngredientFacts, { status: 'available' }>,
): string[] {
  if (rule.source === 'taxonomy') {
    return [...new Set(
      (ingredients.items ?? [])
        .filter((item) => rule.scope === 'node'
          ? item.nodeId === rule.nodeId
          : item.nodeId === rule.nodeId || item.ancestorNodeIds.includes(rule.nodeId))
        .map((item) => item.displayName),
    )];
  }
  const candidateKey = ingredientComparisonKey(rule.name);

  return [...new Set(
    ingredients.names.filter((ingredient) => candidateKey === ingredientComparisonKey(ingredient)),
  )];
}

export function evaluateIngredientRules(
  rules: readonly IngredientRule[],
  ingredients: IngredientFacts,
): IngredientRuleEvaluation {
  if (ingredients.status !== 'available') {
    return {
      matches: [],
      unavailableRuleIds: rules.map((rule) => rule.id),
      triggerCount: 0,
      incomplete: true,
    };
  }

  const matches = rules.flatMap((rule): IngredientRuleMatch[] => {
    const matchedIngredientNames = matchingIngredientNames(rule, ingredients);
    return matchedIngredientNames.length > 0 ? [{ ruleId: rule.id, matchedIngredientNames }] : [];
  });

  const incomplete = ingredients.completeness === 'partial';
  const matchedRuleIds = new Set(matches.map(({ ruleId }) => ruleId));
  return {
    matches,
    unavailableRuleIds: incomplete
      ? rules.filter(({ id }) => !matchedRuleIds.has(id)).map(({ id }) => id)
      : [],
    triggerCount: matches.length,
    incomplete,
  };
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
      } else if (matchingIngredientNames(rule, product.ingredients).length > 0) {
        triggeredRuleIds.push(rule.id);
      } else if (product.ingredients.completeness === 'partial') {
        unavailableRuleIds.push(rule.id);
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
