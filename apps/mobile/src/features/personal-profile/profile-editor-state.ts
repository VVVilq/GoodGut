import { CatalogueItem, SelectionScope } from '@/domain/ingredient-catalogue';
import { addCustomIngredient, AvoidedIngredientProfile, deleteCustomIngredient, ProfileValidationError, removeTaxonomySelection, renameCustomIngredient, selectTaxonomyIngredient } from '@/domain/avoided-ingredients/profile';

export type ProfileEditorState = { active: AvoidedIngredientProfile; draft: AvoidedIngredientProfile; fieldErrors: Readonly<Record<string, ProfileValidationError>>; ancestryByNode: Readonly<Record<string, readonly string[]>>; consolidationMessage?: string };
export function createProfileEditorState(active: AvoidedIngredientProfile): ProfileEditorState { return { active, draft: clone(active), fieldErrors: {}, ancestryByNode: {} }; }
export function isProfileDraftDirty(state: ProfileEditorState) { return JSON.stringify(state.active) !== JSON.stringify(state.draft); }
export function chooseCatalogueItem(state: ProfileEditorState, item: CatalogueItem, scope: SelectionScope): ProfileEditorState {
  const result = selectTaxonomyIngredient(state.draft, { nodeId: item.nodeId, labelPl: item.label, scope }, item.breadcrumb.map(({ nodeId }) => nodeId));
  const descendants = scope === 'subtree' ? result.profile.selections.filter((saved) => state.ancestryByNode[saved.nodeId]?.includes(item.nodeId)).map((saved) => saved.nodeId) : [];
  const draft = descendants.reduce(removeTaxonomySelection, result.profile);
  const consolidated = [...result.consolidated, ...descendants];
  return { ...state, draft, ancestryByNode: { ...state.ancestryByNode, [item.nodeId]: item.breadcrumb.map(({ nodeId }) => nodeId) }, consolidationMessage: consolidated.length ? 'Ten wybór zastępuje bardziej szczegółowy wpis.' : undefined };
}
export function catalogueItemSelectionState(state: ProfileEditorState, item: CatalogueItem) {
  const exact = state.draft.selections.find((selection) => selection.nodeId === item.nodeId);
  const coveringAncestor = state.draft.selections.find((selection) => selection.scope === 'subtree' && item.breadcrumb.some(({ nodeId }) => nodeId === selection.nodeId));
  return {
    nodeChecked: exact?.scope === 'node' || exact?.scope === 'subtree' || coveringAncestor !== undefined,
    subtreeChecked: exact?.scope === 'subtree' || coveringAncestor !== undefined,
    coveredByAncestor: coveringAncestor !== undefined,
  };
}
export function removeSelection(state: ProfileEditorState, nodeId: string): ProfileEditorState { return { ...state, draft: removeTaxonomySelection(state.draft, nodeId) }; }
export function addCustom(state: ProfileEditorState,id:string,name:string){const result=addCustomIngredient(state.draft,{id,name});return result.ok?{...state,draft:result.profile,fieldErrors:without(state.fieldErrors,id)}:{...state,fieldErrors:{...state.fieldErrors,[id]:result.error}};}
export function renameCustom(state:ProfileEditorState,id:string,name:string){const result=renameCustomIngredient(state.draft,id,name);return result.ok?{...state,draft:result.profile,fieldErrors:without(state.fieldErrors,id)}:{...state,fieldErrors:{...state.fieldErrors,[id]:result.error}};}
export function removeCustom(state:ProfileEditorState,id:string){return {...state,draft:deleteCustomIngredient(state.draft,id),fieldErrors:without(state.fieldErrors,id)};}
export function clearFieldError(state:ProfileEditorState,id:string){return {...state,fieldErrors:without(state.fieldErrors,id)};}
export function resetDraft(state:ProfileEditorState){return createProfileEditorState(state.active);}
export function acceptSavedDraft(state:ProfileEditorState){return createProfileEditorState(state.draft);}
export function profileErrorMessage(error:ProfileValidationError, conflictingLabel?:string){if(error.code==='blank_name')return 'Wpisz nazwę składnika.';if(error.code==='name_too_long')return 'Nazwa może mieć maksymalnie 80 znaków.';if(error.code==='duplicate_name')return `Ten składnik jest już na Twojej liście${conflictingLabel?`: ${conflictingLabel}`:''}.`;return 'Nie udało się zapisać tej wartości.';}
function clone(profile:AvoidedIngredientProfile):AvoidedIngredientProfile{return {selections:profile.selections.map((item)=>({...item})),customIngredients:profile.customIngredients.map((item)=>({...item}))};}
function without(errors:Readonly<Record<string,ProfileValidationError>>,id:string){const {[id]:_removed,...remaining}=errors;return remaining;}
