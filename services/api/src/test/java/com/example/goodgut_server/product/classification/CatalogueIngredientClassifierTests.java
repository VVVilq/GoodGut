package com.example.goodgut_server.product.classification;

import com.example.goodgut_server.catalogue.IngredientCatalogueRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CatalogueIngredientClassifierTests {

    @Test
    void returnsOnlyAncestrySuppliedByTheActiveOffReleaseIncludingMultipleParents() {
        IngredientCatalogueRepository repository = mock(IngredientCatalogueRepository.class);
        when(repository.activeRelease()).thenReturn(
                new IngredientCatalogueRepository.ActiveRelease(7L, "off-fixture"));
        List<String> requested = List.of("en:goat-milk", "en:sheep-milk", "en:egg-yolk", "en:goat-milk");
        when(repository.classificationEvidence(7L, requested)).thenReturn(List.of(
                new IngredientCatalogueRepository.ClassificationEvidenceRow("en:egg-yolk", "en:egg"),
                new IngredientCatalogueRepository.ClassificationEvidenceRow("en:goat-milk", "en:dairy-ingredient"),
                new IngredientCatalogueRepository.ClassificationEvidenceRow("en:goat-milk", "en:milk"),
                new IngredientCatalogueRepository.ClassificationEvidenceRow("en:sheep-milk", "en:milk")));

        CatalogueIngredientClassifier classifier = new CatalogueIngredientClassifier(repository);
        IngredientClassificationBatch batch = classifier.classify(
                requested);
        IngredientClassification result = batch.classifications().get("en:goat-milk");

        assertEquals("off-fixture", result.catalogueVersion());
        assertEquals("en:goat-milk", result.nodeId());
        assertEquals(List.of("en:dairy-ingredient", "en:milk"), result.ancestorNodeIds());
        assertEquals(List.of("en:milk"),
                batch.classifications().get("en:sheep-milk").ancestorNodeIds());
        assertEquals(List.of("en:egg"),
                batch.classifications().get("en:egg-yolk").ancestorNodeIds());
        verify(repository).classificationEvidence(7L, requested);
    }

    @Test
    void doesNotInventAncestryForNodesMissingFromTheRelease() {
        IngredientCatalogueRepository repository = mock(IngredientCatalogueRepository.class);
        when(repository.activeRelease()).thenReturn(
                new IngredientCatalogueRepository.ActiveRelease(7L, "off-fixture"));
        when(repository.classificationEvidence(7L, List.of("en:goodgut-invented-family")))
                .thenReturn(List.of());

        CatalogueIngredientClassifier classifier = new CatalogueIngredientClassifier(repository);

        assertTrue(classifier.classify(List.of("en:goodgut-invented-family")).classifications().isEmpty());
    }

    @Test
    void keepsExistingRootNodesWithEmptyAncestry() {
        IngredientCatalogueRepository repository = mock(IngredientCatalogueRepository.class);
        when(repository.activeRelease()).thenReturn(
                new IngredientCatalogueRepository.ActiveRelease(7L, "off-fixture"));
        when(repository.classificationEvidence(7L, List.of("en:milk"))).thenReturn(List.of(
                new IngredientCatalogueRepository.ClassificationEvidenceRow("en:milk", null)));

        IngredientClassification result = new CatalogueIngredientClassifier(repository)
                .classify(List.of("en:milk")).classifications().get("en:milk");

        assertEquals(List.of(), result.ancestorNodeIds());
    }
}
