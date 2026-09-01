import { configuredBaseUrl, GoodGutClientError } from './goodgut-api';
import { CatalogueDecodeError, CataloguePage, decodeCataloguePage } from '@/domain/ingredient-catalogue';

type Fetch = typeof fetch;

export async function fetchPromotedCatalogue(options: { baseUrl?: string; fetch?: Fetch } = {}): Promise<CataloguePage> {
  return requestCatalogue('/ingredient-catalogue/promoted?locale=pl', options);
}

export async function searchIngredientCatalogue(query: string, options: { baseUrl?: string; fetch?: Fetch; page?: number; size?: number; signal?: AbortSignal } = {}): Promise<CataloguePage> {
  const parameters = new URLSearchParams({ q: query, locale: 'pl', page: String(options.page ?? 0), size: String(options.size ?? 20) });
  return requestCatalogue(`/ingredient-catalogue/search?${parameters}`, options);
}

export async function fetchCatalogueChildren(nodeId: string, options: { baseUrl?: string; fetch?: Fetch; signal?: AbortSignal } = {}): Promise<CataloguePage> {
  const parameters = new URLSearchParams({ nodeId, locale: 'pl' });
  return requestCatalogue(`/ingredient-catalogue/children?${parameters}`, options);
}

async function requestCatalogue(path: string, options: { baseUrl?: string; fetch?: Fetch; signal?: AbortSignal }): Promise<CataloguePage> {
  const baseUrl = configuredBaseUrl(options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL);
  let response: Response;
  try { response = await (options.fetch ?? fetch)(`${baseUrl}${path}`, { signal: options.signal }); }
  catch { throw new GoodGutClientError('transport_failure', 'Could not reach the ingredient catalogue.'); }
  if (!response.ok) throw new GoodGutClientError('http_error', `Ingredient catalogue returned HTTP ${response.status}.`, response.status);
  try { return decodeCataloguePage(await response.json()); }
  catch (error) {
    if (error instanceof CatalogueDecodeError || error instanceof SyntaxError) throw new GoodGutClientError('invalid_response', 'Ingredient catalogue returned invalid data.');
    throw error;
  }
}
