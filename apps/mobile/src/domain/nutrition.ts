export const nutrientIds = [
  'energy_kcal',
  'carbohydrates',
  'sugars',
  'fat',
  'saturated_fat',
  'fiber',
  'protein',
  'salt',
] as const;

export type NutrientId = (typeof nutrientIds)[number];

export const nutritionBases = ['per_100g', 'per_100ml'] as const;
export type NutritionBasis = (typeof nutritionBases)[number];

export const nutritionDirections = ['above', 'below'] as const;
export type NutritionDirection = (typeof nutritionDirections)[number];

export type NutrientUnit = 'kcal' | 'g';

export type NutrientDefinition = Readonly<{
  id: NutrientId;
  labelPl: string;
  unit: NutrientUnit;
}>;

export const nutrientCatalogue: readonly NutrientDefinition[] = Object.freeze([
  { id: 'energy_kcal', labelPl: 'Wartość energetyczna', unit: 'kcal' },
  { id: 'carbohydrates', labelPl: 'Węglowodany', unit: 'g' },
  { id: 'sugars', labelPl: 'Cukry', unit: 'g' },
  { id: 'fat', labelPl: 'Tłuszcz', unit: 'g' },
  { id: 'saturated_fat', labelPl: 'Kwasy tłuszczowe nasycone', unit: 'g' },
  { id: 'fiber', labelPl: 'Błonnik', unit: 'g' },
  { id: 'protein', labelPl: 'Białko', unit: 'g' },
  { id: 'salt', labelPl: 'Sól', unit: 'g' },
]);

const nutrientIdSet = new Set<string>(nutrientIds);
const nutritionBasisSet = new Set<string>(nutritionBases);
const nutritionDirectionSet = new Set<string>(nutritionDirections);

export const isNutrientId = (value: unknown): value is NutrientId =>
  typeof value === 'string' && nutrientIdSet.has(value);

export const isNutritionBasis = (value: unknown): value is NutritionBasis =>
  typeof value === 'string' && nutritionBasisSet.has(value);

export const isNutritionDirection = (value: unknown): value is NutritionDirection =>
  typeof value === 'string' && nutritionDirectionSet.has(value);

export const nutrientOrder = (nutrient: NutrientId) => nutrientIds.indexOf(nutrient);

export const nutrientSliderMaximum = (nutrient: NutrientId) =>
  nutrient === 'energy_kcal' ? 1000 : 100;

export const nutrientSliderStep = (nutrient: NutrientId) =>
  nutrient === 'energy_kcal' ? 1 : 0.1;
