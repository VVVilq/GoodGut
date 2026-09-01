package com.example.goodgut_server.product.classification;

import java.util.List;

public record IngredientClassification(String catalogueVersion, String nodeId, List<String> ancestorNodeIds) {

    public IngredientClassification {
        ancestorNodeIds = List.copyOf(ancestorNodeIds);
    }
}
