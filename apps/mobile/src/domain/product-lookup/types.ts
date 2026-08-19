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
export type NutritionBasis = 'per_100g' | 'per_100ml';
export type NutritionUnavailableReason =
  | 'missing_source'
  | 'unknown_basis'
  | 'invalid_value'
  | 'unsupported_unit';

export type NutritionFact =
  | {
      status: 'available';
      value: number;
      unit: 'kcal' | 'g';
      basis: NutritionBasis;
    }
  | { status: 'unavailable'; reason: NutritionUnavailableReason };

export type ProductIdentity = {
  displayName: string;
  brands: readonly string[];
  quantity: string | null;
  imageUrl: string | null;
};

export type NutriScore =
  | { status: 'available'; grade: 'a' | 'b' | 'c' | 'd' | 'e' }
  | { status: 'missing' };

export type Ingredients =
  | { status: 'available'; names: readonly string[] }
  | { status: 'missing' | 'unparseable' };

export type NormalizedProduct = {
  identity: ProductIdentity;
  nutriScore: NutriScore;
  ingredients: Ingredients;
  nutrition: Readonly<Record<NutrientId, NutritionFact>>;
};

export type FoundLookup = {
  contractVersion: '1.0';
  outcome: 'found';
  barcode: string;
  source: {
    provider: 'open_food_facts';
    providerProductUrl: string | null;
    fetchedAt: string;
  };
  product: NormalizedProduct;
};

export type NotFoundLookup = {
  contractVersion: '1.0';
  outcome: 'not_found';
  barcode: string;
  source: { provider: 'open_food_facts' };
  reason: 'not_in_source';
};

export type SourceErrorLookup = {
  contractVersion: '1.0';
  outcome: 'source_error';
  barcode: string;
  source: { provider: 'open_food_facts' };
  errorCategory:
    | 'rate_limited'
    | 'network_error'
    | 'invalid_source_response'
    | 'source_unavailable';
};

export type ProductLookup = FoundLookup | NotFoundLookup | SourceErrorLookup;
