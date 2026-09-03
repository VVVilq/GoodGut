import { emptyPersonalProfile, PersonalProfile } from '@/domain/personal-profile';
import { decodePersonalProfile, encodePersonalProfile, isV1PersonalProfile } from './personal-profile-codec';

export type AsyncKeyValueStore = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
export type PersonalProfileLoadResult =
  | { kind: 'empty' | 'loaded' | 'migrated' | 'recovered' | 'reset'; profile: PersonalProfile }
  | { kind: 'corrupt' | 'storage_error' };
export interface PersonalProfileRepository { load(): Promise<PersonalProfileLoadResult>; save(profile: PersonalProfile): Promise<void>; }

export const PERSONAL_PROFILE_KEYS = Object.freeze({
  active: 'goodgut.personal-profile.v3.active', a: 'goodgut.personal-profile.v3.slot.a', b: 'goodgut.personal-profile.v3.slot.b',
  v2Active: 'goodgut.personal-profile.v2.active', v2A: 'goodgut.personal-profile.v2.slot.a', v2B: 'goodgut.personal-profile.v2.slot.b',
  legacyActive: 'goodgut.personal-profile.active', legacyA: 'goodgut.personal-profile.slot.a', legacyB: 'goodgut.personal-profile.slot.b',
});
type Slot = 'a' | 'b';

export class TwoSlotPersonalProfileRepository implements PersonalProfileRepository {
  constructor(private readonly storage: AsyncKeyValueStore) {}
  async load(): Promise<PersonalProfileLoadResult> {
    try {
      const current = await this.readSlots(PERSONAL_PROFILE_KEYS.active, PERSONAL_PROFILE_KEYS.a, PERSONAL_PROFILE_KEYS.b);
      if (current.hasData) {
        const resolved = resolveSlots(current);
        return resolved ? { kind: resolved.recovered ? 'recovered' : 'loaded', profile: resolved.profile } : { kind: 'corrupt' };
      }
      const v2 = await this.readSlots(PERSONAL_PROFILE_KEYS.v2Active, PERSONAL_PROFILE_KEYS.v2A, PERSONAL_PROFILE_KEYS.v2B);
      if (v2.hasData) {
        const resolved = resolveSlots(v2, 2);
        return resolved ? { kind: 'migrated', profile: resolved.profile } : { kind: 'corrupt' };
      }
      const legacyPointer = await this.storage.getItem(PERSONAL_PROFILE_KEYS.legacyActive);
      const legacyA = await this.storage.getItem(PERSONAL_PROFILE_KEYS.legacyA);
      const legacyB = await this.storage.getItem(PERSONAL_PROFILE_KEYS.legacyB);
      const legacy = legacyPointer === 'b' ? legacyB : legacyA ?? legacyB;
      if (legacy && isV1PersonalProfile(legacy)) {
        const profile = emptyPersonalProfile(); await this.save(profile); return { kind: 'reset', profile };
      }
      return { kind: 'empty', profile: emptyPersonalProfile() };
    } catch { return { kind: 'storage_error' }; }
  }
  async save(profile: PersonalProfile): Promise<void> {
    const serialized = encodePersonalProfile(profile);
    const pointer = await this.storage.getItem(PERSONAL_PROFILE_KEYS.active);
    const target: Slot = pointer === 'a' ? 'b' : 'a';
    const targetKey = PERSONAL_PROFILE_KEYS[target];
    await this.storage.setItem(targetKey, serialized);
    const written = await this.storage.getItem(targetKey);
    const decoded = written === null ? null : decodePersonalProfile(written);
    if (!decoded?.ok || decoded.migratedFrom || encodePersonalProfile(decoded.document.profile) !== serialized) throw new Error('Personal profile write verification failed');
    await this.storage.setItem(PERSONAL_PROFILE_KEYS.active, target);
  }
  private async readSlots(activeKey: string, aKey: string, bKey: string) {
    const pointer = await this.storage.getItem(activeKey); const a = await this.storage.getItem(aKey); const b = await this.storage.getItem(bKey);
    return { pointer, a, b, hasData: pointer !== null || a !== null || b !== null };
  }
}

function resolveSlots(slots: { pointer: string | null; a: string | null; b: string | null }, requiredSourceVersion?: 2): { profile: PersonalProfile; recovered: boolean } | null {
  const activeSlot = slots.pointer === 'a' || slots.pointer === 'b' ? slots.pointer : null;
  const active = activeSlot ? decodeSlot(activeSlot === 'a' ? slots.a : slots.b, requiredSourceVersion) : null;
  if (active) return { profile: active, recovered: false };
  const backup = activeSlot === 'a' ? decodeSlot(slots.b, requiredSourceVersion) : activeSlot === 'b' ? decodeSlot(slots.a, requiredSourceVersion) : decodeSlot(slots.a, requiredSourceVersion) ?? decodeSlot(slots.b, requiredSourceVersion);
  return backup ? { profile: backup, recovered: true } : null;
}
function decodeSlot(value: string | null, requiredSourceVersion?: 2): PersonalProfile | null {
  if (value === null) return null; const decoded = decodePersonalProfile(value);
  return decoded.ok && (!requiredSourceVersion || decoded.migratedFrom === requiredSourceVersion) ? decoded.document.profile : null;
}
