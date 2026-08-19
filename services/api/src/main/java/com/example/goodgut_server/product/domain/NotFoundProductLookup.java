package com.example.goodgut_server.product.domain;

public record NotFoundProductLookup(
        String contractVersion,
        String outcome,
        String barcode,
        ProductSource source,
        String reason) implements ProductLookupResponse {

    public NotFoundProductLookup(String barcode) {
        this("1.0", "not_found", barcode, ProductSource.openFoodFacts(), "not_in_source");
    }
}
