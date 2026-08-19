package com.example.goodgut_server.product.domain;

public record NormalizedProduct(
        ProductIdentity identity,
        NutriScore nutriScore,
        ProductIngredients ingredients,
        ProductNutrition nutrition) {
}
