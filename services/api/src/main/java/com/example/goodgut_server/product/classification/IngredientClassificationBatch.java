package com.example.goodgut_server.product.classification;

import java.util.Map;

public record IngredientClassificationBatch(
        String catalogueVersion, Map<String, IngredientClassification> classifications) {

    public IngredientClassificationBatch {
        classifications = Map.copyOf(classifications);
    }
}
