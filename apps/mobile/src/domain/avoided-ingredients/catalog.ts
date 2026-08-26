import { ingredientComparisonKey } from '../personal-rules';

export type AvoidedIngredientCategoryId =
  | 'sweeteners'
  | 'preservatives'
  | 'colourants'
  | 'flavour-enhancers'
  | 'common-ingredients';

export type AvoidedIngredientCategory = {
  readonly id: AvoidedIngredientCategoryId;
  readonly labelPl: string;
};

export type PredefinedIngredient = {
  readonly id: string;
  readonly categoryId: AvoidedIngredientCategoryId;
  readonly labelPl: string;
  readonly canonicalName: string;
  readonly aliases: readonly string[];
};

const categoryEntries: readonly AvoidedIngredientCategory[] = [
  { id: 'sweeteners', labelPl: 'Substancje słodzące' },
  { id: 'preservatives', labelPl: 'Konserwanty' },
  { id: 'colourants', labelPl: 'Barwniki' },
  { id: 'flavour-enhancers', labelPl: 'Wzmacniacze smaku' },
  { id: 'common-ingredients', labelPl: 'Częste składniki alergenne — wybór osobisty' },
];

export const avoidedIngredientCategories: readonly AvoidedIngredientCategory[] = Object.freeze(
  categoryEntries.map((category) => Object.freeze(category)),
);

