import { IngredientCatalogueCache } from '@/data/ingredient-catalogue-cache';
import { fetchPromotedCatalogue, searchIngredientCatalogue } from '@/data/ingredient-catalogue-api';
import { CatalogueItem } from '@/domain/ingredient-catalogue';

export type CatalogueState =
  | { status: 'loading'; items: readonly CatalogueItem[] }
  | { status: 'ready'; items: readonly CatalogueItem[]; version: string }
  | { status: 'stale'; items: readonly CatalogueItem[]; version: string }
  | { status: 'error'; items: readonly CatalogueItem[] };

export class CatalogueStore {
  state: CatalogueState = { status: 'loading', items: [] };
  constructor(
    private readonly cache: IngredientCatalogueCache,
    private readonly fetchPromoted = fetchPromotedCatalogue,
    private readonly searchRemote = searchIngredientCatalogue,
  ) {}

  async loadPromoted(): Promise<CatalogueState> {
    const cached = await this.cache.load();
    this.state = { status: 'loading', items: cached?.page.items ?? [] };
    try {
      const page = await this.fetchPromoted();
      await this.cache.replace(page);
      return this.state = { status: 'ready', items: page.items, version: page.catalogueVersion };
    } catch {
      return this.state = cached
        ? { status: 'stale', items: cached.page.items, version: cached.page.catalogueVersion }
        : { status: 'error', items: [] };
    }
  }

  async search(query: string, signal?: AbortSignal): Promise<CatalogueState> {
    if (query.trim().length < 2) return this.state;
    try {
      const page = await this.searchRemote(query, { signal });
      return this.state = { status: 'ready', items: page.items, version: page.catalogueVersion };
    } catch {
      return this.state = { status: 'error', items: this.state.items };
    }
  }
}
