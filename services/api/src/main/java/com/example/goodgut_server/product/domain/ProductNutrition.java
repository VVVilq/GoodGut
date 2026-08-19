package com.example.goodgut_server.product.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

public record ProductNutrition(
        @JsonProperty("energy_kcal") NutritionFact energyKcal,
        NutritionFact carbohydrates,
        NutritionFact sugars,
        NutritionFact fat,
        @JsonProperty("saturated_fat") NutritionFact saturatedFat,
        NutritionFact fiber,
        NutritionFact protein,
        NutritionFact salt) {
}
