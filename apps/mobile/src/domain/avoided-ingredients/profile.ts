import { SelectionScope } from '../ingredient-catalogue';
import { IngredientRule, ingredientComparisonKey } from '../personal-rules';

export const MAX_CUSTOM_INGREDIENT_LENGTH = 80;
export type TaxonomySelection = {
  nodeId: string;
  labelPl: string;
  scope: SelectionScope;
  ancestorNodeIds: readonly string[];
};
export type CustomIngredient = { id: string; name: string };
export type AvoidedIngredientProfile = { selections: readonly TaxonomySelection[]; customIngredients: readonly CustomIngredient[] };
export type IngredientRuleDescriptor = { rule: IngredientRule; label: string };
export type ProfileValidationErrorCode = 'blank_name' | 'name_too_long' | 'duplicate_name' | 'duplicate_id' | 'invalid_selection';
export type ProfileValidationError = { code: ProfileValidationErrorCode; fieldId?: string; conflictingId?: string };
export type ProfileMutationResult = { ok: true; profile: AvoidedIngredientProfile } | { ok: false; error: ProfileValidationError };

export const emptyAvoidedIngredientProfile = (): AvoidedIngredientProfile => ({ selections: [], customIngredients: [] });

export function validateAvoidedIngredientProfile(profile: AvoidedIngredientProfile): ProfileValidationError | null {
  const nodes = new Set<string>();
  for (const selection of profile.selections) {
    if (!selection.nodeId.includes(':') || !selection.labelPl.trim() || !['node', 'subtree'].includes(selection.scope)) return { code: 'invalid_selection', fieldId: selection.nodeId };
    if (nodes.has(selection.nodeId)) return { code: 'duplicate_id', fieldId: selection.nodeId };
    nodes.add(selection.nodeId);
  }
  const ids = new Set<string>(); const names = new Map<string, string>();
  for (const custom of profile.customIngredients) {
    if (!custom.id || ids.has(custom.id)) return { code: 'duplicate_id', fieldId: custom.id };
    ids.add(custom.id); const error = validateCustomName(custom.name, names);
    if (error) return { ...error, fieldId: custom.id };
    names.set(ingredientComparisonKey(custom.name), custom.id);
  }
  return null;
}

export function selectTaxonomyIngredient(profile: AvoidedIngredientProfile, selection: Omit<TaxonomySelection, 'ancestorNodeIds'>, ancestorIds: readonly string[] = []) {
  const covering = profile.selections.find((saved) => saved.scope === 'subtree' && ancestorIds.includes(saved.nodeId));
  if (covering) return { profile, consolidated: [selection.nodeId] as readonly string[] };
  const same = profile.selections.filter((saved) => saved.nodeId === selection.nodeId).map((saved) => saved.nodeId);
  return {
    profile: {
      ...profile,
      selections: [
        ...profile.selections.filter((saved) => !same.includes(saved.nodeId)),
        { ...selection, labelPl: selection.labelPl.trim(), ancestorNodeIds: [...ancestorIds] },
      ],
    },
    consolidated: same.filter((id) => id !== selection.nodeId),
  };
}
export function removeTaxonomySelection(profile: AvoidedIngredientProfile, nodeId: string): AvoidedIngredientProfile { return { ...profile, selections: profile.selections.filter((item) => item.nodeId !== nodeId) }; }
export function addCustomIngredient(profile: AvoidedIngredientProfile, ingredient: CustomIngredient): ProfileMutationResult {
  if (!ingredient.id || profile.customIngredients.some(({ id }) => id === ingredient.id)) return { ok: false, error: { code: 'duplicate_id', fieldId: ingredient.id } };
  const error = validateCustomName(ingredient.name, customNameIndex(profile.customIngredients)); if (error) return { ok: false, error: { ...error, fieldId: ingredient.id } };
  return { ok: true, profile: { ...profile, customIngredients: [...profile.customIngredients, { ...ingredient, name: ingredient.name.trim() }] } };
}
export function renameCustomIngredient(profile: AvoidedIngredientProfile, id: string, name: string): ProfileMutationResult {
  if (!profile.customIngredients.some((item) => item.id === id)) return { ok: true, profile };
  const error = validateCustomName(name, customNameIndex(profile.customIngredients.filter((item) => item.id !== id))); if (error) return { ok: false, error: { ...error, fieldId: id } };
  return { ok: true, profile: { ...profile, customIngredients: profile.customIngredients.map((item) => item.id === id ? { ...item, name: name.trim() } : item) } };
}
export function deleteCustomIngredient(profile: AvoidedIngredientProfile, id: string): AvoidedIngredientProfile { return { ...profile, customIngredients: profile.customIngredients.filter((item) => item.id !== id) }; }
export function profileToIngredientRules(profile: AvoidedIngredientProfile): IngredientRule[] { return profileToIngredientRuleDescriptors(profile).map(({ rule }) => rule); }
export function profileToIngredientRuleDescriptors(profile: AvoidedIngredientProfile): IngredientRuleDescriptor[] {
  const error = validateAvoidedIngredientProfile(profile); if (error) throw new Error(`Invalid avoided ingredient profile: ${error.code}`);
  return [
    ...profile.selections.map((selection) => ({
      label: selection.labelPl,
      rule: {
        id: `taxonomy:${selection.nodeId}`,
        kind: 'ingredient' as const,
        name: selection.labelPl,
        source: 'taxonomy' as const,
        nodeId: selection.nodeId,
        scope: selection.scope,
      },
    })),
    ...profile.customIngredients.map((ingredient) => ({
      label: ingredient.name,
      rule: {
        id: `custom:${ingredient.id}`,
        kind: 'ingredient' as const,
        name: ingredient.name,
        source: 'custom' as const,
      },
    })),
  ];
}
function customNameIndex(items: readonly CustomIngredient[]) { return new Map(items.map(({ id, name }) => [ingredientComparisonKey(name), id])); }
function validateCustomName(name: string, names: ReadonlyMap<string, string>): Omit<ProfileValidationError, 'fieldId'> | null {
  const trimmed = name.trim(); if (!trimmed) return { code: 'blank_name' };
  if (Array.from(trimmed).length > MAX_CUSTOM_INGREDIENT_LENGTH) return { code: 'name_too_long' };
  const duplicate = names.get(ingredientComparisonKey(trimmed)); return duplicate ? { code: 'duplicate_name', conflictingId: duplicate } : null;
}