const catalogueEntries: readonly PredefinedIngredient[] = [
  { id: 'sucralose', categoryId: 'sweeteners', labelPl: 'Sukraloza', canonicalName: 'sucralose', aliases: ['E955', 'E 955'] },
  { id: 'aspartame', categoryId: 'sweeteners', labelPl: 'Aspartam', canonicalName: 'aspartame', aliases: ['E951', 'E 951'] },
  { id: 'acesulfame-potassium', categoryId: 'sweeteners', labelPl: 'Acesulfam K', canonicalName: 'acesulfame potassium', aliases: ['acesulfame k', 'E950', 'E 950'] },
  { id: 'saccharin', categoryId: 'sweeteners', labelPl: 'Sacharyna', canonicalName: 'saccharin', aliases: ['sodium saccharin', 'E954', 'E 954'] },
  { id: 'steviol-glycosides', categoryId: 'sweeteners', labelPl: 'Glikozydy stewiolowe', canonicalName: 'steviol glycosides', aliases: ['stevia glycosides', 'E960', 'E 960'] },
  { id: 'sorbitol', categoryId: 'sweeteners', labelPl: 'Sorbitol', canonicalName: 'sorbitol', aliases: ['E420', 'E 420'] },
  { id: 'maltitol', categoryId: 'sweeteners', labelPl: 'Maltitol', canonicalName: 'maltitol', aliases: ['E965', 'E 965'] },
  { id: 'xylitol', categoryId: 'sweeteners', labelPl: 'Ksylitol', canonicalName: 'xylitol', aliases: ['E967', 'E 967'] },

  { id: 'sodium-benzoate', categoryId: 'preservatives', labelPl: 'Benzoesan sodu', canonicalName: 'sodium benzoate', aliases: ['E211', 'E 211'] },
  { id: 'potassium-sorbate', categoryId: 'preservatives', labelPl: 'Sorbinian potasu', canonicalName: 'potassium sorbate', aliases: ['E202', 'E 202'] },
  { id: 'sodium-nitrite', categoryId: 'preservatives', labelPl: 'Azotyn sodu', canonicalName: 'sodium nitrite', aliases: ['E250', 'E 250'] },
  { id: 'potassium-nitrate', categoryId: 'preservatives', labelPl: 'Azotan potasu', canonicalName: 'potassium nitrate', aliases: ['E252', 'E 252'] },
  { id: 'sulfur-dioxide', categoryId: 'preservatives', labelPl: 'Dwutlenek siarki', canonicalName: 'sulfur dioxide', aliases: ['sulphur dioxide', 'E220', 'E 220'] },

  { id: 'tartrazine', categoryId: 'colourants', labelPl: 'Tartrazyna', canonicalName: 'tartrazine', aliases: ['E102', 'E 102'] },
  { id: 'sunset-yellow-fcf', categoryId: 'colourants', labelPl: 'Żółcień pomarańczowa FCF', canonicalName: 'sunset yellow fcf', aliases: ['sunset yellow', 'E110', 'E 110'] },
  { id: 'carmoisine', categoryId: 'colourants', labelPl: 'Azorubina', canonicalName: 'carmoisine', aliases: ['azorubine', 'E122', 'E 122'] },
  { id: 'allura-red-ac', categoryId: 'colourants', labelPl: 'Czerwień Allura AC', canonicalName: 'allura red ac', aliases: ['allura red', 'E129', 'E 129'] },
  { id: 'brilliant-blue-fcf', categoryId: 'colourants', labelPl: 'Błękit brylantowy FCF', canonicalName: 'brilliant blue fcf', aliases: ['brilliant blue', 'E133', 'E 133'] },

  { id: 'monosodium-glutamate', categoryId: 'flavour-enhancers', labelPl: 'Glutaminian monosodowy', canonicalName: 'monosodium glutamate', aliases: ['msg', 'E621', 'E 621'] },
  { id: 'disodium-guanylate', categoryId: 'flavour-enhancers', labelPl: 'Guanylan disodowy', canonicalName: 'disodium guanylate', aliases: ['E627', 'E 627'] },
  { id: 'disodium-inosinate', categoryId: 'flavour-enhancers', labelPl: 'Inozynian disodowy', canonicalName: 'disodium inosinate', aliases: ['E631', 'E 631'] },
  { id: 'yeast-extract', categoryId: 'flavour-enhancers', labelPl: 'Ekstrakt drożdżowy', canonicalName: 'yeast extract', aliases: [] },

  { id: 'milk', categoryId: 'common-ingredients', labelPl: 'Mleko', canonicalName: 'milk', aliases: ['mleko'] },
  { id: 'lactose', categoryId: 'common-ingredients', labelPl: 'Laktoza', canonicalName: 'lactose', aliases: ['laktoza'] },
  { id: 'whey', categoryId: 'common-ingredients', labelPl: 'Serwatka', canonicalName: 'whey', aliases: ['serwatka'] },
  { id: 'soy', categoryId: 'common-ingredients', labelPl: 'Soja', canonicalName: 'soy', aliases: ['soya', 'soja'] },
  { id: 'wheat', categoryId: 'common-ingredients', labelPl: 'Pszenica', canonicalName: 'wheat', aliases: ['pszenica'] },
  { id: 'gluten', categoryId: 'common-ingredients', labelPl: 'Gluten', canonicalName: 'gluten', aliases: [] },
  { id: 'egg', categoryId: 'common-ingredients', labelPl: 'Jajko', canonicalName: 'egg', aliases: ['jajko'] },
  { id: 'peanut', categoryId: 'common-ingredients', labelPl: 'Orzeszki ziemne', canonicalName: 'peanut', aliases: ['peanuts', 'groundnut', 'orzeszki ziemne'] },
];

export const predefinedIngredients: readonly PredefinedIngredient[] = Object.freeze(
  catalogueEntries.map((ingredient) =>
    Object.freeze({ ...ingredient, aliases: Object.freeze([...ingredient.aliases]) }),
  ),
);

const predefinedIngredientById = new Map(
  predefinedIngredients.map((ingredient) => [ingredient.id, ingredient] as const),
);

export function findPredefinedIngredient(id: string): PredefinedIngredient | undefined {
  return predefinedIngredientById.get(id);
}

export function predefinedIngredientTokens(ingredient: PredefinedIngredient): readonly string[] {
  return [ingredient.canonicalName, ...ingredient.aliases].map(ingredientComparisonKey);
}
