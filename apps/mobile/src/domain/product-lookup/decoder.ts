import {
  Ingredients,
  NormalizedProduct,
  NutriScore,
  nutrientIds,
  NutritionFact,
  ProductIdentity,
  ProductLookup,
} from './types';

const unavailableReasons = [
  'missing_source',
  'unknown_basis',
  'invalid_value',
  'unsupported_unit',
] as const;

export class ProductLookupDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProductLookupDecodeError';
  }
}

export function decodeProductLookup(value: unknown): ProductLookup {
  const root = object(value, 'response');
  literal(root.contractVersion, '1.0', 'contractVersion');
  const outcome = oneOf(root.outcome, ['found', 'not_found', 'source_error'] as const, 'outcome');

  if (outcome === 'found') {
    exactKeys(root, ['contractVersion', 'outcome', 'barcode', 'source', 'product'], 'response');
    return {
      contractVersion: '1.0',
      outcome,
      barcode: barcode(root.barcode),
      source: foundSource(root.source),
      product: product(root.product),
    };
  }
  if (outcome === 'not_found') {
    exactKeys(root, ['contractVersion', 'outcome', 'barcode', 'source', 'reason'], 'response');
    literal(root.reason, 'not_in_source', 'reason');
    return {
      contractVersion: '1.0',
      outcome,
      barcode: barcode(root.barcode),
      source: commonSource(root.source),
      reason: 'not_in_source',
    };
  }

  exactKeys(root, ['contractVersion', 'outcome', 'barcode', 'source', 'errorCategory'], 'response');
  return {
    contractVersion: '1.0',
    outcome,
    barcode: barcode(root.barcode),
    source: commonSource(root.source),
    errorCategory: oneOf(
      root.errorCategory,
      ['rate_limited', 'network_error', 'invalid_source_response', 'source_unavailable'] as const,
      'errorCategory',
    ),
  };
}

function product(value: unknown): NormalizedProduct {
  const result = object(value, 'product');
  exactKeys(result, ['identity', 'nutriScore', 'ingredients', 'nutrition'], 'product');
  const nutrition = object(result.nutrition, 'product.nutrition');
  exactKeys(nutrition, [...nutrientIds], 'product.nutrition');
  return {
    identity: identity(result.identity),
    nutriScore: nutriScore(result.nutriScore),
    ingredients: ingredients(result.ingredients),
    nutrition: Object.fromEntries(
      nutrientIds.map((id) => [id, nutritionFact(nutrition[id], id)]),
    ) as Record<(typeof nutrientIds)[number], NutritionFact>,
  };
}

function identity(value: unknown): ProductIdentity {
  const result = object(value, 'identity');
  exactKeys(result, ['displayName', 'brands', 'quantity', 'imageUrl'], 'identity');
  const brands = array(result.brands, 'identity.brands').map((brand, index) =>
    nonEmptyString(brand, `identity.brands[${index}]`),
  );
  if (new Set(brands).size !== brands.length) {
    fail('identity.brands must be unique');
  }
  return {
    displayName: nonEmptyString(result.displayName, 'identity.displayName'),
    brands,
    quantity: nullableString(result.quantity, 'identity.quantity'),
    imageUrl: nullableUrl(result.imageUrl, 'identity.imageUrl'),
  };
}

function nutriScore(value: unknown): NutriScore {
  const result = object(value, 'nutriScore');
  const status = oneOf(result.status, ['available', 'missing'] as const, 'nutriScore.status');
  if (status === 'missing') {
    exactKeys(result, ['status'], 'nutriScore');
    return { status };
  }
  exactKeys(result, ['status', 'grade'], 'nutriScore');
  return { status, grade: oneOf(result.grade, ['a', 'b', 'c', 'd', 'e'] as const, 'grade') };
}

function ingredients(value: unknown): Ingredients {
  const result = object(value, 'ingredients');
  const status = oneOf(
    result.status,
    ['available', 'missing', 'unparseable'] as const,
    'ingredients.status',
  );
  if (status !== 'available') {
    exactKeys(result, ['status'], 'ingredients');
    return { status };
  }
  exactKeys(result, ['status', 'names'], 'ingredients');
  const names = array(result.names, 'ingredients.names').map((name, index) =>
    nonEmptyString(name, `ingredients.names[${index}]`),
  );
  if (new Set(names).size !== names.length) {
    fail('ingredients.names must be unique');
  }
  return { status, names };
}

function nutritionFact(value: unknown, nutrient: string): NutritionFact {
  const result = object(value, `nutrition.${nutrient}`);
  const status = oneOf(result.status, ['available', 'unavailable'] as const, `${nutrient}.status`);
  if (status === 'unavailable') {
    exactKeys(result, ['status', 'reason'], nutrient);
    return { status, reason: oneOf(result.reason, unavailableReasons, `${nutrient}.reason`) };
  }
  exactKeys(result, ['status', 'value', 'unit', 'basis'], nutrient);
  const number = result.value;
  if (typeof number !== 'number' || !Number.isFinite(number) || number < 0) {
    fail(`${nutrient}.value must be a finite non-negative number`);
  }
  const expectedUnit = nutrient === 'energy_kcal' ? 'kcal' : 'g';
  literal(result.unit, expectedUnit, `${nutrient}.unit`);
  return {
    status,
    value: number,
    unit: expectedUnit,
    basis: oneOf(result.basis, ['per_100g', 'per_100ml'] as const, `${nutrient}.basis`),
  };
}

function commonSource(value: unknown): { provider: 'open_food_facts' } {
  const result = object(value, 'source');
  exactKeys(result, ['provider'], 'source');
  literal(result.provider, 'open_food_facts', 'source.provider');
  return { provider: 'open_food_facts' };
}

function foundSource(value: unknown) {
  const result = object(value, 'source');
  exactKeys(result, ['provider', 'providerProductUrl', 'fetchedAt'], 'source');
  literal(result.provider, 'open_food_facts', 'source.provider');
  const fetchedAt = nonEmptyString(result.fetchedAt, 'source.fetchedAt');
  if (Number.isNaN(Date.parse(fetchedAt))) fail('source.fetchedAt must be an ISO date-time');
  return {
    provider: 'open_food_facts' as const,
    providerProductUrl: nullableUrl(result.providerProductUrl, 'source.providerProductUrl'),
    fetchedAt,
  };
}

function barcode(value: unknown): string {
  const result = nonEmptyString(value, 'barcode');
  if (!/^[0-9]+$/.test(result)) fail('barcode must contain ASCII digits');
  return result;
}

function object(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${path} must be an object`);
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) fail(`${path} must be an array`);
  return value;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], path: string) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail(`${path} has missing or unknown fields`);
  }
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) fail(`${path} must be a non-empty string`);
  return value;
}

function nullableString(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') fail(`${path} must be a string or null`);
  return value;
}

function nullableUrl(value: unknown, path: string): string | null {
  if (value === null) return null;
  const result = nonEmptyString(value, path);
  try {
    const parsed = new URL(result);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') fail(`${path} must be HTTP(S)`);
  } catch {
    fail(`${path} must be a valid URL`);
  }
  return result;
}

function literal<T extends string>(value: unknown, expected: T, path: string): asserts value is T {
  if (value !== expected) fail(`${path} must equal ${expected}`);
}

function oneOf<const T extends readonly string[]>(value: unknown, options: T, path: string): T[number] {
  if (typeof value !== 'string' || !options.includes(value)) fail(`${path} has an unsupported value`);
  return value as T[number];
}

function fail(message: string): never {
  throw new ProductLookupDecodeError(message);
}
