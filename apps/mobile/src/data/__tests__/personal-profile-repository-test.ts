import { AsyncKeyValueStore, PERSONAL_PROFILE_KEYS, TwoSlotPersonalProfileRepository } from '@/data/personal-profile-repository';
import { decodePersonalProfile, encodePersonalProfile } from '@/data/personal-profile-codec';
import { AvoidedIngredientProfile, emptyAvoidedIngredientProfile } from '@/domain/avoided-ingredients/profile';

const PROFILE: AvoidedIngredientProfile = { selectedPredefinedIds: ['sucralose'], customIngredients: [{ id: 'custom-1', name: 'Inulina' }] };

class FakeStorage implements AsyncKeyValueStore {
  readonly values = new Map<string, string>();
  readonly calls: string[] = [];
  failAtCall?: number;
  async getItem(key: string) { this.record(`get:${key}`); return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.record(`set:${key}`); this.values.set(key, value); }
  private record(call: string) { this.calls.push(call); if (this.calls.length === this.failAtCall) throw new Error('injected failure'); }
}

describe('personal profile codec', () => {
  it('round-trips schema v1', () => {
    expect(decodePersonalProfile(encodePersonalProfile(PROFILE))).toEqual({ ok: true, document: { schemaVersion: 1, profile: PROFILE } });
  });
  it.each([
    ['bad json', '{'],
    ['wrong version', JSON.stringify({ schemaVersion: 2, profile: PROFILE })],
    ['extra field', JSON.stringify({ schemaVersion: 1, profile: PROFILE, extra: true })],
    ['extra profile field', JSON.stringify({ schemaVersion: 1, profile: { ...PROFILE, extra: true } })],
    ['unknown catalogue id', JSON.stringify({ schemaVersion: 1, profile: { ...PROFILE, selectedPredefinedIds: ['unknown'] } })],
  ])('rejects %s', (_label, value) => expect(decodePersonalProfile(value).ok).toBe(false));
});

describe('TwoSlotPersonalProfileRepository', () => {
  it('distinguishes empty from corrupt storage', async () => {
    const storage = new FakeStorage();
    const repository = new TwoSlotPersonalProfileRepository(storage);
    await expect(repository.load()).resolves.toEqual({ kind: 'empty', profile: emptyAvoidedIngredientProfile() });
    storage.values.set(PERSONAL_PROFILE_KEYS.active, 'a');
    storage.values.set(PERSONAL_PROFILE_KEYS.a, '{bad');
    await expect(repository.load()).resolves.toEqual({ kind: 'corrupt' });
  });
  it('recovers a backup without writing', async () => {
    const storage = new FakeStorage();
    storage.values.set(PERSONAL_PROFILE_KEYS.active, 'a');
    storage.values.set(PERSONAL_PROFILE_KEYS.a, '{bad');
    storage.values.set(PERSONAL_PROFILE_KEYS.b, encodePersonalProfile(PROFILE));
    await expect(new TwoSlotPersonalProfileRepository(storage).load()).resolves.toEqual({ kind: 'recovered', profile: PROFILE });
    expect(storage.calls.every((call) => call.startsWith('get:'))).toBe(true);
  });
  it('writes and verifies before flipping the pointer, then alternates slots', async () => {
    const storage = new FakeStorage();
    const repository = new TwoSlotPersonalProfileRepository(storage);
    await repository.save(PROFILE);
    expect(storage.calls.map((call) => call.split(':').slice(0, 2).join(':'))).toEqual([
      `get:${PERSONAL_PROFILE_KEYS.active}`, `set:${PERSONAL_PROFILE_KEYS.a}`,
      `get:${PERSONAL_PROFILE_KEYS.a}`, `set:${PERSONAL_PROFILE_KEYS.active}`,
    ]);
    expect(storage.values.get(PERSONAL_PROFILE_KEYS.active)).toBe('a');
    await repository.save(emptyAvoidedIngredientProfile());
    expect(storage.values.get(PERSONAL_PROFILE_KEYS.active)).toBe('b');
  });
  it.each([1, 2, 3, 4])('preserves old active data when operation %s fails', async (failAtCall) => {
    const storage = new FakeStorage();
    storage.values.set(PERSONAL_PROFILE_KEYS.active, 'a');
    storage.values.set(PERSONAL_PROFILE_KEYS.a, encodePersonalProfile(PROFILE));
    storage.failAtCall = failAtCall;
    const repository = new TwoSlotPersonalProfileRepository(storage);
    await expect(repository.save(emptyAvoidedIngredientProfile())).rejects.toThrow();
    expect(storage.values.get(PERSONAL_PROFILE_KEYS.active)).toBe('a');
    storage.failAtCall = undefined;
    await expect(repository.load()).resolves.toEqual({ kind: 'loaded', profile: PROFILE });
  });
  it('reports read failures', async () => {
    const storage = new FakeStorage(); storage.failAtCall = 1;
    await expect(new TwoSlotPersonalProfileRepository(storage).load()).resolves.toEqual({ kind: 'storage_error' });
  });
});
