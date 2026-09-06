import { NutrientId, nutrientIds, NormalizedProduct } from '@/domain/product-lookup/types';
import { PersonalProfileState } from '@/features/personal-profile/profile-store';
import { PersonalWarningComposition, composePersonalWarnings, UnavailablePersonalRule } from './personal-warning-composition';
import { ProductLookupState } from './lookup-state-machine';

export type ResultAction = 'retry' | 'scan_another' | 'retry_profile' | 'open_profile';
export type NutrientRow = { id: NutrientId; label: string; displayValue: string; available: boolean; warning: boolean; warningDetail: string | null };
export type IngredientItem = { text: string; state: 'normal' | 'unrecognized' | 'warning'; accessibilityLabel: string };
export type PersonalWarningPresentation =
  | { kind: 'none' }
  | { kind: 'loading'; title: string; detail: string; actions: readonly ResultAction[] }
  | { kind: 'profile_error'; title: string; detail: string; actions: readonly ResultAction[] }
  | { kind: 'evaluated'; title: string; detail: string; incomplete: boolean; unavailableDetails: readonly string[]; actions: readonly ResultAction[] };
export type FoundProductPresentation = {
  kind: 'found'; title: string; barcode: string;
  identity: { displayName: string; brands: string | null; quantity: string | null; imageUrl: string | null };
  providerProductUrl: string | null; nutriScore: string; ingredientWarnings: PersonalWarningPresentation;
  ingredients: { available: true; items: readonly IngredientItem[]; partialSummary: string | null } | { available: false; text: string };
  nutrients: readonly NutrientRow[]; actions: readonly ResultAction[];
};
export type StatusPresentation = { kind: 'loading' | 'not_found' | 'source_error' | 'client_error' | 'empty'; title: string; detail: string; actions: readonly ResultAction[] };
export type ProductLookupPresentation = FoundProductPresentation | StatusPresentation;

const nutrientLabels: Record<NutrientId, string> = { energy_kcal: 'Energia', carbohydrates: 'W\u0119glowodany', sugars: 'Cukry', fat: 'T\u0142uszcz', saturated_fat: 'Kwasy t\u0142uszczowe nasycone', fiber: 'B\u0142onnik', protein: 'Bia\u0142ko', salt: 'S\u00f3l' };

export function presentProductLookup(state: ProductLookupState, profileState: PersonalProfileState): ProductLookupPresentation {
  if (state.status === 'loading') return { kind: 'loading', title: 'Wyszukiwanie produktu\u2026', detail: `Kod: ${state.barcode}`, actions: ['scan_another'] };
  if (state.status === 'resolved') {
    if (state.result.outcome === 'found') return found(state.result.barcode, state.result.product, state.result.source.providerProductUrl, composePersonalWarnings(state, profileState));
    if (state.result.outcome === 'not_found') return { kind: 'not_found', title: 'Nie znaleziono produktu', detail: `Open Food Facts nie zawiera produktu o kodzie ${state.barcode}.`, actions: ['scan_another'] };
    return { kind: 'source_error', title: sourceErrorTitle(state.result.errorCategory), detail: sourceErrorDetail(state.result.errorCategory), actions: ['retry', 'scan_another'] };
  }
  if (state.status === 'client_error') return { kind: 'client_error', title: clientErrorTitle(state.error.kind), detail: clientErrorDetail(state.error.kind), actions: ['retry', 'scan_another'] };
  return { kind: 'empty', title: 'Brak aktywnego wyszukiwania', detail: 'Wro\u0107 do skanera i podaj kod produktu.', actions: ['scan_another'] };
}

function found(barcode: string, product: NormalizedProduct, providerProductUrl: string | null, composition: PersonalWarningComposition): FoundProductPresentation {
  const matchedNames = composition.kind === 'evaluated' ? new Set(composition.matchedIngredientNames) : new Set<string>();
  const warningByNutrient = composition.kind === 'evaluated' ? new Map(composition.nutritionWarnings.map(({ rule }) => [rule.nutrient, rule])) : new Map<NutrientId, never>();
  return { kind: 'found', title: 'Informacje o produkcie', barcode, identity: { displayName: product.identity.displayName, brands: product.identity.brands.length ? product.identity.brands.join(', ') : null, quantity: product.identity.quantity, imageUrl: product.identity.imageUrl }, providerProductUrl,
    ingredientWarnings: personalWarningPresentation(composition),
    nutriScore: product.nutriScore.status === 'available' ? product.nutriScore.grade.toUpperCase() : 'Brak danych',
    ingredients: product.ingredients.status === 'available' ? { available: true, partialSummary: product.ingredients.completeness === 'partial' ? 'Nie wszystkie składniki zostały rozpoznane.' : null, items: product.ingredients.items.map((item) => { const warning = matchedNames.has(item.displayName); const state = warning ? 'warning' : item.recognition === 'unrecognized' ? 'unrecognized' : 'normal'; return { text: item.displayName, state, accessibilityLabel: state === 'warning' ? `Ostrzeżenie: ${item.displayName}` : state === 'unrecognized' ? `Nierozpoznany składnik: ${item.displayName}` : item.displayName }; }) } : { available: false, text: product.ingredients.status === 'missing' ? 'Brak danych o składnikach' : 'Nie udało się wiarygodnie odczytać składników' },
    nutrients: nutrientIds.map((id) => { const fact = product.nutrition[id]; if (fact.status === 'unavailable') return { id, label: nutrientLabels[id], displayValue: 'Brak danych', available: false, warning: false, warningDetail: null }; const rule = warningByNutrient.get(id); const basis = fact.basis === 'per_100g' ? '100 g' : '100 ml'; return { id, label: nutrientLabels[id], displayValue: `${formatNumber(fact.value)} ${fact.unit} / ${basis}`, available: true, warning: Boolean(rule), warningDetail: rule ? thresholdDetail(rule) : null }; }), actions: ['scan_another'] };
}

