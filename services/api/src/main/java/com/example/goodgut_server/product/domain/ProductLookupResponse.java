package com.example.goodgut_server.product.domain;

public sealed interface ProductLookupResponse
        permits FoundProductLookup, NotFoundProductLookup, SourceErrorProductLookup {

    String contractVersion();

    String outcome();

    String barcode();
}
