import { profileToPersonalRules } from '@/domain/personal-profile';
import {
  evaluateIngredientRules,
  evaluatePersonalRules,
  NutritionRule,
  productFactsFromContract,
} from '@/domain/personal-rules';
import { NutritionFact, NutritionUnavailableReason } from '@/domain/product-lookup/types';
import { activeProfileFromState, PersonalProfileState } from '@/features/personal-profile/profile-store';

import { TriggeredIngredientWarning } from './ingredient-warning-composition';
import { ProductLookupState } from './lookup-state-machine';

export type TriggeredNutritionWarning = {
  rule: NutritionRule;
  fact: Extract<NutritionFact, { status: 'available' }>;
};

export type UnavailablePersonalRule =
  | {
      kind: 'ingredient';
      ruleId: string;
      ruleLabel: string;
      reason: 'missing' | 'unparseable' | 'partial';
    }
  | { kind: 'nutrition'; rule: NutritionRule; reason: NutritionUnavailableReason };

export type PersonalWarningComposition =
  | { kind: 'not_applicable' }
  | { kind: 'profile_loading' }
  | { kind: 'profile_error'; error: 'corrupt' | 'storage' }
  | { kind: 'no_rules' }
  | {
      kind: 'evaluated';
      ruleCount: number;
      triggeredRuleIds: readonly string[];
      triggerCount: number;
      ingredientWarnings: readonly TriggeredIngredientWarning[];
      matchedIngredientNames: readonly string[];
      nutritionWarnings: readonly TriggeredNutritionWarning[];
      unavailableRules: readonly UnavailablePersonalRule[];
      ingredientSourceIncomplete: boolean;
      incomplete: boolean;
    };

export function composePersonalWarnings(
  lookupState: ProductLookupState,
  profileState: PersonalProfileState,
): PersonalWarningComposition {
  if (lookupState.status !== 'resolved' || lookupState.result.outcome !== 'found') {
    return { kind: 'not_applicable' };
  }
  if (profileState.status === 'hydrating') return { kind: 'profile_loading' };
  if (profileState.status === 'load_error') {
    return { kind: 'profile_error', error: profileState.error };
  }
  const profile = activeProfileFromState(profileState);
  if (!profile) return { kind: 'profile_loading' };

  const rules = profileToPersonalRules(profile);
  if (rules.length === 0) return { kind: 'no_rules' };

  const product = lookupState.result.product;
  const evaluation = evaluatePersonalRules(rules, productFactsFromContract(product));
  const triggeredIds = new Set(evaluation.triggeredRuleIds);
  const unavailableIds = new Set(evaluation.unavailableRuleIds);
  const ingredientRules = rules.filter((rule) => rule.kind === 'ingredient');
  const ingredientEvaluation = evaluateIngredientRules(ingredientRules, product.ingredients);
  const labels = new Map(ingredientRules.map((rule) => [rule.id, rule.name]));
  const ingredientWarnings = ingredientEvaluation.matches.map((match) => ({
    ...match,
    ruleLabel: labels.get(match.ruleId)!,
  }));
  const nutritionWarnings: TriggeredNutritionWarning[] = [];
  const unavailableRules: UnavailablePersonalRule[] = [];

  for (const rule of rules) {
    if (rule.kind === 'ingredient') {
      if (unavailableIds.has(rule.id)) {
        unavailableRules.push({
          kind: 'ingredient',
          ruleId: rule.id,
          ruleLabel: rule.name,
          reason: product.ingredients.status === 'available' ? 'partial' : product.ingredients.status,
        });
      }
      continue;
    }
    const fact = product.nutrition[rule.nutrient];
    if (triggeredIds.has(rule.id) && fact.status === 'available') {
      nutritionWarnings.push({ rule, fact });
    }
    if (unavailableIds.has(rule.id)) {
      if (fact.status === 'unavailable') unavailableRules.push({ kind: 'nutrition', rule, reason: fact.reason });
    }
  }

  // Source completeness matters to the summary only when ingredient rules exist.
  const ingredientSourceIncomplete = ingredientRules.length > 0 && ingredientEvaluation.incomplete;
  return {
    kind: 'evaluated',
    ruleCount: rules.length,
    triggeredRuleIds: evaluation.triggeredRuleIds,
    triggerCount: evaluation.triggerCount,
    ingredientWarnings,
    matchedIngredientNames: [...new Set(ingredientWarnings.flatMap((warning) => warning.matchedIngredientNames))],
    nutritionWarnings,
    unavailableRules,
    ingredientSourceIncomplete,
    incomplete: ingredientSourceIncomplete || unavailableRules.length > 0,
  };
}
