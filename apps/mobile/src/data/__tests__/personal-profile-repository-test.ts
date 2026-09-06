import { decodePersonalProfile, encodePersonalProfile } from '../personal-profile-codec';
import { AsyncKeyValueStore, PERSONAL_PROFILE_KEYS, TwoSlotPersonalProfileRepository } from '../personal-profile-repository';
import { emptyPersonalProfile, PersonalProfile } from '@/domain/personal-profile';

const PROFILE: PersonalProfile = {
  selections: [{ nodeId: 'en:milk', labelPl: 'Mleko', scope: 'subtree', ancestorNodeIds: [] }],
  customIngredients: [{ id: 'one', name: 'Inulina' }],
  nutritionThresholds: [{ id: 'nutrition:sugars', nutrient: 'sugars', direction: 'above', threshold: 5.5 }],
};
const V2_DOCUMENT = JSON.stringify({ schemaVersion: 2, profile: { selections: PROFILE.selections, customIngredients: PROFILE.customIngredients } });

class MemoryStore implements AsyncKeyValueStore {
  values = new Map<string, string>(); calls: string[] = []; failSetKey?: string;
  async getItem(key: string) { this.calls.push(`get:${key}`); return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.calls.push(`set:${key}`); if (key === this.failSetKey) throw new Error('injected failure'); this.values.set(key, value); }
}

