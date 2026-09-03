import { NutritionThreshold, PersonalProfile, validatePersonalProfile } from '@/domain/personal-profile';

export const PERSONAL_PROFILE_SCHEMA_VERSION = 3;
export type PersonalProfileDocument = { schemaVersion: 3; profile: PersonalProfile };
export type ProfileDecodeResult =
  | { ok: true; document: PersonalProfileDocument; migratedFrom?: 2 }
  | { ok: false; reason: 'invalid_json' | 'invalid_document' | 'unsupported_version' };

export function encodePersonalProfile(profile: PersonalProfile): string {
  const error = validatePersonalProfile(profile);
  if (error) throw new Error(`Cannot encode invalid personal profile: ${error.section}:${error.error.code}`);
  return JSON.stringify({ schemaVersion: PERSONAL_PROFILE_SCHEMA_VERSION, profile });
}

export function decodePersonalProfile(value: string): ProfileDecodeResult {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { return { ok: false, reason: 'invalid_json' }; }
  if (!record(parsed) || !keys(parsed, ['schemaVersion', 'profile'])) return { ok: false, reason: 'invalid_document' };
  if (parsed.schemaVersion !== 2 && parsed.schemaVersion !== 3) return { ok: false, reason: 'unsupported_version' };

  const ingredients = decodeIngredientFields(parsed.profile, parsed.schemaVersion === 3);
  if (!ingredients) return { ok: false, reason: 'invalid_document' };
  const nutritionThresholds = parsed.schemaVersion === 3
    ? decodeNutritionThresholds((parsed.profile as Record<string, unknown>).nutritionThresholds)
    : [];
  if (nutritionThresholds === null) return { ok: false, reason: 'invalid_document' };
  const profile: PersonalProfile = { ...ingredients, nutritionThresholds };
  if (validatePersonalProfile(profile)) return { ok: false, reason: 'invalid_document' };
  return parsed.schemaVersion === 2
    ? { ok: true, document: { schemaVersion: 3, profile }, migratedFrom: 2 }
    : { ok: true, document: { schemaVersion: 3, profile } };
}

export function isV1PersonalProfile(value: string): boolean {
  try { const parsed: unknown = JSON.parse(value); return record(parsed) && parsed.schemaVersion === 1 && record(parsed.profile); }
  catch { return false; }
}

function decodeIngredientFields(value: unknown, includeNutrition: boolean) {
  const expected = includeNutrition ? ['selections', 'customIngredients', 'nutritionThresholds'] : ['selections', 'customIngredients'];
  if (!record(value) || !keys(value, expected) || !Array.isArray(value.selections) || !Array.isArray(value.customIngredients)) return null;
  const selections: PersonalProfile['selections'][number][] = [];
  for (const item of value.selections) {
    if (!record(item) || (!keys(item, ['nodeId', 'labelPl', 'scope']) && !keys(item, ['nodeId', 'labelPl', 'scope', 'ancestorNodeIds'])) || typeof item.nodeId !== 'string' || typeof item.labelPl !== 'string' || (item.scope !== 'node' && item.scope !== 'subtree')) return null;
    const ancestorNodeIds = item.ancestorNodeIds === undefined ? [] : item.ancestorNodeIds;
    if (!Array.isArray(ancestorNodeIds) || ancestorNodeIds.some((id) => typeof id !== 'string')) return null;
    selections.push({ nodeId: item.nodeId, labelPl: item.labelPl, scope: item.scope, ancestorNodeIds: [...new Set(ancestorNodeIds)] });
  }

  const customIngredients: PersonalProfile['customIngredients'][number][] = [];
  for (const item of value.customIngredients) {
    if (!record(item) || !keys(item, ['id', 'name']) || typeof item.id !== 'string' || typeof item.name !== 'string') return null;
    customIngredients.push({ id: item.id, name: item.name });
  }
  return { selections, customIngredients };
}

function decodeNutritionThresholds(value: unknown): NutritionThreshold[] | null {
  if (!Array.isArray(value)) return null;
  const thresholds: NutritionThreshold[] = [];
  for (const item of value) {
    if (!record(item) || !keys(item, ['id', 'nutrient', 'direction', 'threshold', 'basis']) || typeof item.id !== 'string' || typeof item.nutrient !== 'string' || typeof item.direction !== 'string' || typeof item.threshold !== 'number' || typeof item.basis !== 'string') return null;
    thresholds.push(item as NutritionThreshold);
  }
  return thresholds;
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function keys(value: Record<string, unknown>, expected: readonly string[]) { const actual = Object.keys(value).sort(); const wanted = [...expected].sort(); return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]); }
