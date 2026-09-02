import {
  profileToIngredientRuleDescriptors,
} from '@/domain/avoided-ingredients/profile';
import { evaluateIngredientRules } from '@/domain/personal-rules';
import {
  activeProfileFromState,
  PersonalProfileState,
} from '@/features/personal-profile/profile-store';

import { ProductLookupState } from './lookup-state-machine';

export type TriggeredIngredientWarning = {
  ruleId: string;
  ruleLabel: string;
  matchedIngredientNames: readonly string[];
};

export type IngredientWarningComposition =
  | { kind: 'not_applicable' }
  | { kind: 'profile_loading' }
  | { kind: 'profile_error'; error: 'corrupt' | 'storage' }
  | { kind: 'no_rules' }
  | { kind: 'ingredients_unavailable'; reason: 'missing' | 'unparseable'; ruleCount: number }
  | { kind: 'incomplete'; ruleCount: number }
  | { kind: 'no_triggers'; ruleCount: number }
  | {
      kind: 'triggered';
      ruleCount: number;
      triggerCount: number;
      incomplete: boolean;
      warnings: readonly TriggeredIngredientWarning[];
      matchedIngredientNames: readonly string[];
    };

export function composeIngredientWarnings(
  lookupState: ProductLookupState,
  profileState: PersonalProfileState,
): IngredientWarningComposition {
  if (
    lookupState.status !== 'resolved'
    || lookupState.result.outcome !== 'found'
  ) {
    return { kind: 'not_applicable' };
  }

  if (profileState.status === 'hydrating') return { kind: 'profile_loading' };
  if (profileState.status === 'load_error') {
    return { kind: 'profile_error', error: profileState.error };
  }

  const profile = activeProfileFromState(profileState);
  if (!profile) return { kind: 'profile_loading' };

  const descriptors = profileToIngredientRuleDescriptors(profile);
  if (descriptors.length === 0) return { kind: 'no_rules' };

  const ingredients = lookupState.result.product.ingredients;
  if (ingredients.status !== 'available') {
    return {
      kind: 'ingredients_unavailable',
      reason: ingredients.status,
      ruleCount: descriptors.length,
    };
  }

  const evaluation = evaluateIngredientRules(
    descriptors.map(({ rule }) => rule),
    {
      status: 'available',
      names: ingredients.names,
      completeness: ingredients.completeness,
      items: ingredients.items,
    },
  );
  if (evaluation.triggerCount === 0) {
    return evaluation.incomplete
      ? { kind: 'incomplete', ruleCount: descriptors.length }
      : { kind: 'no_triggers', ruleCount: descriptors.length };
  }

  const labelsByRuleId = new Map(
    descriptors.map(({ label, rule }) => [rule.id, label]),
  );
  const warnings = evaluation.matches.map((match) => ({
    ...match,
    ruleLabel: labelsByRuleId.get(match.ruleId)!,
  }));

  return {
    kind: 'triggered',
    ruleCount: descriptors.length,
    triggerCount: evaluation.triggerCount,
    incomplete: evaluation.incomplete,
    warnings,
    matchedIngredientNames: [
      ...new Set(warnings.flatMap(({ matchedIngredientNames }) => matchedIngredientNames)),
    ],
  };
}
