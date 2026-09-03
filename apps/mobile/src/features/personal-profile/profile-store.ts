import { PersonalProfileLoadResult, PersonalProfileRepository } from '@/data/personal-profile-repository';
import { profileToIngredientRules } from '@/domain/avoided-ingredients/profile';
import { clonePersonalProfile, emptyPersonalProfile, PersonalProfile, profileToPersonalRules } from '@/domain/personal-profile';
import { IngredientRule, PersonalRule } from '@/domain/personal-rules';

type ProfileErrorKind = 'corrupt' | 'storage';
export type PersonalProfileState =
  | { status: 'hydrating' }
  | { status: 'ready' | 'migrated' | 'recovered' | 'reset_notice'; activeProfile: PersonalProfile }
  | { status: 'load_error'; error: ProfileErrorKind }
  | { status: 'saving'; activeProfile: PersonalProfile; candidate: PersonalProfile }
  | { status: 'save_error'; activeProfile: PersonalProfile; candidate: PersonalProfile; error: 'storage' };

export class PersonalProfileStore {
  private state: PersonalProfileState = { status: 'hydrating' }; private listeners = new Set<() => void>();
  constructor(private readonly repository: PersonalProfileRepository) {}
  getState = (): PersonalProfileState => this.state;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  async hydrate(): Promise<void> { this.setState({ status: 'hydrating' }); this.applyLoadResult(await this.repository.load()); }
  async save(candidate: PersonalProfile): Promise<boolean> {
    const activeProfile = activeProfileFromState(this.state); if (!activeProfile) return false;
    const submitted = clonePersonalProfile(candidate);
    this.setState({ status: 'saving', activeProfile, candidate: submitted });
    try { await this.repository.save(submitted); this.setState({ status: 'ready', activeProfile: submitted }); return true; }
    catch { this.setState({ status: 'save_error', activeProfile, candidate: submitted, error: 'storage' }); return false; }
  }
  retrySave(): Promise<boolean> { return this.state.status === 'save_error' ? this.save(this.state.candidate) : Promise.resolve(false); }
  restoreSaved(): boolean { if (this.state.status !== 'save_error' && this.state.status !== 'saving') return false; this.setState({ status: 'ready', activeProfile: this.state.activeProfile }); return true; }
  async replaceCorruptWithEmptyProfile(): Promise<boolean> {
    if (this.state.status !== 'load_error' || this.state.error !== 'corrupt') return false;
    const empty = emptyPersonalProfile();
    try { await this.repository.save(empty); this.setState({ status: 'ready', activeProfile: empty }); return true; }
    catch { this.setState({ status: 'load_error', error: 'storage' }); return false; }
  }
  private applyLoadResult(result: PersonalProfileLoadResult) {
    if (result.kind === 'empty' || result.kind === 'loaded') this.setState({ status: 'ready', activeProfile: result.profile });
    else if (result.kind === 'migrated') this.setState({ status: 'migrated', activeProfile: result.profile });
    else if (result.kind === 'reset') this.setState({ status: 'reset_notice', activeProfile: result.profile });
    else if (result.kind === 'recovered') this.setState({ status: 'recovered', activeProfile: result.profile });
    else this.setState({ status: 'load_error', error: result.kind === 'corrupt' ? 'corrupt' : 'storage' });
  }
  private setState(state: PersonalProfileState) { this.state = state; this.listeners.forEach((listener) => listener()); }
}
export function activeProfileFromState(state: PersonalProfileState): PersonalProfile | undefined { return 'activeProfile' in state ? state.activeProfile : undefined; }
export function activeIngredientRulesFromState(state: PersonalProfileState): IngredientRule[] | undefined { const profile = activeProfileFromState(state); return profile ? profileToIngredientRules(profile) : undefined; }
export function activePersonalRulesFromState(state: PersonalProfileState): PersonalRule[] | undefined { const profile = activeProfileFromState(state); return profile ? profileToPersonalRules(profile) : undefined; }
