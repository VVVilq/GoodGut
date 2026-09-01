package com.example.goodgut_server.product.classification;

import com.example.goodgut_server.catalogue.IngredientCatalogueRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CatalogueIngredientClassifierTests {

    @Test
    void returnsOnlyAncestrySuppliedByTheActiveOffReleaseIncludingMultipleParents() {
        IngredientCatalogueRepository repository = mock(IngredientCatalogueRepository.class);
        when(repository.activeRelease()).thenReturn(
                new IngredientCatalogueRepository.ActiveRelease(7L, "off-fixture"));
        when(repository.containsNode(7L, "en:goat-milk")).thenReturn(true);
        when(repository.ancestorIds(7L, "en:goat-milk"))
                .thenReturn(List.of("en:dairy-ingredient", "en:milk"));
        when(repository.containsNode(7L, "en:sheep-milk")).thenReturn(true);
        when(repository.ancestorIds(7L, "en:sheep-milk")).thenReturn(List.of("en:milk"));
        when(repository.containsNode(7L, "en:egg-yolk")).thenReturn(true);
        when(repository.ancestorIds(7L, "en:egg-yolk")).thenReturn(List.of("en:egg"));

        CatalogueIngredientClassifier classifier = new CatalogueIngredientClassifier(repository);
        IngredientClassificationBatch batch = classifier.classify(
                List.of("en:goat-milk", "en:sheep-milk", "en:egg-yolk"));
        IngredientClassification result = batch.classifications().get("en:goat-milk");

        assertEquals("off-fixture", result.catalogueVersion());
        assertEquals("en:goat-milk", result.nodeId());
        assertEquals(List.of("en:dairy-ingredient", "en:milk"), result.ancestorNodeIds());
        assertEquals(List.of("en:milk"),
                batch.classifications().get("en:sheep-milk").ancestorNodeIds());
        assertEquals(List.of("en:egg"),
                batch.classifications().get("en:egg-yolk").ancestorNodeIds());
    }

    @Test
    void doesNotInventAncestryForNodesMissingFromTheRelease() {
        IngredientCatalogueRepository repository = mock(IngredientCatalogueRepository.class);
        when(repository.activeRelease()).thenReturn(
                new IngredientCatalogueRepository.ActiveRelease(7L, "off-fixture"));

        CatalogueIngredientClassifier classifier = new CatalogueIngredientClassifier(repository);

        assertTrue(classifier.classify(List.of("en:goodgut-invented-family")).classifications().isEmpty());
    }
}
