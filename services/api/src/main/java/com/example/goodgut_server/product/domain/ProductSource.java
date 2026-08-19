package com.example.goodgut_server.product.domain;

public record ProductSource(String provider) {

    public static ProductSource openFoodFacts() {
        return new ProductSource("open_food_facts");
    }
}
