package com.example.goodgut_server.product.classification;

import com.example.goodgut_server.catalogue.IngredientCatalogueRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public final class CatalogueIngredientClassifier implements IngredientClassifier {

    private final IngredientCatalogueRepository repository;

    public CatalogueIngredientClassifier(IngredientCatalogueRepository repository) {
        this.repository = repository;
    }

    @Override
    public IngredientClassificationBatch classify(List<String> taxonomyIds) {
        IngredientCatalogueRepository.ActiveRelease release = repository.activeRelease();
        if (release == null) {
            return new IngredientClassificationBatch(null, Map.of());
        }
        Map<String, IngredientClassification> classifications = new HashMap<>();
        for (String taxonomyId : taxonomyIds.stream().distinct().toList()) {
            if (repository.containsNode(release.id(), taxonomyId)) {
                classifications.put(taxonomyId, new IngredientClassification(
                        release.version(), taxonomyId, repository.ancestorIds(release.id(), taxonomyId)));
            }
        }
        return new IngredientClassificationBatch(release.version(), classifications);
    }
}
