import { IngredientRule, ingredientComparisonKey } from '../personal-rules';
import {
  findPredefinedIngredient,
  predefinedIngredients,
  predefinedIngredientTokens,
} from './catalog';

export const MAX_CUSTOM_INGREDIENT_LENGTH = 80;

export type CustomIngredient = {
  id: string;
  name: string;
};

export type AvoidedIngredientProfile = {
  selectedPredefinedIds: readonly string[];
  customIngredients: readonly CustomIngredient[];
};

export type IngredientRuleDescriptor = {
  rule: IngredientRule;
  label: string;
};

export type ProfileValidationErrorCode =
  | 'blank_name'
  | 'name_too_long'
  | 'duplicate_name'
  | 'reserved_name'
  | 'duplicate_id'
  | 'unknown_predefined';

export type ProfileValidationError = {
  code: ProfileValidationErrorCode;
  fieldId?: string;
  conflictingId?: string;
};

export type ProfileMutationResult =
  | { ok: true; profile: AvoidedIngredientProfile }
  | { ok: false; error: ProfileValidationError };

export const emptyAvoidedIngredientProfile = (): AvoidedIngredientProfile => ({
  selectedPredefinedIds: [],
  customIngredients: [],
});

const reservedTokens = new Map<string, string>();
for (const ingredient of predefinedIngredients) {
  for (const token of predefinedIngredientTokens(ingredient)) {
    reservedTokens.set(token, ingredient.id);
  }
}

export function validateAvoidedIngredientProfile(
  profile: AvoidedIngredientProfile,
): ProfileValidationError | null {
  const selected = new Set<string>();
  for (const id of profile.selectedPredefinedIds) {
    if (!findPredefinedIngredient(id)) return { code: 'unknown_predefined', fieldId: id };
    if (selected.has(id)) return { code: 'duplicate_id', fieldId: id };
    selected.add(id);
  }

  const customIds = new Set<string>();
  const customNames = new Map<string, string>();
  for (const custom of profile.customIngredients) {
    if (!custom.id || customIds.has(custom.id)) return { code: 'duplicate_id', fieldId: custom.id };
    customIds.add(custom.id);
    const nameError = validateCustomName(custom.name, customNames);
    if (nameError) return { ...nameError, fieldId: custom.id };
    customNames.set(ingredientComparisonKey(custom.name), custom.id);
  }
  return null;
}

export function selectPredefinedIngredient(
  profile: AvoidedIngredientProfile,
  id: string,
): ProfileMutationResult {
  if (!findPredefinedIngredient(id)) return { ok: false, error: { code: 'unknown_predefined', fieldId: id } };
  if (profile.selectedPredefinedIds.includes(id)) return { ok: true, profile };
  return { ok: true, profile: { ...profile, selectedPredefinedIds: [...profile.selectedPredefinedIds, id] } };
}

export function deselectPredefinedIngredient(
  profile: AvoidedIngredientProfile,
  id: string,
): AvoidedIngredientProfile {
  return { ...profile, selectedPredefinedIds: profile.selectedPredefinedIds.filter((value) => value !== id) };
}

export function addCustomIngredient(
  profile: AvoidedIngredientProfile,
  ingredient: CustomIngredient,
): ProfileMutationResult {
  if (!ingredient.id || profile.customIngredients.some(({ id }) => id === ingredient.id)) {
    return { ok: false, error: { code: 'duplicate_id', fieldId: ingredient.id } };
  }
  const names = customNameIndex(profile.customIngredients);
  const nameError = validateCustomName(ingredient.name, names);
  if (nameError) return { ok: false, error: { ...nameError, fieldId: ingredient.id } };
  return {
    ok: true,
    profile: {
      ...profile,
      customIngredients: [...profile.customIngredients, { ...ingredient, name: ingredient.name.trim() }],
    },
  };
}

export function renameCustomIngredient(
  profile: AvoidedIngredientProfile,
  id: string,
  name: string,
): ProfileMutationResult {
  const current = profile.customIngredients.find((ingredient) => ingredient.id === id);
  if (!current) return { ok: true, profile };
  const names = customNameIndex(profile.customIngredients.filter((ingredient) => ingredient.id !== id));
  const nameError = validateCustomName(name, names);
  if (nameError) return { ok: false, error: { ...nameError, fieldId: id } };
  return {
    ok: true,
    profile: {
      ...profile,
      customIngredients: profile.customIngredients.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, name: name.trim() } : ingredient,
      ),
    },
  };
}

export function deleteCustomIngredient(
  profile: AvoidedIngredientProfile,
  id: string,
): AvoidedIngredientProfile {
  return { ...profile, customIngredients: profile.customIngredients.filter((value) => value.id !== id) };
}

export function profileToIngredientRules(profile: AvoidedIngredientProfile): IngredientRule[] {
  return profileToIngredientRuleDescriptors(profile).map(({ rule }) => rule);
}

export function profileToIngredientRuleDescriptors(
  profile: AvoidedIngredientProfile,
): IngredientRuleDescriptor[] {
  const error = validateAvoidedIngredientProfile(profile);
  if (error) throw new Error(`Invalid avoided ingredient profile: ${error.code}`);

  return [
    ...profile.selectedPredefinedIds.map((id): IngredientRuleDescriptor => {
      const ingredient = findPredefinedIngredient(id)!;
      return {
        label: ingredient.labelPl,
        rule: {
          id: `predefined:${id}`,
          kind: 'ingredient',
          name: ingredient.canonicalName,
          source: 'predefined',
          aliases: ingredient.aliases,
        },
      };
    }),
    ...profile.customIngredients.map((ingredient): IngredientRuleDescriptor => ({
      label: ingredient.name,
      rule: {
        id: `custom:${ingredient.id}`,
        kind: 'ingredient',
        name: ingredient.name,
        source: 'custom',
      },
    })),
  ];
}

function customNameIndex(ingredients: readonly CustomIngredient[]): Map<string, string> {
  return new Map(ingredients.map(({ id, name }) => [ingredientComparisonKey(name), id]));
}

function validateCustomName(
  name: string,
  customNames: ReadonlyMap<string, string>,
): Omit<ProfileValidationError, 'fieldId'> | null {
  const trimmed = name.trim();
  if (!trimmed) return { code: 'blank_name' };
  if (Array.from(trimmed).length > MAX_CUSTOM_INGREDIENT_LENGTH) return { code: 'name_too_long' };
  const key = ingredientComparisonKey(trimmed);
  const reserved = reservedTokens.get(key);
  if (reserved) return { code: 'reserved_name', conflictingId: reserved };
  const duplicate = customNames.get(key);
  if (duplicate) return { code: 'duplicate_name', conflictingId: duplicate };
  return null;
}
