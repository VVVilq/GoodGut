import { emptyPersonalProfile } from '@/domain/personal-profile';
import {
  acceptSubmittedNutritionProfile,
  addNutritionRuleDraft,
  createNutritionEditorState,
  isNutritionDraftDirty,
  prepareNutritionProfile,
  removeNutritionRuleDraft,
  resetNutritionDraft,
  unusedNutrients,
  updateNutritionRuleDraft,
} from '../nutrition-editor-state';

describe('nutrition editor state', () => {
  it('adds only unused nutrients in canonical order and removes immediately from the draft', () => {
    const empty = createNutritionEditorState(emptyPersonalProfile());
    const withSalt = addNutritionRuleDraft(empty, 'salt');
    const withEnergy = addNutritionRuleDraft(withSalt, 'energy_kcal');
    expect(withEnergy.rules.map(({ nutrient }) => nutrient)).toEqual(['energy_kcal', 'salt']);
    expect(addNutritionRuleDraft(withEnergy, 'salt')).toBe(withEnergy);
    expect(unusedNutrients(withEnergy)).not.toContain('salt');
    expect(removeNutritionRuleDraft(withEnergy, 'salt').rules.map(({ nutrient }) => nutrient)).toEqual(['energy_kcal']);
  });

  it('requires direction while the slider supplies a bounded threshold', () => {
    const added = addNutritionRuleDraft(createNutritionEditorState(emptyPersonalProfile()), 'sugars');
    const invalid = prepareNutritionProfile(added);
    expect(invalid.ok).toBe(false);
    if (invalid.ok) throw new Error('expected errors');
    expect(invalid.state.errors).toEqual({
      'sugars:direction': 'Wybierz kierunek porównania.',
    });

    const valid = prepareNutritionProfile(updateNutritionRuleDraft(added, 'sugars', {
      direction: 'above', threshold: 5.5,
    }));
    expect(valid).toEqual({ ok: true, profile: {
      selections: [], customIngredients: [],
      nutritionThresholds: [{ id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 5.5 }],
    } });
  });

  it('tracks dirty/reset state and preserves post-submit edits', () => {
    const initial = createNutritionEditorState(emptyPersonalProfile());
    let submittedState = addNutritionRuleDraft(initial, 'protein');
    submittedState = updateNutritionRuleDraft(submittedState, 'protein', { direction: 'below', threshold: 2 });
    const prepared = prepareNutritionProfile(submittedState);
    if (!prepared.ok) throw new Error('expected valid submission');
    const changedDuringSave = updateNutritionRuleDraft(submittedState, 'protein', { threshold: 3 });
    const accepted = acceptSubmittedNutritionProfile(changedDuringSave, prepared.profile);
    expect(isNutritionDraftDirty(accepted)).toBe(true);
    expect(accepted.rules[0].threshold).toBe(3);
    expect(resetNutritionDraft(accepted).rules[0].threshold).toBe(2);
    expect(isNutritionDraftDirty(acceptSubmittedNutritionProfile(submittedState, prepared.profile))).toBe(false);
  });
});
