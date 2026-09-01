import { AsyncKeyValueStore } from './personal-profile-repository';
import { CataloguePage, decodeCataloguePage } from '@/domain/ingredient-catalogue';

export const INGREDIENT_CATALOGUE_CACHE_KEY = 'goodgut.ingredient-catalogue.promoted';

type CachedCatalogue = { cachedAt: string; page: CataloguePage };

export class IngredientCatalogueCache {
  constructor(private readonly storage: AsyncKeyValueStore) {}

  async load(): Promise<CachedCatalogue | null> {
    try {
      const raw = await this.storage.getItem(INGREDIENT_CATALOGUE_CACHE_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (!isRecord(value) || typeof value.cachedAt !== 'string') return null;
      return { cachedAt: value.cachedAt, page: decodeCataloguePage(value.page) };
    } catch { return null; }
  }

  async replace(page: CataloguePage): Promise<void> {
    const serialized = JSON.stringify({ cachedAt: new Date().toISOString(), page });
    await this.storage.setItem(INGREDIENT_CATALOGUE_CACHE_KEY, serialized);
    const verified = await this.load();
    if (!verified || verified.page.catalogueVersion !== page.catalogueVersion) throw new Error('Catalogue cache write verification failed.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
