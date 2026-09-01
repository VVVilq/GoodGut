package com.example.goodgut_server.catalogue;

import java.util.List;

public record CatalogueItem(
        String nodeId,
        String label,
        String locale,
        List<CatalogueBreadcrumb> breadcrumb,
        boolean selectable,
        boolean hasChildren,
        List<String> supportedScopes) {
}
