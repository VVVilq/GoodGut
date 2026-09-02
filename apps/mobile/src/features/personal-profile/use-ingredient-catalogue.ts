import { useEffect, useMemo, useState } from 'react';
import { asyncStorageKeyValueStore } from '@/data/async-storage-key-value-store';
import { IngredientCatalogueCache } from '@/data/ingredient-catalogue-cache';
import { CatalogueStore, CatalogueState } from './catalogue-store';
import { fetchCatalogueChildren } from '@/data/ingredient-catalogue-api';
import { CatalogueItem } from '@/domain/ingredient-catalogue';
import { LatestRequestGuard } from './latest-request-guard';

export function useIngredientCatalogue(query: string) {
  const store = useMemo(() => new CatalogueStore(new IngredientCatalogueCache(asyncStorageKeyValueStore)), []);
  const latestRequest = useMemo(() => new LatestRequestGuard(), []);
  const [state, setState] = useState<CatalogueState>(store.state);
  const [childrenByNode, setChildrenByNode] = useState<Readonly<Record<string, readonly CatalogueItem[]>>>({});
  const [loadingNodeId, setLoadingNodeId] = useState<string>();
  useEffect(() => {
    const isLatest = latestRequest.begin();
    if (query.trim().length < 2) {
      void store.loadPromoted().then((nextState) => { if (isLatest()) setState(nextState); });
      return () => latestRequest.invalidate();
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      void store.search(query, controller.signal).then((nextState) => { if (isLatest()) setState(nextState); });
    }, 350);
    return () => { latestRequest.invalidate(); clearTimeout(timeout); controller.abort(); };
  }, [latestRequest, query, store]);
  const loadChildren = async (nodeId: string) => {
    if (childrenByNode[nodeId]) return;
    setLoadingNodeId(nodeId);
    try {
      const page = await fetchCatalogueChildren(nodeId);
      setChildrenByNode((current) => ({ ...current, [nodeId]: page.items }));
    } finally { setLoadingNodeId((current) => current === nodeId ? undefined : current); }
  };
  const retry = async () => {
    const isLatest = latestRequest.begin();
    const nextState = await store.loadPromoted();
    if (isLatest()) setState(nextState);
    return nextState;
  };
  return { state, childrenByNode, loadingNodeId, loadChildren, retry };
}
