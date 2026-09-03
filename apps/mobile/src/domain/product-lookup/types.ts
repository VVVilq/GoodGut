import type { NutrientId, NutritionBasis } from '../nutrition';

export { nutrientIds } from '../nutrition';
export type { NutrientId, NutritionBasis } from '../nutrition';
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
  | {
      status: 'available';
      completeness: 'complete' | 'partial';
      catalogueVersion: string;
      items: readonly ProductIngredientItem[];
      /** Transitional internal projection for Phase 1/2 consumers; not a wire-contract field. */
      names: readonly string[];
    }
  | { status: 'missing' | 'unparseable' };

export type ProductIngredientItem = {
  displayName: string;
  nodeId: string;
  ancestorNodeIds: readonly string[];
};

export type NormalizedProduct = {
  identity: ProductIdentity;
  nutriScore: NutriScore;
  ingredients: Ingredients;
  nutrition: Readonly<Record<NutrientId, NutritionFact>>;
};

export type FoundLookup = {
  contractVersion: '2.0';
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
  contractVersion: '2.0';
  outcome: 'not_found';
  barcode: string;
  source: { provider: 'open_food_facts' };
  reason: 'not_in_source';
};

export type SourceErrorLookup = {
  contractVersion: '2.0';
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
