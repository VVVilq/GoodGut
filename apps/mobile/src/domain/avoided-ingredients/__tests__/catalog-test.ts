import { ingredientComparisonKey } from '../../personal-rules';
import {
  avoidedIngredientCategories,
  predefinedIngredients,
  predefinedIngredientTokens,
} from '../catalog';

describe('predefined avoided ingredient catalogue', () => {
  it('contains 30 entries in the five reviewed categories', () => {
    expect(predefinedIngredients).toHaveLength(30);
    expect(avoidedIngredientCategories.map(({ id }) => id)).toEqual([
      'sweeteners',
      'preservatives',
      'colourants',
      'flavour-enhancers',
      'common-ingredients',
    ]);
    expect(new Set(predefinedIngredients.map(({ id }) => id)).size).toBe(30);
  });

  it('assigns every canonical name and alias to exactly one catalogue item', () => {
    const owners = new Map<string, string>();
    for (const ingredient of predefinedIngredients) {
      for (const token of predefinedIngredientTokens(ingredient)) {
        expect(owners.get(token)).toBeUndefined();
        owners.set(token, ingredient.id);
      }
    }
  });

  it('keeps Polish labels separate from matching tokens unless explicitly reviewed', () => {
    const sucralose = predefinedIngredients.find(({ id }) => id === 'sucralose')!;
    expect(sucralose.labelPl).toBe('Sukraloza');
    expect(predefinedIngredientTokens(sucralose)).toEqual(['sucralose', 'e955', 'e 955']);
    expect(predefinedIngredientTokens(sucralose)).not.toContain(
      ingredientComparisonKey(sucralose.labelPl),
    );
  });
});
