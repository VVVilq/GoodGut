package com.example.goodgut_server.product;

import com.example.goodgut_server.product.domain.SourceErrorCategory;
import com.example.goodgut_server.product.source.openfoodfacts.OpenFoodFactsResponse;

public sealed interface ProductSourceResult
        permits ProductSourceResult.Found, ProductSourceResult.NotFound, ProductSourceResult.Failure {

    record Found(OpenFoodFactsResponse response) implements ProductSourceResult {
    }

    record NotFound() implements ProductSourceResult {
    }

    record Failure(SourceErrorCategory category) implements ProductSourceResult {
    }
}
