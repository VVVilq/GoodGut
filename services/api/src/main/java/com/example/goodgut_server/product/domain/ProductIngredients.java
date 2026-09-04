package com.example.goodgut_server.product.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductIngredients(
        String status,
        String completeness,
        @JsonInclude(JsonInclude.Include.ALWAYS)
        String catalogueVersion,
        List<ProductIngredientItem> items) {

    public ProductIngredients {
        items = items == null ? null : List.copyOf(items);
    }

    public static ProductIngredients available(
            String completeness, String catalogueVersion, List<ProductIngredientItem> items) {
        return new ProductIngredients("available", completeness, catalogueVersion, items);
    }

    public static ProductIngredients missing() {
        return new ProductIngredients("missing", null, null, null);
    }

    public static ProductIngredients unparseable() {
        return new ProductIngredients("unparseable", null, null, null);
    }
}
