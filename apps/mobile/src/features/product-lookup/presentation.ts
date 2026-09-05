import { NutrientId, nutrientIds, NormalizedProduct } from '@/domain/product-lookup/types';
import { PersonalProfileState } from '@/features/personal-profile/profile-store';

import {
  composeIngredientWarnings,
  IngredientWarningComposition,
} from './ingredient-warning-composition';
import { ProductLookupState } from './lookup-state-machine';

export type ResultAction = 'retry' | 'scan_another' | 'retry_profile' | 'open_profile';

export type NutrientRow = {
  id: NutrientId;
  label: string;
  displayValue: string;
  available: boolean;
};

export type IngredientItem = {
  text: string;
  state: 'normal' | 'unrecognized' | 'warning';
  accessibilityLabel: string;
};

export type IngredientWarningPresentation =
  | { kind: 'none' }
  | { kind: 'loading'; title: string; detail: string; actions: readonly ResultAction[] }
  | { kind: 'profile_error'; title: string; detail: string; actions: readonly ResultAction[] }
  | { kind: 'unavailable'; title: string; detail: string; actions: readonly ResultAction[] }
  | { kind: 'incomplete'; title: string; detail: string; actions: readonly ResultAction[] }
  | { kind: 'no_triggers'; title: string; detail: string; actions: readonly ResultAction[] }
  | {
      kind: 'triggered';
      title: string;
      detail: string;
      warnings: readonly {
        ruleId: string;
        ruleLabel: string;
        matchedIngredientNames: readonly string[];
      }[];
      actions: readonly ResultAction[];
    };

export type FoundProductPresentation = {
  kind: 'found';
  title: string;
  barcode: string;
  identity: {
    displayName: string;
    brands: string | null;
    quantity: string | null;
    imageUrl: string | null;
  };
  providerProductUrl: string | null;
  nutriScore: string;
  ingredientWarnings: IngredientWarningPresentation;
  ingredients:
    | { available: true; items: readonly IngredientItem[]; partialSummary: string | null }
    | { available: false; text: string };
  nutrients: readonly NutrientRow[];
  actions: readonly ResultAction[];
};

export type StatusPresentation = {
  kind: 'loading' | 'not_found' | 'source_error' | 'client_error' | 'empty';
  title: string;
  detail: string;
  actions: readonly ResultAction[];
};

export type ProductLookupPresentation = FoundProductPresentation | StatusPresentation;

const nutrientLabels: Record<NutrientId, string> = {
  energy_kcal: 'Energia',
  carbohydrates: 'Węglowodany',
  sugars: 'Cukry',
  fat: 'Tłuszcz',
  saturated_fat: 'Kwasy tłuszczowe nasycone',
  fiber: 'Błonnik',
  protein: 'Białko',
  salt: 'Sól',
};

export function presentProductLookup(
  state: ProductLookupState,
  profileState: PersonalProfileState,
): ProductLookupPresentation {
  if (state.status === 'loading') {
    return {
      kind: 'loading',
      title: 'Wyszukiwanie produktu…',
      detail: `Kod: ${state.barcode}`,
      actions: ['scan_another'],
    };
  }
  if (state.status === 'resolved') {
    if (state.result.outcome === 'found') {
      return found(
        state.result.barcode,
        state.result.product,
        state.result.source.providerProductUrl,
        composeIngredientWarnings(state, profileState),
      );
    }
    if (state.result.outcome === 'not_found') {
      return {
        kind: 'not_found',
        title: 'Nie znaleziono produktu',
        detail: `Open Food Facts nie zawiera produktu o kodzie ${state.barcode}.`,
        actions: ['scan_another'],
      };
    }
    return {
      kind: 'source_error',
      title: sourceErrorTitle(state.result.errorCategory),
      detail: sourceErrorDetail(state.result.errorCategory),
      actions: ['retry', 'scan_another'],
    };
  }
  if (state.status === 'client_error') {
    return {
      kind: 'client_error',
      title: clientErrorTitle(state.error.kind),
      detail: clientErrorDetail(state.error.kind),
      actions: ['retry', 'scan_another'],
    };
  }
  return {
    kind: 'empty',
    title: 'Brak aktywnego wyszukiwania',
    detail: 'Wróć do skanera i podaj kod produktu.',
    actions: ['scan_another'],
  };
}

