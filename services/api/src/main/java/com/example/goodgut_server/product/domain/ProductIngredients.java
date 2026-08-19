package com.example.goodgut_server.product.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductIngredients(String status, List<String> names) {

    public ProductIngredients {
        names = names == null ? null : List.copyOf(names);
    }

    public static ProductIngredients available(List<String> names) {
        return new ProductIngredients("available", names);
    }

    public static ProductIngredients missing() {
        return new ProductIngredients("missing", null);
    }

    public static ProductIngredients unparseable() {
        return new ProductIngredients("unparseable", null);
    }
}
