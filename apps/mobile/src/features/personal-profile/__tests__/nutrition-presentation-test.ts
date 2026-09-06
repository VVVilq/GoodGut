import { nutrientCatalogue, nutrientSliderMaximum, nutrientSliderStep } from '@/domain/nutrition';
import { directionLabel, formatNutritionThreshold, nutrientLabel, nutrientUnit } from '../nutrition-presentation';

describe('nutrition profile presentation', () => {
  it('provides all reviewed labels and fixed units', () => {
    expect(nutrientCatalogue.map(({ id }) => [nutrientLabel(id), nutrientUnit(id)])).toHaveLength(8);
  });
  it('uses fixed slider ranges without manual numeric entry', () => {
    expect([nutrientSliderMaximum('energy_kcal'), nutrientSliderStep('energy_kcal')]).toEqual([1000, 1]);
    expect([nutrientSliderMaximum('sugars'), nutrientSliderStep('sugars')]).toEqual([100, 0.1]);
  });
  it('formats directions, localized decimals, units, and generic scope', () => {
    expect(directionLabel('above')).toBe('Powyżej');
    expect(directionLabel('below')).toBe('Poniżej');
    expect(formatNutritionThreshold({ id: 'nutrition:energy_kcal', nutrient: 'energy_kcal', direction: 'above', threshold: 100.5 })).toBe('Powyżej 100,5 kcal · na 100 g lub 100 ml');
    expect(formatNutritionThreshold({ id: 'nutrition:salt', nutrient: 'salt', direction: 'below', threshold: 0 })).toBe('Poniżej 0 g · na 100 g lub 100 ml');
  });
});
