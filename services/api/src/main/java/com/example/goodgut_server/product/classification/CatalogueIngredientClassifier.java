package com.example.goodgut_server.product.classification;

import com.example.goodgut_server.catalogue.IngredientCatalogueRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
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
        Map<String, List<String>> ancestorsByNode = new HashMap<>();
        repository.classificationEvidence(release.id(), taxonomyIds).forEach(row -> {
            List<String> ancestors = ancestorsByNode.computeIfAbsent(row.nodeId(), ignored -> new ArrayList<>());
            if (row.ancestorId() != null) ancestors.add(row.ancestorId());
        });
        Map<String, IngredientClassification> classifications = new HashMap<>();
        ancestorsByNode.forEach((taxonomyId, ancestors) -> classifications.put(
                taxonomyId,
                new IngredientClassification(release.version(), taxonomyId, List.copyOf(ancestors))));
        return new IngredientClassificationBatch(release.version(), classifications);
    }
}
