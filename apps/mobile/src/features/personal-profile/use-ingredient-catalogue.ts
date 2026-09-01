import { useEffect, useMemo, useState } from 'react';
import { asyncStorageKeyValueStore } from '@/data/async-storage-key-value-store';
import { IngredientCatalogueCache } from '@/data/ingredient-catalogue-cache';
import { CatalogueStore, CatalogueState } from './catalogue-store';
import { fetchCatalogueChildren } from '@/data/ingredient-catalogue-api';
import { CatalogueItem } from '@/domain/ingredient-catalogue';

export function useIngredientCatalogue(query: string) {
  const store = useMemo(() => new CatalogueStore(new IngredientCatalogueCache(asyncStorageKeyValueStore)), []);
  const [state, setState] = useState<CatalogueState>(store.state);
  const [childrenByNode, setChildrenByNode] = useState<Readonly<Record<string, readonly CatalogueItem[]>>>({});
  const [loadingNodeId, setLoadingNodeId] = useState<string>();
  useEffect(() => { void store.loadPromoted().then(setState); }, [store]);
  useEffect(() => {
    if (query.trim().length < 2) { void store.loadPromoted().then(setState); return; }
    const controller = new AbortController();
    const timeout = setTimeout(() => { void store.search(query, controller.signal).then(setState); }, 350);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [query, store]);
  const loadChildren = async (nodeId: string) => {
    if (childrenByNode[nodeId]) return;
    setLoadingNodeId(nodeId);
    try {
      const page = await fetchCatalogueChildren(nodeId);
      setChildrenByNode((current) => ({ ...current, [nodeId]: page.items }));
    } finally { setLoadingNodeId((current) => current === nodeId ? undefined : current); }
  };
  return { state, childrenByNode, loadingNodeId, loadChildren, retry: () => store.loadPromoted().then(setState) };
}
