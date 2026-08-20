import { NutrientId, nutrientIds, NormalizedProduct } from '@/domain/product-lookup/types';

import { ProductLookupState } from './lookup-state-machine';

export type ResultAction = 'retry' | 'scan_another';

export type NutrientRow = {
  id: NutrientId;
  label: string;
  displayValue: string;
  available: boolean;
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
  ingredients: { text: string; available: boolean };
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

export function presentProductLookup(state: ProductLookupState): ProductLookupPresentation {
  if (state.status === 'loading') {
    return {
      kind: 'loading',
      title: 'Wyszukiwanie produktu…',
      detail: `Kod: ${state.barcode}`,
      actions: ['scan_another'],
    };
  }
  if (state.status === 'resolved') {
    if (state.result.outcome === 'found') return found(state.result.barcode, state.result.product, state.result.source.providerProductUrl);
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

function found(barcode: string, product: NormalizedProduct, providerProductUrl: string | null): FoundProductPresentation {
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
    nutriScore:
      product.nutriScore.status === 'available'
        ? product.nutriScore.grade.toUpperCase()
        : 'Brak danych',
    ingredients:
      product.ingredients.status === 'available'
        ? { text: product.ingredients.names.join(', '), available: true }
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
