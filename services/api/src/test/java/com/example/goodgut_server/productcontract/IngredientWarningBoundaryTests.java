package com.example.goodgut_server.productcontract;

import com.example.goodgut_server.catalogue.importer.TaxonomyImportRequest;
import com.example.goodgut_server.catalogue.importer.TaxonomyImportService;
import com.example.goodgut_server.product.classification.IngredientClassifier;
import com.example.goodgut_server.product.domain.ProductLookupResponse;
import com.example.goodgut_server.product.source.openfoodfacts.OpenFoodFactsProductMapper;
import com.example.goodgut_server.product.source.openfoodfacts.OpenFoodFactsResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@DirtiesContext
class IngredientWarningBoundaryTests {

    private static final Path REPOSITORY_ROOT = findRepositoryRoot();

    @Autowired
    private TaxonomyImportService importer;

    @Autowired
    private IngredientClassifier classifier;

    @Autowired
    private ObjectMapper json;

    @Test
    void importedTaxonomyClassificationMatchesSharedMobileBoundaryFixture() throws Exception {
        Path taxonomy = Path.of(getClass().getResource(
                "/fixtures/taxonomy/ingredients-small.json").toURI());
        importer.importRelease(new TaxonomyImportRequest(
                taxonomy, "warning-boundary-v1", "fixture", checksum(taxonomy), true));
        OpenFoodFactsProductMapper mapper = new OpenFoodFactsProductMapper(
                Clock.fixed(Instant.parse("2026-09-02T00:00:00Z"), ZoneOffset.UTC), classifier);
        OpenFoodFactsResponse response = new OpenFoodFactsResponse(
                "success",
                "12345678",
                new OpenFoodFactsResponse.OpenFoodFactsProduct(
                        "12345678", "Goat milk test product", null, null, "g", null, null,
                        List.of(new OpenFoodFactsResponse.OpenFoodFactsIngredient(
                                "en:goat-milk", "goat milk", 1, null)),
                        "goat milk", 1, 0, json.createObjectNode(), "100g"));

        ProductLookupResponse actual = mapper.map("12345678", response);
        var expected = json.readTree(REPOSITORY_ROOT.resolve(
                "docs/reference/examples/ingredient-warning-imported-taxonomy.json").toFile());

        assertEquals(expected, json.valueToTree(actual));
    }

    private String checksum(Path source) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = Files.newInputStream(source)) {
            input.transferTo(new java.security.DigestOutputStream(java.io.OutputStream.nullOutputStream(), digest));
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private static Path findRepositoryRoot() {
        Path current = Path.of("").toAbsolutePath();
        while (current != null) {
            if (Files.isRegularFile(current.resolve("docs/reference/schemas/product-lookup.schema.json"))) {
                return current;
            }
            current = current.getParent();
        }
        throw new IllegalStateException("Could not locate repository root");
    }
}
