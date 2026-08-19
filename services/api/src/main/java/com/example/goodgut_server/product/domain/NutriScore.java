package com.example.goodgut_server.product.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record NutriScore(String status, String grade) {

    public static NutriScore available(String grade) {
        return new NutriScore("available", grade);
    }

    public static NutriScore missing() {
        return new NutriScore("missing", null);
    }
}