describe('personal profile v4 persistence', () => {
  it('strictly round-trips schema v4, migrates v3, and rejects malformed documents', () => {
    expect(decodePersonalProfile(encodePersonalProfile(PROFILE))).toEqual({ ok: true, document: { schemaVersion: 4, profile: PROFILE } });
    expect(decodePersonalProfile(JSON.stringify({ schemaVersion: 3, profile: { ...PROFILE, nutritionThresholds: [{ ...PROFILE.nutritionThresholds[0], basis: 'per_100g' }] } }))).toEqual({ ok: true, document: { schemaVersion: 4, profile: PROFILE }, migratedFrom: 3 });
    expect(decodePersonalProfile(JSON.stringify({ schemaVersion: 3, profile: { ...PROFILE, extra: true } }))).toEqual({ ok: false, reason: 'invalid_document' });
    expect(decodePersonalProfile(JSON.stringify({ schemaVersion: 3, profile: { ...PROFILE, nutritionThresholds: [{ ...PROFILE.nutritionThresholds[0], threshold: -1 }] } }))).toEqual({ ok: false, reason: 'invalid_document' });
    expect(decodePersonalProfile(JSON.stringify({ schemaVersion: 5, profile: PROFILE }))).toEqual({ ok: false, reason: 'unsupported_version' });
  });

  it('migrates strict v2 data in memory without writing or losing ingredients', async () => {
    expect(decodePersonalProfile(V2_DOCUMENT)).toEqual({
      ok: true,
      document: { schemaVersion: 4, profile: { selections: PROFILE.selections, customIngredients: PROFILE.customIngredients, nutritionThresholds: [] } },
      migratedFrom: 2,
    });
    const storage = new MemoryStore(); storage.values.set(PERSONAL_PROFILE_KEYS.v2Active, 'a'); storage.values.set(PERSONAL_PROFILE_KEYS.v2A, V2_DOCUMENT);
    const repository = new TwoSlotPersonalProfileRepository(storage);
    await expect(repository.load()).resolves.toEqual({ kind: 'migrated', profile: { selections: PROFILE.selections, customIngredients: PROFILE.customIngredients, nutritionThresholds: [] } });
    expect(storage.calls.filter((call) => call.startsWith('set:'))).toEqual([]);
    expect(storage.values.get(PERSONAL_PROFILE_KEYS.v2A)).toBe(V2_DOCUMENT);
  });

  it('writes verified v3 slots before flipping the pointer and alternates slots', async () => {
    const storage = new MemoryStore(); const repository = new TwoSlotPersonalProfileRepository(storage);
    await repository.save(PROFILE);
    expect(storage.calls.slice(-3)).toEqual([`set:${PERSONAL_PROFILE_KEYS.a}`, `get:${PERSONAL_PROFILE_KEYS.a}`, `set:${PERSONAL_PROFILE_KEYS.active}`]);
    expect(storage.values.get(PERSONAL_PROFILE_KEYS.active)).toBe('a');
    await repository.save(emptyPersonalProfile());
    expect(storage.values.get(PERSONAL_PROFILE_KEYS.active)).toBe('b');
  });

  it('preserves the active slot when an inactive write or pointer flip fails', async () => {
    const storage = new MemoryStore(); const repository = new TwoSlotPersonalProfileRepository(storage); await repository.save(PROFILE);
    storage.failSetKey = PERSONAL_PROFILE_KEYS.b;
    await expect(repository.save(emptyPersonalProfile())).rejects.toThrow('injected failure');
    expect(storage.values.get(PERSONAL_PROFILE_KEYS.active)).toBe('a');
    storage.failSetKey = PERSONAL_PROFILE_KEYS.active;
    await expect(repository.save(emptyPersonalProfile())).rejects.toThrow('injected failure');
    expect(storage.values.get(PERSONAL_PROFILE_KEYS.active)).toBe('a');
    await expect(repository.load()).resolves.toEqual({ kind: 'loaded', profile: PROFILE });
  });

  it('recovers a valid backup and never falls through corrupt v3 data to v2', async () => {
    const storage = new MemoryStore(); storage.values.set(PERSONAL_PROFILE_KEYS.active, 'a'); storage.values.set(PERSONAL_PROFILE_KEYS.a, '{bad'); storage.values.set(PERSONAL_PROFILE_KEYS.b, encodePersonalProfile(PROFILE));
    storage.values.set(PERSONAL_PROFILE_KEYS.v2A, V2_DOCUMENT);
    const repository = new TwoSlotPersonalProfileRepository(storage);
    await expect(repository.load()).resolves.toEqual({ kind: 'recovered', profile: PROFILE });
    storage.values.set(PERSONAL_PROFILE_KEYS.b, '{also bad');
    await expect(repository.load()).resolves.toEqual({ kind: 'corrupt' });
  });

  it('preserves the recovered slot when the next save fails', async () => {
    const storage = new MemoryStore();
    storage.values.set(PERSONAL_PROFILE_KEYS.active, 'a');
    storage.values.set(PERSONAL_PROFILE_KEYS.a, '{bad');
    storage.values.set(PERSONAL_PROFILE_KEYS.b, encodePersonalProfile(PROFILE));
    const repository = new TwoSlotPersonalProfileRepository(storage);

    await expect(repository.load()).resolves.toEqual({ kind: 'recovered', profile: PROFILE });
    storage.failSetKey = PERSONAL_PROFILE_KEYS.a;
    await expect(repository.save(emptyPersonalProfile())).rejects.toThrow('injected failure');
    await expect(repository.load()).resolves.toEqual({ kind: 'recovered', profile: PROFILE });
    expect(storage.values.get(PERSONAL_PROFILE_KEYS.b)).toBe(encodePersonalProfile(PROFILE));
  });

  it('retains v1 and creates an empty v3 with a one-time reset result', async () => {
    const storage = new MemoryStore(); storage.values.set(PERSONAL_PROFILE_KEYS.legacyActive, 'a'); storage.values.set(PERSONAL_PROFILE_KEYS.legacyA, JSON.stringify({ schemaVersion: 1, profile: { selectedPredefinedIds: ['milk'], customIngredients: [] } }));
    const repository = new TwoSlotPersonalProfileRepository(storage);
    await expect(repository.load()).resolves.toEqual({ kind: 'reset', profile: emptyPersonalProfile() });
    expect(storage.values.get(PERSONAL_PROFILE_KEYS.legacyA)).toBeDefined();
    await expect(repository.load()).resolves.toEqual({ kind: 'loaded', profile: emptyPersonalProfile() });
  });
});
