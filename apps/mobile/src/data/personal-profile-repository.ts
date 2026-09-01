import { AvoidedIngredientProfile, emptyAvoidedIngredientProfile } from '@/domain/avoided-ingredients/profile';
import { decodePersonalProfile, encodePersonalProfile, isV1PersonalProfile } from './personal-profile-codec';

export type AsyncKeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export type PersonalProfileLoadResult =
  | { kind: 'empty'; profile: AvoidedIngredientProfile }
  | { kind: 'loaded'; profile: AvoidedIngredientProfile }
  | { kind: 'recovered'; profile: AvoidedIngredientProfile }
  | { kind: 'reset'; profile: AvoidedIngredientProfile }
  | { kind: 'corrupt' }
  | { kind: 'storage_error' };

export interface PersonalProfileRepository {
  load(): Promise<PersonalProfileLoadResult>;
  save(profile: AvoidedIngredientProfile): Promise<void>;
}

export const PERSONAL_PROFILE_KEYS = Object.freeze({
  active: 'goodgut.personal-profile.v2.active',
  a: 'goodgut.personal-profile.v2.slot.a',
  b: 'goodgut.personal-profile.v2.slot.b',
  legacyActive: 'goodgut.personal-profile.active',
  legacyA: 'goodgut.personal-profile.slot.a',
  legacyB: 'goodgut.personal-profile.slot.b',
});

type Slot = 'a' | 'b';

export class TwoSlotPersonalProfileRepository implements PersonalProfileRepository {
  constructor(private readonly storage: AsyncKeyValueStore) {}

  async load(): Promise<PersonalProfileLoadResult> {
    try {
      const pointer = await this.storage.getItem(PERSONAL_PROFILE_KEYS.active);
      const a = await this.storage.getItem(PERSONAL_PROFILE_KEYS.a);
      const b = await this.storage.getItem(PERSONAL_PROFILE_KEYS.b);
      if (pointer === null && a === null && b === null) {
        const legacyPointer = await this.storage.getItem(PERSONAL_PROFILE_KEYS.legacyActive);
        const legacyA = await this.storage.getItem(PERSONAL_PROFILE_KEYS.legacyA);
        const legacyB = await this.storage.getItem(PERSONAL_PROFILE_KEYS.legacyB);
        const legacy = legacyPointer === 'b' ? legacyB : legacyA ?? legacyB;
        if (legacy && isV1PersonalProfile(legacy)) {
          const profile = emptyAvoidedIngredientProfile();
          await this.save(profile);
          return { kind: 'reset', profile };
        }
        return { kind: 'empty', profile: emptyAvoidedIngredientProfile() };
      }
      const activeSlot = pointer === 'a' || pointer === 'b' ? pointer : null;
      const active = activeSlot ? decodeSlot(activeSlot === 'a' ? a : b) : null;
      if (active) return { kind: 'loaded', profile: active };
      const backup = activeSlot === 'a'
        ? decodeSlot(b)
        : activeSlot === 'b'
          ? decodeSlot(a)
          : decodeSlot(a) ?? decodeSlot(b);
      return backup ? { kind: 'recovered', profile: backup } : { kind: 'corrupt' };
    } catch {
      return { kind: 'storage_error' };
    }
  }

  async save(profile: AvoidedIngredientProfile): Promise<void> {
    const serialized = encodePersonalProfile(profile);
    const pointer = await this.storage.getItem(PERSONAL_PROFILE_KEYS.active);
    const target: Slot = pointer === 'a' ? 'b' : 'a';
    const targetKey = PERSONAL_PROFILE_KEYS[target];
    await this.storage.setItem(targetKey, serialized);
    const written = await this.storage.getItem(targetKey);
    const decoded = written === null ? null : decodePersonalProfile(written);
    if (!decoded?.ok || encodePersonalProfile(decoded.document.profile) !== serialized) {
      throw new Error('Personal profile write verification failed');
    }
    await this.storage.setItem(PERSONAL_PROFILE_KEYS.active, target);
  }
}

function decodeSlot(value: string | null): AvoidedIngredientProfile | null {
  if (value === null) return null;
  const decoded = decodePersonalProfile(value);
  return decoded.ok ? decoded.document.profile : null;
}
