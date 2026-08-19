package com.example.goodgut_server.product.domain;

public enum NutritionBasis {
    PER_100G("per_100g"),
    PER_100ML("per_100ml");

    private final String wireValue;

    NutritionBasis(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}
