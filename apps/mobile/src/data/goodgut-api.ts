import { decodeProductLookup, ProductLookupDecodeError } from '@/domain/product-lookup/decoder';
import { ProductLookup } from '@/domain/product-lookup/types';

export type GoodGutClientErrorKind =
  | 'missing_configuration'
  | 'transport_failure'
  | 'http_error'
  | 'invalid_response';

export class GoodGutClientError extends Error {
  constructor(
    readonly kind: GoodGutClientErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'GoodGutClientError';
  }
}

type Fetch = typeof fetch;

const DEFAULT_TIMEOUT_MS = 15_000;

export async function lookupProduct(
  barcode: string,
  options: { baseUrl?: string; fetch?: Fetch; signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<ProductLookup> {
  const baseUrl = configuredBaseUrl(options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL);
  const request = options.fetch ?? fetch;
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller, { once: true });
  if (options.signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    let response: Response;
    try {
      response = await request(`${baseUrl}/products/${encodeURIComponent(barcode)}`, {
        signal: controller.signal,
      });
    } catch {
      throw new GoodGutClientError('transport_failure', 'Could not reach the GoodGut API.');
    }
    if (!response.ok) {
      throw new GoodGutClientError('http_error', `GoodGut API returned HTTP ${response.status}.`, response.status);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (controller.signal.aborted) {
        throw new GoodGutClientError('transport_failure', 'GoodGut API request timed out.');
      }
      throw new GoodGutClientError('invalid_response', 'GoodGut API returned invalid JSON.');
    }
    try {
      return decodeProductLookup(body);
    } catch (error) {
      if (error instanceof ProductLookupDecodeError) {
        throw new GoodGutClientError('invalid_response', error.message);
      }
      throw error;
    }
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }
}

export function configuredBaseUrl(value: string | undefined): string {
  if (!value?.trim()) {
    throw new GoodGutClientError(
      'missing_configuration',
      'EXPO_PUBLIC_API_BASE_URL is not configured.',
    );
  }
  const normalized = value.trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new GoodGutClientError('missing_configuration', 'EXPO_PUBLIC_API_BASE_URL is invalid.');
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new GoodGutClientError('missing_configuration', 'EXPO_PUBLIC_API_BASE_URL is invalid.');
  }
  return normalized;
}
