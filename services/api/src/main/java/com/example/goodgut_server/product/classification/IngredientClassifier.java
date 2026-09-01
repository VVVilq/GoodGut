package com.example.goodgut_server.product.classification;

import java.util.List;

public interface IngredientClassifier {

    IngredientClassificationBatch classify(List<String> taxonomyIds);
}
