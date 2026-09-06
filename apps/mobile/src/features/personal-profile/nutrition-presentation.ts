import { nutrientCatalogue, NutrientId, NutritionBasis, NutritionDirection } from '@/domain/nutrition';
import { NutritionThreshold } from '@/domain/personal-profile';

const definitions = new Map(nutrientCatalogue.map((item) => [item.id, item]));

export function nutrientLabel(nutrient: NutrientId) { return definitions.get(nutrient)?.labelPl ?? nutrient; }
export function nutrientUnit(nutrient: NutrientId) { return definitions.get(nutrient)?.unit ?? 'g'; }
export function directionLabel(direction: NutritionDirection) { return direction === 'above' ? 'Powyżej' : 'Poniżej'; }
export function basisLabel(basis: NutritionBasis | undefined) { return basis === 'per_100g' ? 'Na 100 g' : basis === 'per_100ml' ? 'Na 100 ml' : 'Na 100 g lub 100 ml'; }
export function formatNutritionThreshold(rule: NutritionThreshold) {
  const value = String(rule.threshold).replace('.', ',');
  return `${directionLabel(rule.direction)} ${value} ${nutrientUnit(rule.nutrient)} · ${basisLabel(rule.basis).toLowerCase()}`;
}
