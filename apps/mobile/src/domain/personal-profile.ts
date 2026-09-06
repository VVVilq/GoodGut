import {
  AvoidedIngredientProfile,
  emptyAvoidedIngredientProfile,
  profileToIngredientRules,
  ProfileValidationError,
  validateAvoidedIngredientProfile,
} from './avoided-ingredients/profile';
import {
  isNutrientId,
  isNutritionDirection,
  NutrientId,
  nutrientOrder,
  NutritionBasis,
  NutritionDirection,
} from './nutrition';
import { NutritionRule, PersonalRule } from './personal-rules';

export type NutritionThreshold = Readonly<{
  id: string;
  nutrient: NutrientId;
  direction: NutritionDirection;
  threshold: number;
  /** Legacy schema-v3 field; ignored by evaluation and omitted from schema-v4 documents. */
  basis?: NutritionBasis;
}>;

export type PersonalProfile = AvoidedIngredientProfile & {
  nutritionThresholds: readonly NutritionThreshold[];
};

export type NutritionThresholdValidationErrorCode =
  | 'duplicate_nutrient'
  | 'invalid_nutrient'
  | 'invalid_direction'
  | 'invalid_threshold'
  | 'invalid_nutrition_id';

export type NutritionThresholdValidationError = Readonly<{
  code: NutritionThresholdValidationErrorCode;
  fieldId?: string;
  conflictingId?: string;
}>;

export type PersonalProfileValidationError =
  | { section: 'ingredients'; error: ProfileValidationError }
  | { section: 'nutrition'; error: NutritionThresholdValidationError };

export type NutritionThresholdInputError =
  | 'blank_threshold'
  | 'invalid_threshold'
  | 'negative_threshold';

export type NutritionThresholdMutationResult =
  | { ok: true; profile: PersonalProfile }
  | { ok: false; error: NutritionThresholdValidationError };

export const emptyPersonalProfile = (): PersonalProfile => ({
  ...emptyAvoidedIngredientProfile(),
  nutritionThresholds: [],
});

export const clonePersonalProfile = (profile: PersonalProfile): PersonalProfile => ({
  selections: profile.selections.map((item) => ({ ...item, ancestorNodeIds: [...item.ancestorNodeIds] })),
  customIngredients: profile.customIngredients.map((item) => ({ ...item })),
  nutritionThresholds: profile.nutritionThresholds.map((item) => ({ ...item })),
});

export const nutritionRuleId = (nutrient: NutrientId) => `nutrition:${nutrient}`;

export function parseNutritionThresholdInput(
  input: string,
): { ok: true; value: number } | { ok: false; error: NutritionThresholdInputError } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'blank_threshold' };
  if (trimmed.startsWith('-')) return { ok: false, error: 'negative_threshold' };
  if (!/^\d+(?:[.,]\d+)?$/.test(trimmed)) {
    return { ok: false, error: 'invalid_threshold' };
  }

  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value)
    ? { ok: true, value }
    : { ok: false, error: 'invalid_threshold' };
}

export function validateNutritionThresholds(
  thresholds: readonly NutritionThreshold[],
): NutritionThresholdValidationError | null {
  const nutrients = new Map<NutrientId, string>();

  for (const rule of thresholds) {
    if (!isNutrientId(rule.nutrient)) {
      return { code: 'invalid_nutrient', fieldId: rule.id };
    }
    const conflictingId = nutrients.get(rule.nutrient);
    if (conflictingId) {
      return { code: 'duplicate_nutrient', fieldId: rule.id, conflictingId };
    }
    nutrients.set(rule.nutrient, rule.id);
    if (!rule.id || rule.id !== nutritionRuleId(rule.nutrient)) {
      return { code: 'invalid_nutrition_id', fieldId: rule.id };
    }
    if (!isNutritionDirection(rule.direction)) {
      return { code: 'invalid_direction', fieldId: rule.id };
    }
    if (!Number.isFinite(rule.threshold) || rule.threshold < 0) {
      return { code: 'invalid_threshold', fieldId: rule.id };
    }
  }

  return null;
}

export function validatePersonalProfile(profile: PersonalProfile): PersonalProfileValidationError | null {
  const ingredientError = validateAvoidedIngredientProfile(profile);
  if (ingredientError) return { section: 'ingredients', error: ingredientError };
  const nutritionError = validateNutritionThresholds(profile.nutritionThresholds);
  return nutritionError ? { section: 'nutrition', error: nutritionError } : null;
}

export function addNutritionThreshold(
  profile: PersonalProfile,
  input: Omit<NutritionThreshold, 'id'>,
): NutritionThresholdMutationResult {
  const rule: NutritionThreshold = { ...input, id: nutritionRuleId(input.nutrient) };
  return withValidatedThresholds(profile, [...profile.nutritionThresholds, rule]);
}

export function updateNutritionThreshold(
  profile: PersonalProfile,
  nutrient: NutrientId,
  changes: Partial<Pick<NutritionThreshold, 'direction' | 'threshold' | 'basis'>>,
): NutritionThresholdMutationResult {
  if (!profile.nutritionThresholds.some((rule) => rule.nutrient === nutrient)) {
    return { ok: true, profile };
  }
  return withValidatedThresholds(
    profile,
    profile.nutritionThresholds.map((rule) =>
      rule.nutrient === nutrient ? { ...rule, ...changes } : rule,
    ),
  );
}

export function removeNutritionThreshold(
  profile: PersonalProfile,
  nutrient: NutrientId,
): PersonalProfile {
  return {
    ...profile,
    nutritionThresholds: profile.nutritionThresholds.filter((rule) => rule.nutrient !== nutrient),
  };
}

export function profileToPersonalRules(profile: PersonalProfile): PersonalRule[] {
  const error = validatePersonalProfile(profile);
  if (error) throw new Error(`Invalid personal profile: ${error.section}:${error.error.code}`);

  const nutritionRules: NutritionRule[] = ordered(profile.nutritionThresholds).map(({ id, nutrient, direction, threshold }) => ({
    id,
    kind: 'nutrition',
    nutrient,
    direction,
    threshold,
  }));
  return [...profileToIngredientRules(profile), ...nutritionRules];
}

function withValidatedThresholds(
  profile: PersonalProfile,
  thresholds: readonly NutritionThreshold[],
): NutritionThresholdMutationResult {
  const nutritionThresholds = ordered(thresholds);
  const error = validateNutritionThresholds(nutritionThresholds);
  return error
    ? { ok: false, error }
    : { ok: true, profile: { ...profile, nutritionThresholds } };
}

function ordered(thresholds: readonly NutritionThreshold[]) {
  return [...thresholds].sort((left, right) =>
    nutrientOrder(left.nutrient) - nutrientOrder(right.nutrient),
  );
}
