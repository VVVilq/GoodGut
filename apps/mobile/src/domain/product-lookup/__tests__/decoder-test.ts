import { decodeProductLookup, ProductLookupDecodeError } from '../decoder';

type FoundExample = typeof import('../../../../../../docs/reference/examples/product-lookup-found.json');
type NotFoundExample = typeof import('../../../../../../docs/reference/examples/product-lookup-not-found.json');
type SourceErrorExample = typeof import('../../../../../../docs/reference/examples/product-lookup-source-error.json');
type LiquidFixture = typeof import('../../../../../../services/api/src/test/resources/fixtures/openfoodfacts/normalized/liquid-coca-cola.json');

const foundExample = fixture<FoundExample>('docs/reference/examples/product-lookup-found.json');
const notFoundExample = fixture<NotFoundExample>('docs/reference/examples/product-lookup-not-found.json');
const sourceErrorExample = fixture<SourceErrorExample>('docs/reference/examples/product-lookup-source-error.json');
const liquidFixture = fixture<LiquidFixture>(
  'services/api/src/test/resources/fixtures/openfoodfacts/normalized/liquid-coca-cola.json',
);

describe('decodeProductLookup', () => {
  it.each([
    ['found', foundExample],
    ['not found', notFoundExample],
    ['source error', sourceErrorExample],
    ['representative fixture', liquidFixture],
  ])('accepts the canonical %s response', (_name, value) => {
    expect(decodeProductLookup(value)).toEqual(value);
  });

  it('preserves zero values and both nutrition bases', () => {
    const liquid = decodeProductLookup(liquidFixture);
    expect(liquid.outcome).toBe('found');
    if (liquid.outcome !== 'found') throw new Error('expected found');
    expect(liquid.product.nutrition.fat).toEqual({
      status: 'available',
      value: 0,
      unit: 'g',
      basis: 'per_100ml',
    });

    const solid = structuredClone(liquidFixture);
    for (const fact of Object.values(solid.product.nutrition)) {
      if ('basis' in fact) fact.basis = 'per_100g';
    }
    expect(decodeProductLookup(solid).outcome).toBe('found');
  });

  it.each(['missing_source', 'unknown_basis', 'invalid_value', 'unsupported_unit'])(
    'accepts unavailable reason %s',
    (reason) => {
      const value = structuredClone(foundExample);
      value.product.nutrition.energy_kcal = {
        status: 'unavailable',
        reason,
      } as typeof value.product.nutrition.energy_kcal;
      expect(decodeProductLookup(value).outcome).toBe('found');
    },
  );

  it.each([
    ['unknown contract version', { ...notFoundExample, contractVersion: '2.0' }],
    ['extra branch field', { ...notFoundExample, extra: true }],
    ['missing branch field', { ...notFoundExample, reason: undefined }],
    ['invalid enum', { ...sourceErrorExample, errorCategory: 'mystery' }],
    [
      'negative nutrition',
      (() => {
        const value = structuredClone(liquidFixture);
        value.product.nutrition.sugars.value = -1;
        return value;
      })(),
    ],
  ])('rejects %s', (_name, value) => {
    expect(() => decodeProductLookup(value)).toThrow(ProductLookupDecodeError);
  });
});

function fixture<T extends object>(repositoryPath: string): T {
  const path = jest.requireActual<{ resolve: (...segments: string[]) => string }>('path');
  const fs = jest.requireActual<{ readFileSync: (file: string, encoding: 'utf8') => string }>('fs');
  const file = path.resolve(process.cwd(), '..', '..', repositoryPath);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}
