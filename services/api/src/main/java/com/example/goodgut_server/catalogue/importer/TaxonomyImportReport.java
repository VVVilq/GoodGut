package com.example.goodgut_server.catalogue.importer;

public record TaxonomyImportReport(
        long releaseId,
        String version,
        String checksumSha256,
        int entryCount,
        int labelCount,
        int edgeCount,
        boolean activated) {
}
