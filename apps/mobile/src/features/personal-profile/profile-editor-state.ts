import {
  addCustomIngredient,
  AvoidedIngredientProfile,
  deleteCustomIngredient,
  deselectPredefinedIngredient,
  ProfileValidationError,
  renameCustomIngredient,
  selectPredefinedIngredient,
} from '@/domain/avoided-ingredients/profile';
import {
  avoidedIngredientCategories,
  PredefinedIngredient,
  predefinedIngredients,
} from '@/domain/avoided-ingredients/catalog';
import { ingredientComparisonKey } from '@/domain/personal-rules';

export type ProfileEditorState = {
  active: AvoidedIngredientProfile;
  draft: AvoidedIngredientProfile;
  fieldErrors: Readonly<Record<string, ProfileValidationError>>;
};

export type CatalogueSection = { title: string; data: readonly PredefinedIngredient[] };

export function createProfileEditorState(active: AvoidedIngredientProfile): ProfileEditorState {
  return { active, draft: cloneProfile(active), fieldErrors: {} };
}

export function isProfileDraftDirty(state: ProfileEditorState): boolean {
  return JSON.stringify(state.active) !== JSON.stringify(state.draft);
}

export function togglePredefined(state: ProfileEditorState, id: string): ProfileEditorState {
  if (state.draft.selectedPredefinedIds.includes(id)) {
    return { ...state, draft: deselectPredefinedIngredient(state.draft, id) };
  }
  const result = selectPredefinedIngredient(state.draft, id);
  return result.ok ? { ...state, draft: result.profile } : state;
}

export function addCustom(state: ProfileEditorState, id: string, name: string): ProfileEditorState {
  const result = addCustomIngredient(state.draft, { id, name });
  if (result.ok) return { ...state, draft: result.profile, fieldErrors: withoutError(state.fieldErrors, id) };
  return { ...state, fieldErrors: { ...state.fieldErrors, [id]: result.error } };
}

export function renameCustom(state: ProfileEditorState, id: string, name: string): ProfileEditorState {
  const result = renameCustomIngredient(state.draft, id, name);
  if (result.ok) return { ...state, draft: result.profile, fieldErrors: withoutError(state.fieldErrors, id) };
  return { ...state, fieldErrors: { ...state.fieldErrors, [id]: result.error } };
}

export function removeCustom(state: ProfileEditorState, id: string): ProfileEditorState {
  return {
    ...state,
    draft: deleteCustomIngredient(state.draft, id),
    fieldErrors: withoutError(state.fieldErrors, id),
  };
}

export function resetDraft(state: ProfileEditorState): ProfileEditorState {
  return createProfileEditorState(state.active);
}

export function clearFieldError(state: ProfileEditorState, id: string): ProfileEditorState {
  return { ...state, fieldErrors: withoutError(state.fieldErrors, id) };
}

export function acceptSavedDraft(state: ProfileEditorState): ProfileEditorState {
  return createProfileEditorState(state.draft);
}

export function catalogueSections(query: string): CatalogueSection[] {
  const key = ingredientComparisonKey(query);
  return avoidedIngredientCategories.map((category) => ({
    title: category.labelPl,
    data: predefinedIngredients.filter((ingredient) => ingredient.categoryId === category.id && (
      !key || [ingredient.labelPl, ingredient.canonicalName, ...ingredient.aliases]
        .some((token) => ingredientComparisonKey(token).includes(key))
    )),
  })).filter((section) => section.data.length > 0);
}

export function profileErrorMessage(error: ProfileValidationError, conflictingLabel?: string): string {
  if (error.code === 'blank_name') return 'Wpisz nazwę składnika.';
  if (error.code === 'name_too_long') return 'Nazwa może mieć maksymalnie 80 znaków.';
  if (error.code === 'duplicate_name') return `Ten składnik jest już na Twojej liście${conflictingLabel ? `: ${conflictingLabel}` : ''}.`;
  if (error.code === 'reserved_name') return `Ten składnik jest dostępny na liście powyżej${conflictingLabel ? `: ${conflictingLabel}` : ''}.`;
  return 'Nie udało się zapisać tej nazwy.';
}

function cloneProfile(profile: AvoidedIngredientProfile): AvoidedIngredientProfile {
  return {
    selectedPredefinedIds: [...profile.selectedPredefinedIds],
    customIngredients: profile.customIngredients.map((ingredient) => ({ ...ingredient })),
  };
}

function withoutError(errors: Readonly<Record<string, ProfileValidationError>>, id: string) {
  const { [id]: _removed, ...remaining } = errors;
  return remaining;
}
