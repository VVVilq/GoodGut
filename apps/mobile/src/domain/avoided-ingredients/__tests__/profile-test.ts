import { addCustomIngredient, emptyAvoidedIngredientProfile, profileToIngredientRules, removeTaxonomySelection, selectTaxonomyIngredient, validateAvoidedIngredientProfile } from '../profile';

describe('avoided ingredient profile v2', () => {
  it('stores stable taxonomy selections and supports scope replacement', () => {
    const empty = emptyAvoidedIngredientProfile();
    const selected = selectTaxonomyIngredient(empty, { nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree' });
    expect(selected.profile.selections).toEqual([{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree' }]);
    expect(removeTaxonomySelection(selected.profile, 'en:milk')).toEqual(empty);
  });
  it('does not add a descendant already covered by a subtree', () => {
    const parent = selectTaxonomyIngredient(emptyAvoidedIngredientProfile(), { nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree' }).profile;
    const result = selectTaxonomyIngredient(parent, { nodeId: 'en:goat-milk', labelPl: 'Mleko kozie', scope: 'node' }, ['en:milk']);
    expect(result.profile).toBe(parent); expect(result.consolidated).toEqual(['en:goat-milk']);
  });
  it('validates selections and custom exact-text entries', () => {
    expect(validateAvoidedIngredientProfile({ selections: [{ nodeId: 'bad', labelPl: '', scope: 'node' }], customIngredients: [] })).toMatchObject({ code: 'invalid_selection' });
    const added = addCustomIngredient(emptyAvoidedIngredientProfile(), { id: 'one', name: ' Inulina ' });
    if (!added.ok) throw new Error('expected success');
    expect(added.profile.customIngredients).toEqual([{ id: 'one', name: 'Inulina' }]);
    expect(profileToIngredientRules(added.profile)[0]).toMatchObject({ id: 'custom:one', name: 'Inulina' });
  });
});
