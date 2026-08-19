package com.example.goodgut_server.product.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record NutritionFact(String status, Number value, String unit, String basis, String reason) {

    public static NutritionFact available(Number value, String unit, NutritionBasis basis) {
        return new NutritionFact("available", value, unit, basis.wireValue(), null);
    }

    public static NutritionFact unavailable(NutritionUnavailableReason reason) {
        return new NutritionFact("unavailable", null, null, null, reason.wireValue());
    }
}
