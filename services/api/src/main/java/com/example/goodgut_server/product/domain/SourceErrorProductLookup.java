package com.example.goodgut_server.product.domain;

public record SourceErrorProductLookup(
        String contractVersion,
        String outcome,
        String barcode,
        ProductSource source,
        String errorCategory) implements ProductLookupResponse {

    public SourceErrorProductLookup(String barcode, SourceErrorCategory category) {
        this("1.0", "source_error", barcode, ProductSource.openFoodFacts(), category.wireValue());
    }
}
