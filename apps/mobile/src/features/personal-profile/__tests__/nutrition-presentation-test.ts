import { nutrientCatalogue, nutrientSliderMaximum, nutrientSliderStep } from '@/domain/nutrition';
import { basisLabel, directionLabel, formatNutritionThreshold, nutrientLabel, nutrientUnit } from '../nutrition-presentation';

describe('nutrition profile presentation', () => {
  it('provides all reviewed labels and fixed units', () => {
    expect(nutrientCatalogue.map(({ id }) => [nutrientLabel(id), nutrientUnit(id)])).toEqual([
      ['Wartość energetyczna', 'kcal'], ['Węglowodany', 'g'], ['Cukry', 'g'], ['Tłuszcz', 'g'],
      ['Kwasy tłuszczowe nasycone', 'g'], ['Błonnik', 'g'], ['Białko', 'g'], ['Sól', 'g'],
    ]);
  });

  it('uses fixed slider ranges without manual numeric entry', () => {
    expect([nutrientSliderMaximum('energy_kcal'), nutrientSliderStep('energy_kcal')]).toEqual([1000, 1]);
    expect([nutrientSliderMaximum('sugars'), nutrientSliderStep('sugars')]).toEqual([100, 0.1]);
  });

  it('formats directions, localized decimals, units, and both bases', () => {
    expect(directionLabel('above')).toBe('Powyżej');
    expect(directionLabel('below')).toBe('Poniżej');
    expect(basisLabel('per_100g')).toBe('Na 100 g');
    expect(basisLabel('per_100ml')).toBe('Na 100 ml');
    expect(formatNutritionThreshold({ id: 'nutrition:energy_kcal', nutrient: 'energy_kcal', direction: 'above', threshold: 100.5, basis: 'per_100g' })).toBe('Powyżej 100,5 kcal · na 100 g');
    expect(formatNutritionThreshold({ id: 'nutrition:salt', nutrient: 'salt', direction: 'below', threshold: 0, basis: 'per_100ml' })).toBe('Poniżej 0 g · na 100 ml');
  });
});
