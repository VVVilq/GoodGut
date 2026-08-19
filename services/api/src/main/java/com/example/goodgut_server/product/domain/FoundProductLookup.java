package com.example.goodgut_server.product.domain;

public record FoundProductLookup(
        String contractVersion,
        String outcome,
        String barcode,
        FoundProductSource source,
        NormalizedProduct product) implements ProductLookupResponse {

    public FoundProductLookup(String barcode, FoundProductSource source, NormalizedProduct product) {
        this("1.0", "found", barcode, source, product);
    }
}
