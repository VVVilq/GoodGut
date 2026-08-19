package com.example.goodgut_server.product.source.openfoodfacts;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties("goodgut.open-food-facts")
public record OpenFoodFactsProperties(
        String baseUrl,
        String userAgent,
        Duration connectTimeout,
        Duration readTimeout) {
}
