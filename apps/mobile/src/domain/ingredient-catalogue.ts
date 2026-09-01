export type SelectionScope = 'node' | 'subtree';

export type CatalogueBreadcrumb = { nodeId: string; label: string };

export type CatalogueItem = {
  nodeId: string;
  label: string;
  locale: 'pl' | 'en';
  breadcrumb: readonly CatalogueBreadcrumb[];
  selectable: boolean;
  hasChildren: boolean;
  supportedScopes: readonly SelectionScope[];
};

export type CataloguePage = {
  catalogueVersion: string;
  items: readonly CatalogueItem[];
  page: number;
  size: number;
  total: number;
};

export class CatalogueDecodeError extends Error {}

export function decodeCataloguePage(value: unknown): CataloguePage {
  if (!record(value) || !keys(value, ['catalogueVersion', 'items', 'page', 'size', 'total']) ||
      typeof value.catalogueVersion !== 'string' || !Array.isArray(value.items) ||
      !integer(value.page) || !integer(value.size) || !integer(value.total)) throw new CatalogueDecodeError('Invalid catalogue response.');
  return {
    catalogueVersion: value.catalogueVersion,
    items: value.items.map(decodeItem),
    page: value.page,
    size: value.size,
    total: value.total,
  };
}

function decodeItem(value: unknown): CatalogueItem {
  if (!record(value) || !keys(value, ['nodeId', 'label', 'locale', 'breadcrumb', 'selectable', 'hasChildren', 'supportedScopes']) ||
      typeof value.nodeId !== 'string' || typeof value.label !== 'string' ||
      (value.locale !== 'pl' && value.locale !== 'en') || !Array.isArray(value.breadcrumb) ||
      typeof value.selectable !== 'boolean' || typeof value.hasChildren !== 'boolean' || !Array.isArray(value.supportedScopes)) {
    throw new CatalogueDecodeError('Invalid catalogue item.');
  }
  const supportedScopes = value.supportedScopes.map((scope) => {
    if (scope !== 'node' && scope !== 'subtree') throw new CatalogueDecodeError('Invalid selection scope.');
    return scope;
  });
  const breadcrumb = value.breadcrumb.map((crumb) => {
    if (!record(crumb) || !keys(crumb, ['nodeId', 'label']) || typeof crumb.nodeId !== 'string' || typeof crumb.label !== 'string') {
      throw new CatalogueDecodeError('Invalid breadcrumb.');
    }
    return { nodeId: crumb.nodeId, label: crumb.label };
  });
  return { nodeId: value.nodeId, label: value.label, locale: value.locale, breadcrumb, selectable: value.selectable, hasChildren: value.hasChildren, supportedScopes };
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function integer(value: unknown): value is number { return Number.isInteger(value) && (value as number) >= 0; }
function keys(value: Record<string, unknown>, expected: string[]) {
  const actual = Object.keys(value).sort(); const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}
