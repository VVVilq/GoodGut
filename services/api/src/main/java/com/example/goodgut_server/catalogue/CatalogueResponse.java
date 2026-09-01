package com.example.goodgut_server.catalogue;

import java.util.List;

public record CatalogueResponse(
        String catalogueVersion,
        List<CatalogueItem> items,
        int page,
        int size,
        long total) {
}
