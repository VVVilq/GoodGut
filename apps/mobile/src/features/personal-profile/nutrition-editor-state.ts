import { clonePersonalProfile, PersonalProfile } from '@/domain/personal-profile';
import { nutrientIds, NutrientId, NutritionDirection } from '@/domain/nutrition';

export type NutritionRuleDraft = Readonly<{
  nutrient: NutrientId;
  direction?: NutritionDirection;
  threshold: number;
}>;

export type NutritionField = 'direction';
export type NutritionEditorErrors = Readonly<Record<string, string>>;
export type NutritionEditorState = Readonly<{
  active: PersonalProfile;
  rules: readonly NutritionRuleDraft[];
  errors: NutritionEditorErrors;
}>;

export function createNutritionEditorState(active: PersonalProfile): NutritionEditorState {
  return {
    active: clonePersonalProfile(active),
    rules: active.nutritionThresholds.map((rule) => ({
      nutrient: rule.nutrient,
      direction: rule.direction,
      threshold: rule.threshold,
    })),
    errors: {},
  };
}

export const unusedNutrients = (state: NutritionEditorState) => {
  const used = new Set(state.rules.map(({ nutrient }) => nutrient));
  return nutrientIds.filter((nutrient) => !used.has(nutrient));
};

export function addNutritionRuleDraft(state: NutritionEditorState, nutrient: NutrientId): NutritionEditorState {
  if (state.rules.some((rule) => rule.nutrient === nutrient)) return state;
  return { ...state, rules: ordered([...state.rules, { nutrient, threshold: 0 }]) };
}

export function updateNutritionRuleDraft(
  state: NutritionEditorState,
  nutrient: NutrientId,
  changes: Partial<Pick<NutritionRuleDraft, 'direction' | 'threshold'>>,
): NutritionEditorState {
  return {
    ...state,
    rules: state.rules.map((rule) => rule.nutrient === nutrient ? { ...rule, ...changes } : rule),
    errors: withoutNutrientErrors(state.errors, nutrient),
  };
}

export function removeNutritionRuleDraft(state: NutritionEditorState, nutrient: NutrientId): NutritionEditorState {
  return {
    ...state,
    rules: state.rules.filter((rule) => rule.nutrient !== nutrient),
    errors: withoutNutrientErrors(state.errors, nutrient),
  };
}

export function prepareNutritionProfile(state: NutritionEditorState):
  | { ok: true; profile: PersonalProfile }
  | { ok: false; state: NutritionEditorState } {
  const errors: Record<string, string> = {};
  const thresholds = state.rules.flatMap((rule) => {
    if (!rule.direction) errors[key(rule.nutrient, 'direction')] = 'Wybierz kierunek porównania.';
    if (!rule.direction) return [];
    return [{
      id: `nutrition:${rule.nutrient}`,
      nutrient: rule.nutrient,
      direction: rule.direction,
      threshold: rule.threshold,
    }];
  });
  return Object.keys(errors).length
    ? { ok: false, state: { ...state, errors } }
    : { ok: true, profile: { ...clonePersonalProfile(state.active), nutritionThresholds: thresholds } };
}

export function isNutritionDraftDirty(state: NutritionEditorState) {
  return JSON.stringify(state.rules) !== JSON.stringify(createNutritionEditorState(state.active).rules);
}

export function resetNutritionDraft(state: NutritionEditorState) {
  return createNutritionEditorState(state.active);
}

export function acceptSubmittedNutritionProfile(
  state: NutritionEditorState,
  submitted: PersonalProfile,
): NutritionEditorState {
  const current = prepareNutritionProfile(state);
  return current.ok && JSON.stringify(current.profile.nutritionThresholds) === JSON.stringify(submitted.nutritionThresholds)
    ? createNutritionEditorState(submitted)
    : { ...state, active: clonePersonalProfile(submitted) };
}

export const nutritionFieldError = (state: NutritionEditorState, nutrient: NutrientId, field: NutritionField) =>
  state.errors[key(nutrient, field)];

function key(nutrient: NutrientId, field: NutritionField) { return `${nutrient}:${field}`; }
function ordered(rules: readonly NutritionRuleDraft[]) { return [...rules].sort((a, b) => nutrientIds.indexOf(a.nutrient) - nutrientIds.indexOf(b.nutrient)); }
function withoutNutrientErrors(errors: NutritionEditorErrors, nutrient: NutrientId) { return Object.fromEntries(Object.entries(errors).filter(([id]) => !id.startsWith(`${nutrient}:`))); }
