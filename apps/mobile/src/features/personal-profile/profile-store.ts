import { PersonalProfileLoadResult, PersonalProfileRepository } from '@/data/personal-profile-repository';
import { AvoidedIngredientProfile, emptyAvoidedIngredientProfile, profileToIngredientRules } from '@/domain/avoided-ingredients/profile';
import { IngredientRule } from '@/domain/personal-rules';

type ProfileErrorKind = 'corrupt' | 'storage';

export type PersonalProfileState =
  | { status: 'hydrating' }
  | { status: 'ready'; activeProfile: AvoidedIngredientProfile }
  | { status: 'recovered'; activeProfile: AvoidedIngredientProfile }
  | { status: 'reset_notice'; activeProfile: AvoidedIngredientProfile }
  | { status: 'load_error'; error: ProfileErrorKind }
  | { status: 'saving'; activeProfile: AvoidedIngredientProfile; candidate: AvoidedIngredientProfile }
  | { status: 'save_error'; activeProfile: AvoidedIngredientProfile; candidate: AvoidedIngredientProfile; error: 'storage' };

export class PersonalProfileStore {
  private state: PersonalProfileState = { status: 'hydrating' };
  private listeners = new Set<() => void>();

  constructor(private readonly repository: PersonalProfileRepository) {}
  getState = (): PersonalProfileState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async hydrate(): Promise<void> {
    this.setState({ status: 'hydrating' });
    this.applyLoadResult(await this.repository.load());
  }

  async save(candidate: AvoidedIngredientProfile): Promise<boolean> {
    const activeProfile = activeProfileFromState(this.state);
    if (!activeProfile) return false;
    this.setState({ status: 'saving', activeProfile, candidate });
    try {
      await this.repository.save(candidate);
      this.setState({ status: 'ready', activeProfile: candidate });
      return true;
    } catch {
      this.setState({ status: 'save_error', activeProfile, candidate, error: 'storage' });
      return false;
    }
  }

  retrySave(): Promise<boolean> {
    return this.state.status === 'save_error' ? this.save(this.state.candidate) : Promise.resolve(false);
  }

  restoreSaved(): boolean {
    if (this.state.status !== 'save_error' && this.state.status !== 'saving') return false;
    this.setState({ status: 'ready', activeProfile: this.state.activeProfile });
    return true;
  }

  async replaceCorruptWithEmptyProfile(): Promise<boolean> {
    if (this.state.status !== 'load_error' || this.state.error !== 'corrupt') return false;
    const empty = emptyAvoidedIngredientProfile();
    try {
      await this.repository.save(empty);
      this.setState({ status: 'ready', activeProfile: empty });
      return true;
    } catch {
      this.setState({ status: 'load_error', error: 'storage' });
      return false;
    }
  }

  private applyLoadResult(result: PersonalProfileLoadResult) {
    if (result.kind === 'empty' || result.kind === 'loaded') {
      this.setState({ status: 'ready', activeProfile: result.profile });
    } else if (result.kind === 'reset') {
      this.setState({ status: 'reset_notice', activeProfile: result.profile });
    } else if (result.kind === 'recovered') {
      this.setState({ status: 'recovered', activeProfile: result.profile });
    } else {
      this.setState({ status: 'load_error', error: result.kind === 'corrupt' ? 'corrupt' : 'storage' });
    }
  }

  private setState(state: PersonalProfileState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}

export function activeProfileFromState(state: PersonalProfileState): AvoidedIngredientProfile | undefined {
  return 'activeProfile' in state ? state.activeProfile : undefined;
}

export function activeIngredientRulesFromState(state: PersonalProfileState): IngredientRule[] | undefined {
  const profile = activeProfileFromState(state);
  return profile ? profileToIngredientRules(profile) : undefined;
}
