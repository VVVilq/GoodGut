package com.example.goodgut_server.product.domain;

public enum NutritionUnavailableReason {
    MISSING_SOURCE("missing_source"),
    UNKNOWN_BASIS("unknown_basis"),
    INVALID_VALUE("invalid_value"),
    UNSUPPORTED_UNIT("unsupported_unit");

    private final String wireValue;

    NutritionUnavailableReason(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}
