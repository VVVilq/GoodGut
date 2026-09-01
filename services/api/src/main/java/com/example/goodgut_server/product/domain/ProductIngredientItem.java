package com.example.goodgut_server.product.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductIngredientItem(String displayName, String nodeId, List<String> ancestorNodeIds) {

    public ProductIngredientItem {
        ancestorNodeIds = List.copyOf(ancestorNodeIds);
    }
}
