package com.example.goodgut_server.product;

import com.example.goodgut_server.product.classification.IngredientClassification;
import com.example.goodgut_server.product.classification.IngredientClassificationBatch;
import com.example.goodgut_server.product.domain.ProductLookupResponse;
import com.example.goodgut_server.product.domain.SourceErrorCategory;
import com.example.goodgut_server.product.source.openfoodfacts.OpenFoodFactsProductMapper;
import com.example.goodgut_server.product.source.openfoodfacts.OpenFoodFactsResponse;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ProductLookupServiceTests {

    private final OpenFoodFactsProductMapper mapper = new OpenFoodFactsProductMapper(
            Clock.fixed(Instant.parse("2026-08-19T13:30:00Z"), ZoneOffset.UTC),
            taxonomyIds -> new IngredientClassificationBatch("fixture", taxonomyIds.stream().distinct()
                    .map(id -> new IngredientClassification("fixture", id, List.of()))
                    .collect(Collectors.toMap(IngredientClassification::nodeId, Function.identity()))));

    @Test
    void mapsFoundNotFoundAndSourceFailuresThroughOneSourceCall() {
        assertLookup(new ProductSourceResult.Found(new OpenFoodFactsResponse(
                "success", "12345678", new OpenFoodFactsResponse.OpenFoodFactsProduct(
                "12345678", "Example", null, null, null, null, null,
                null, null, null, null, null, null))), "found");
        assertLookup(new ProductSourceResult.NotFound(), "not_found");
        assertLookup(new ProductSourceResult.Failure(SourceErrorCategory.RATE_LIMITED), "source_error");
    }

    private void assertLookup(ProductSourceResult sourceResult, String expectedOutcome) {
        AtomicInteger calls = new AtomicInteger();
        ProductLookupService service = new ProductLookupService(barcode -> {
            calls.incrementAndGet();
            return sourceResult;
        }, mapper);

        ProductLookupResponse response = service.lookup("00001234");

        assertEquals(expectedOutcome, response.outcome());
        assertEquals("00001234", response.barcode());
        assertEquals(1, calls.get());
    }
}