function found(
  barcode: string,
  product: NormalizedProduct,
  providerProductUrl: string | null,
  warningComposition: IngredientWarningComposition,
): FoundProductPresentation {
  const matchedNames = warningComposition.kind === 'triggered'
    ? new Set(warningComposition.matchedIngredientNames)
    : new Set<string>();
  return {
    kind: 'found',
    title: 'Informacje o produkcie',
    barcode,
    identity: {
      displayName: product.identity.displayName,
      brands: product.identity.brands.length > 0 ? product.identity.brands.join(', ') : null,
      quantity: product.identity.quantity,
      imageUrl: product.identity.imageUrl,
    },
    providerProductUrl,
    ingredientWarnings: ingredientWarningPresentation(warningComposition),
    nutriScore:
      product.nutriScore.status === 'available'
        ? product.nutriScore.grade.toUpperCase()
        : 'Brak danych',
    ingredients:
      product.ingredients.status === 'available'
        ? {
            available: true,
            partialSummary: product.ingredients.completeness === 'partial'
              ? 'Nie wszystkie składniki zostały rozpoznane.'
              : null,
            items: product.ingredients.items.map((item) => {
              const warning = matchedNames.has(item.displayName);
              const state = warning ? 'warning' : item.recognition === 'unrecognized' ? 'unrecognized' : 'normal';
              return {
                text: item.displayName,
                state,
                accessibilityLabel: state === 'warning'
                  ? `Ostrzeżenie: ${item.displayName}`
                  : state === 'unrecognized'
                    ? `Nierozpoznany składnik: ${item.displayName}`
                    : item.displayName,
              };
            }),
          }
        : {
            text:
              product.ingredients.status === 'missing'
                ? 'Brak danych o składnikach'
                : 'Nie udało się wiarygodnie odczytać składników',
            available: false,
          },
    nutrients: nutrientIds.map((id) => {
      const fact = product.nutrition[id];
      if (fact.status === 'unavailable') {
        return { id, label: nutrientLabels[id], displayValue: 'Brak danych', available: false };
      }
      const basis = fact.basis === 'per_100g' ? '100 g' : '100 ml';
      return {
        id,
        label: nutrientLabels[id],
        displayValue: `${formatNumber(fact.value)} ${fact.unit} / ${basis}`,
        available: true,
      };
    }),
    actions: ['scan_another'],
  };
}

function ingredientWarningPresentation(
  composition: IngredientWarningComposition,
): IngredientWarningPresentation {
  switch (composition.kind) {
    case 'not_applicable':
    case 'no_rules':
      return { kind: 'none' };
    case 'profile_loading':
      return {
        kind: 'loading',
        title: 'Sprawdzanie Twoich reguł…',
        detail: 'Informacje o produkcie są już dostępne. Profil jest jeszcze wczytywany.',
        actions: [],
      };
    case 'profile_error':
      return {
        kind: 'profile_error',
        title: 'Nie udało się sprawdzić Twoich reguł',
        detail: 'Profil jest niedostępny. Nie traktuj tego wyniku jako braku ostrzeżeń.',
        actions: ['retry_profile', 'open_profile'],
      };
    case 'ingredients_unavailable':
      return {
        kind: 'unavailable',
        title: 'Nie można sprawdzić unikanych składników',
        detail: composition.reason === 'missing'
          ? 'Produkt nie ma danych o składnikach potrzebnych do oceny Twoich reguł.'
          : 'Składników produktu nie udało się odczytać wystarczająco wiarygodnie.',
        actions: [],
      };
    case 'no_triggers':
      return {
        kind: 'no_triggers',
        title: '0 ostrzeżeń',
        detail: `Żadna z ${composition.ruleCount} skonfigurowanych reguł nie pasuje do dostępnych składników.`,
        actions: [],
      };
    case 'incomplete':
      return {
        kind: 'incomplete',
        title: 'Ocena składników jest niepełna',
        detail: `Nie znaleziono pewnego dopasowania, ale nie udało się sprawdzić wszystkich ${composition.ruleCount} reguł.`,
        actions: [],
      };
    case 'triggered':
      return {
        kind: 'triggered',
        title: `${composition.triggerCount} ${warningCountLabel(composition.triggerCount)}`,
        detail: composition.incomplete
          ? 'Znaleziono pewne dopasowania, ale ocena pozostałych składników jest niepełna.'
          : 'Produkt zawiera składniki pasujące do Twoich reguł.',
        warnings: composition.warnings,
        actions: [],
      };
  }
}

function warningCountLabel(count: number): string {
  return count === 1 ? 'ostrzeżenie' : count < 5 ? 'ostrzeżenia' : 'ostrzeżeń';
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : String(value);
}

function sourceErrorTitle(category: 'rate_limited' | 'network_error' | 'invalid_source_response' | 'source_unavailable') {
  return category === 'rate_limited' ? 'Źródło ograniczyło liczbę zapytań' : 'Dane produktu są chwilowo niedostępne';
}

function sourceErrorDetail(category: 'rate_limited' | 'network_error' | 'invalid_source_response' | 'source_unavailable') {
  const details = {
    rate_limited: 'Odczekaj chwilę i spróbuj ponownie.',
    network_error: 'Serwer GoodGut nie mógł połączyć się ze źródłem danych.',
    invalid_source_response: 'Źródło zwróciło dane, których nie można bezpiecznie wyświetlić.',
    source_unavailable: 'Open Food Facts nie odpowiada prawidłowo. Spróbuj ponownie później.',
  };
  return details[category];
}

function clientErrorTitle(kind: 'missing_configuration' | 'transport_failure' | 'http_error' | 'invalid_response' | 'unexpected') {
  return kind === 'transport_failure' ? 'Brak połączenia z GoodGut' : 'Nie udało się pobrać produktu';
}

function clientErrorDetail(kind: 'missing_configuration' | 'transport_failure' | 'http_error' | 'invalid_response' | 'unexpected') {
  const details = {
    missing_configuration: 'Adres API nie został skonfigurowany w aplikacji.',
    transport_failure: 'Sprawdź połączenie z siecią i dostępność serwera GoodGut.',
    http_error: 'Serwer GoodGut odrzucił zapytanie.',
    invalid_response: 'Serwer GoodGut zwrócił odpowiedź, której aplikacja nie może bezpiecznie odczytać.',
    unexpected: 'Wystąpił nieoczekiwany błąd aplikacji.',
  };
  return details[kind];
}
