package com.example.goodgut_server.catalogue.importer;

import java.nio.file.Path;

public record TaxonomyImportRequest(
        Path source,
        String version,
        String sourceRevision,
        String expectedChecksumSha256,
        boolean activate) {

    public static final String OFF_INGREDIENTS_SOURCE =
            "https://static.openfoodfacts.org/data/taxonomies/ingredients.full.json";
}
