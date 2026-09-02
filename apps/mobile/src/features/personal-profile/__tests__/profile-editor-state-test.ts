import { CatalogueItem } from '@/domain/ingredient-catalogue';
import { acceptSavedDraft, addCustom, catalogueItemSelectionState, chooseCatalogueItem, createProfileEditorState, isProfileDraftDirty, resetDraft } from '../profile-editor-state';

const MILK: CatalogueItem = { nodeId: 'en:milk', label: 'Mleko', locale: 'pl', breadcrumb: [], selectable: true, hasChildren: true, supportedScopes: ['node', 'subtree'] };
describe('profile editor state v2', () => {
  it('keeps taxonomy and custom edits in a draft until accepted', () => {
    const initial=createProfileEditorState({selections:[],customIngredients:[]});
    const edited=addCustom(chooseCatalogueItem(initial,MILK,'subtree'),'one','Inulina');
    expect(isProfileDraftDirty(edited)).toBe(true); expect(resetDraft(edited).draft).toEqual(initial.active); expect(isProfileDraftDirty(acceptSavedDraft(edited))).toBe(false);
  });
  it('explains a selection covered by an existing subtree',()=>{
    const goat:CatalogueItem={...MILK,nodeId:'en:goat-milk',label:'Mleko kozie',breadcrumb:[{nodeId:'en:milk',label:'Mleko'}]};
    const withMilk=chooseCatalogueItem(createProfileEditorState({selections:[],customIngredients:[]}),MILK,'subtree');
    expect(chooseCatalogueItem(withMilk,goat,'node').consolidationMessage).toBeDefined();
    const withGoat=chooseCatalogueItem(createProfileEditorState({selections:[],customIngredients:[]}),goat,'node');
    const consolidated=chooseCatalogueItem(withGoat,MILK,'subtree');
    expect(consolidated.draft.selections).toEqual([{nodeId:'en:milk',labelPl:'Mleko',scope:'subtree',ancestorNodeIds:[]}]);
    expect(catalogueItemSelectionState(withMilk,goat)).toEqual({nodeChecked:true,subtreeChecked:true,coveredByAncestor:true});
  });
  it('consolidates a persisted descendant after reopening the editor',()=>{
    const reopened=createProfileEditorState({
      selections:[{nodeId:'en:goat-milk',labelPl:'Mleko kozie',scope:'node',ancestorNodeIds:['en:milk']}],
      customIngredients:[],
    });
    const consolidated=chooseCatalogueItem(reopened,MILK,'subtree');
    expect(consolidated.draft.selections).toEqual([{nodeId:'en:milk',labelPl:'Mleko',scope:'subtree',ancestorNodeIds:[]}]);
    expect(consolidated.consolidationMessage).toBeDefined();
  });
});
