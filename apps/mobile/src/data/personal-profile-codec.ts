import { AvoidedIngredientProfile, validateAvoidedIngredientProfile } from '@/domain/avoided-ingredients/profile';

export const PERSONAL_PROFILE_SCHEMA_VERSION = 1;

export type PersonalProfileDocument = {
  schemaVersion: typeof PERSONAL_PROFILE_SCHEMA_VERSION;
  profile: AvoidedIngredientProfile;
};

export type ProfileDecodeResult =
  | { ok: true; document: PersonalProfileDocument }
  | { ok: false; reason: 'invalid_json' | 'invalid_document' | 'unsupported_version' };

export function encodePersonalProfile(profile: AvoidedIngredientProfile): string {
  const error = validateAvoidedIngredientProfile(profile);
  if (error) throw new Error(`Cannot encode invalid personal profile: ${error.code}`);
  return JSON.stringify({ schemaVersion: PERSONAL_PROFILE_SCHEMA_VERSION, profile });
}

export function decodePersonalProfile(value: string): ProfileDecodeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false, reason: 'invalid_json' };
  }
  if (!isRecord(parsed) || !hasExactKeys(parsed, ['schemaVersion', 'profile'])) {
    return { ok: false, reason: 'invalid_document' };
  }
  if (parsed.schemaVersion !== PERSONAL_PROFILE_SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported_version' };
  }
  const profile = decodeProfile(parsed.profile);
  if (!profile || validateAvoidedIngredientProfile(profile)) {
    return { ok: false, reason: 'invalid_document' };
  }
  return { ok: true, document: { schemaVersion: PERSONAL_PROFILE_SCHEMA_VERSION, profile } };
}

function decodeProfile(value: unknown): AvoidedIngredientProfile | null {
  if (!isRecord(value) || !hasExactKeys(value, ['selectedPredefinedIds', 'customIngredients'])) return null;
  if (!Array.isArray(value.selectedPredefinedIds) ||
      !value.selectedPredefinedIds.every((id): id is string => typeof id === 'string') ||
      !Array.isArray(value.customIngredients)) return null;

  const customIngredients: { id: string; name: string }[] = [];
  for (const item of value.customIngredients) {
    if (!isRecord(item) || !hasExactKeys(item, ['id', 'name']) ||
        typeof item.id !== 'string' || typeof item.name !== 'string') return null;
    customIngredients.push({ id: item.id, name: item.name });
  }
  return { selectedPredefinedIds: [...value.selectedPredefinedIds], customIngredients };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
}
