import { predefinedIngredients } from '@/domain/avoided-ingredients/catalog';
import {
  acceptSavedDraft,
  addCustom,
  catalogueSections,
  createProfileEditorState,
  isProfileDraftDirty,
  removeCustom,
  renameCustom,
  resetDraft,
  togglePredefined,
} from '@/features/personal-profile/profile-editor-state';

describe('profile editor state', () => {
  it('keeps edits in a dirty draft until accepted and can restore active data', () => {
    const initial = createProfileEditorState({ selectedPredefinedIds: [], customIngredients: [] });
    const edited = addCustom(togglePredefined(initial, 'sucralose'), 'custom-1', 'Inulina');
    expect(isProfileDraftDirty(edited)).toBe(true);
    expect(initial.active).toEqual({ selectedPredefinedIds: [], customIngredients: [] });
    expect(resetDraft(edited).draft).toEqual(initial.active);
    expect(isProfileDraftDirty(acceptSavedDraft(edited))).toBe(false);
  });
  it('supports rename/delete and preserves invalid input as a field error', () => {
    const initial = addCustom(createProfileEditorState({ selectedPredefinedIds: [], customIngredients: [] }), 'one', 'Inulina');
    const invalid = renameCustom(initial, 'one', 'E955');
    expect(invalid.draft.customIngredients[0].name).toBe('Inulina');
    expect(invalid.fieldErrors.one.code).toBe('reserved_name');
    expect(removeCustom(invalid, 'one').draft.customIngredients).toEqual([]);
  });
});

describe('catalogue presentation', () => {
  it('preserves category and source ordering while filtering display and alias tokens', () => {
    expect(catalogueSections('').flatMap(({ data }) => data.map(({ id }) => id)))
      .toEqual(predefinedIngredients.map(({ id }) => id));
    expect(catalogueSections('e 955').flatMap(({ data }) => data.map(({ id }) => id))).toEqual(['sucralose']);
  });
  it('does not mutate catalogue matching metadata', () => {
    const before = JSON.stringify(predefinedIngredients);
    catalogueSections('mleko');
    expect(JSON.stringify(predefinedIngredients)).toBe(before);
  });
});
