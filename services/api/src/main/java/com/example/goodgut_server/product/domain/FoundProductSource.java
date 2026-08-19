package com.example.goodgut_server.product.domain;

import java.time.Instant;

public record FoundProductSource(String provider, String providerProductUrl, Instant fetchedAt) {

    public static FoundProductSource openFoodFacts(String providerProductUrl, Instant fetchedAt) {
        return new FoundProductSource("open_food_facts", providerProductUrl, fetchedAt);
    }
}
