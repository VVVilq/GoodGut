import { decodeProductLookup } from '@/domain/product-lookup/decoder';
import { PersonalProfile } from '@/domain/personal-profile';
import { PersonalProfileState } from '@/features/personal-profile/profile-store';
import { composePersonalWarnings } from '../personal-warning-composition';
const profile: PersonalProfile = { selections: [], customIngredients: [], nutritionThresholds: [{ id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 10, basis: 'per_100ml' }] };
const state: PersonalProfileState = { status: 'ready', activeProfile: profile };
it('decodes the shared liquid fixture and evaluates its saved threshold end to end', () => { const lookup = decodeProductLookup(requireFixture('services/api/src/test/resources/fixtures/openfoodfacts/normalized/liquid-coca-cola.json')); if (lookup.outcome !== 'found') throw new Error('expected found fixture'); const result = composePersonalWarnings({ status: 'resolved', barcode: lookup.barcode, result: lookup }, state); expect(result).toMatchObject({ kind: 'evaluated', triggerCount: 1, incomplete: false }); });
function requireFixture(path: string): object { const fs = jest.requireActual<{ readFileSync(file: string, encoding: 'utf8'): string }>('fs'); const nodePath = jest.requireActual<{ resolve(...parts: string[]): string }>('path'); return JSON.parse(fs.readFileSync(nodePath.resolve(process.cwd(), '..', '..', path), 'utf8')) as object; }