function personalWarningPresentation(composition: PersonalWarningComposition): PersonalWarningPresentation {
  switch (composition.kind) {
    case 'not_applicable': case 'no_rules': return { kind: 'none' };
    case 'profile_loading': return { kind: 'loading', title: 'Sprawdzanie Twoich reguł…', detail: 'Informacje o produkcie są już dostępne. Profil jest jeszcze wczytywany.', actions: [] };
    case 'profile_error': return { kind: 'profile_error', title: 'Nie udało się sprawdzić Twoich reguł', detail: 'Profil jest niedostępny. Nie traktuj tego wyniku jako braku ostrzeżeń.', actions: ['retry_profile', 'open_profile'] };
    case 'evaluated': { const title = composition.incomplete ? composition.triggerCount === 0 ? 'Ocena niepełna — 0 potwierdzonych ostrzeżeń' : `${composition.triggerCount} ${warningCountLabel(composition.triggerCount)} — ocena niepełna` : `${composition.triggerCount} ${warningCountLabel(composition.triggerCount)}`; return { kind: 'evaluated', title, detail: composition.incomplete ? 'Nie wszystkie skonfigurowane reguły mogły zostać sprawdzone.' : composition.triggerCount ? 'Produkt przekracza co najmniej jeden z Twoich progów.' : 'Żadna skonfigurowana reguła nie została przekroczona.', incomplete: composition.incomplete, unavailableDetails: composition.unavailableRules.map(unavailableRuleDetail), actions: [] }; }
  }
}

function thresholdDetail(rule: { direction: 'above' | 'below'; threshold: number; basis: 'per_100g' | 'per_100ml' }): string { return `Twój próg: ${rule.direction === 'above' ? 'powyżej' : 'poniżej'} ${formatNumber(rule.threshold)} / ${rule.basis === 'per_100g' ? '100 g' : '100 ml'}`; }
function unavailableRuleDetail(item: UnavailablePersonalRule): string { if (item.kind === 'ingredient') return `${item.ruleLabel}: ${item.reason === 'partial' ? 'niepeĹ‚ne dane skĹ‚adnikĂłw' : 'brak danych o skĹ‚adnikach'}`; if (item.reason === 'basis_mismatch') return `${nutrientLabels[item.rule.nutrient]}: produkt ${item.productBasis === 'per_100g' ? '100 g' : '100 ml'}, prĂłg ${item.rule.basis === 'per_100g' ? '100 g' : '100 ml'}`; return `${nutrientLabels[item.rule.nutrient]}: ${{ missing_source: 'brak danych', unknown_basis: 'nieznana podstawa', invalid_value: 'nieprawidĹ‚owa wartoĹ›Ä‡', unsupported_unit: 'nieobsĹ‚ugiwana jednostka' }[item.reason]}`; }
function warningCountLabel(count: number): string { return count === 1 ? 'ostrzeżenie' : count < 5 ? 'ostrzeżenia' : 'ostrzeżeń'; }
function formatNumber(value: number): string { return Number.isInteger(value) ? value.toFixed(0) : String(value); }
function sourceErrorTitle(category: 'rate_limited' | 'network_error' | 'invalid_source_response' | 'source_unavailable') { return category === 'rate_limited' ? 'ĹąrĂłdĹ‚o ograniczyĹ‚o liczbÄ™ zapytaĹ„' : 'Dane produktu sÄ… chwilowo niedostÄ™pne'; }
function sourceErrorDetail(category: 'rate_limited' | 'network_error' | 'invalid_source_response' | 'source_unavailable') { return { rate_limited: 'Odczekaj chwilÄ™ i sprĂłbuj ponownie.', network_error: 'Serwer GoodGut nie mĂłgĹ‚ poĹ‚Ä…czyÄ‡ siÄ™ ze ĹşrĂłdĹ‚em danych.', invalid_source_response: 'ĹąrĂłdĹ‚o zwrĂłciĹ‚o dane, ktĂłrych nie moĹĽna bezpiecznie wyĹ›wietliÄ‡.', source_unavailable: 'Open Food Facts nie odpowiada prawidĹ‚owo. SprĂłbuj ponownie pĂłĹşniej.' }[category]; }
function clientErrorTitle(kind: 'missing_configuration' | 'transport_failure' | 'http_error' | 'invalid_response' | 'unexpected') { return kind === 'transport_failure' ? 'Brak poĹ‚Ä…czenia z GoodGut' : 'Nie udaĹ‚o siÄ™ pobraÄ‡ produktu'; }
function clientErrorDetail(kind: 'missing_configuration' | 'transport_failure' | 'http_error' | 'invalid_response' | 'unexpected') { return { missing_configuration: 'Adres API nie zostaĹ‚ skonfigurowany w aplikacji.', transport_failure: 'SprawdĹş poĹ‚Ä…czenie z sieciÄ… i dostÄ™pnoĹ›Ä‡ serwera GoodGut.', http_error: 'Serwer GoodGut odrzuciĹ‚ zapytanie.', invalid_response: 'Serwer GoodGut zwrĂłciĹ‚ odpowiedĹş, ktĂłrej aplikacja nie moĹĽe bezpiecznie odczytaÄ‡.', unexpected: 'WystÄ…piĹ‚ nieoczekiwany bĹ‚Ä…d aplikacji.' }[kind]; }
