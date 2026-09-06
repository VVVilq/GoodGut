import { decodeProductLookup } from '@/domain/product-lookup/decoder';
import { decodePersonalProfile } from '@/data/personal-profile-codec';
import { PersonalProfile } from '@/domain/personal-profile';
import { PersonalProfileState } from '@/features/personal-profile/profile-store';
import { ProductLookupState } from '../lookup-state-machine';
import { composePersonalWarnings } from '../personal-warning-composition';
import { presentProductLookup } from '../presentation';
const profile: PersonalProfile = { selections: [], customIngredients: [], nutritionThresholds: [{ id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 10 }] };
const state: PersonalProfileState = { status: 'ready', activeProfile: profile };
it('decodes the shared liquid fixture and evaluates its saved threshold end to end', () => { const lookup = decodeProductLookup(requireFixture('services/api/src/test/resources/fixtures/openfoodfacts/normalized/liquid-coca-cola.json')); if (lookup.outcome !== 'found') throw new Error('expected found fixture'); const result = composePersonalWarnings({ status: 'resolved', barcode: lookup.barcode, result: lookup }, state); expect(result).toMatchObject({ kind: 'evaluated', triggerCount: 1, incomplete: false }); });
it.each([
  ['liquid-coca-cola.json', '5449000000996'],
  ['solid-nutella.json', '3017620422003'],
  ['partial-ingredients.json', '6111242100992'],
  ['missing-ingredients.json', '0000000001008'],
  ['unavailable-nutrition.json', '9900000000010'],
])('decodes every served fixture (%s)', (file, barcode) => {
  expect(decodeProductLookup(requireFixture(`scripts/fixtures/nutrition-warning-scan/${file}`))).toMatchObject({ outcome: 'found', barcode });
});
it('preserves the contract not-found fallback for unknown barcodes', () => {
  expect(decodeProductLookup({ contractVersion: '3.0', outcome: 'not_found', barcode: '9999999999999', source: { provider: 'open_food_facts' }, reason: 'not_in_source' })).toMatchObject({ outcome: 'not_found', barcode: '9999999999999' });
});

function liquidLookup(): ProductLookupState {
  const result = decodeProductLookup(requireFixture('scripts/fixtures/nutrition-warning-scan/liquid-coca-cola.json'));
  if (result.outcome !== 'found') throw new Error('expected found fixture');
  return { status: 'resolved', barcode: result.barcode, result };
}

it('projects one saved rule into presentation for trigger, equality, and both product bases', () => {
  const lookup = liquidLookup();
  const trigger = presentProductLookup(lookup, stateWithThreshold(10));
  const equality = presentProductLookup(lookup, stateWithThreshold(10.6));
  const crossBasis = presentProductLookup(solidLookup(), stateWithThreshold(10));
  expect(trigger.kind === 'found' && trigger.nutrients.find((row) => row.id === 'sugars')).toMatchObject({ warning: true });
  expect(equality.kind === 'found' && equality.nutrients.find((row) => row.id === 'sugars')).toMatchObject({ warning: false });
  expect(crossBasis.kind === 'found' && crossBasis.ingredientWarnings).toMatchObject({ kind: 'evaluated', incomplete: false });
});

it('migrates a schema-v3 threshold without losing its value', () => {
  const result = decodePersonalProfile(JSON.stringify({ schemaVersion: 3, profile: { selections: [], customIngredients: [], nutritionThresholds: [{ id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 10, basis: 'per_100g' }] } }));
  expect(result).toMatchObject({ ok: true, migratedFrom: 3, document: { schemaVersion: 4, profile: { nutritionThresholds: [{ id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 10 }] } } });
});

it('evaluates the active saved profile while candidate edits and save errors remain isolated', () => {
  const lookup = liquidLookup();
  const saveError: PersonalProfileState = { status: 'save_error', activeProfile: profile, candidate: { ...profile, nutritionThresholds: [{ ...profile.nutritionThresholds[0], threshold: 100 }] }, error: 'storage' };
  const presentation = presentProductLookup(lookup, saveError);
  expect(presentation.kind === 'found' && presentation.ingredientWarnings).toMatchObject({ kind: 'evaluated', title: expect.stringContaining('1') });
});

function solidLookup(): ProductLookupState {
  const result = decodeProductLookup(requireFixture('scripts/fixtures/nutrition-warning-scan/solid-nutella.json'));
  if (result.outcome !== 'found') throw new Error('expected found fixture');
  return { status: 'resolved', barcode: result.barcode, result };
}

function stateWithThreshold(threshold: number): PersonalProfileState {
  return { status: 'ready', activeProfile: { ...profile, nutritionThresholds: [{ ...profile.nutritionThresholds[0], threshold }] } };
}
function requireFixture(path: string): object { const fs = jest.requireActual<{ readFileSync(file: string, encoding: 'utf8'): string }>('fs'); const nodePath = jest.requireActual<{ resolve(...parts: string[]): string }>('path'); return JSON.parse(fs.readFileSync(nodePath.resolve(process.cwd(), '..', '..', path), 'utf8')) as object; }
