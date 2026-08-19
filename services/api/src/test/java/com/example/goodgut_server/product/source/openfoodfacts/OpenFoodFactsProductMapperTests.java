package com.example.goodgut_server.product.source.openfoodfacts;

import com.example.goodgut_server.product.domain.NotFoundProductLookup;
import com.example.goodgut_server.product.domain.ProductLookupResponse;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;

class OpenFoodFactsProductMapperTests {

    private static final Instant FETCHED_AT = Instant.parse("2026-08-19T13:30:00Z");
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Path FIXTURES = findRepositoryRoot().resolve(
            "services/api/src/test/resources/fixtures/openfoodfacts");

    private final OpenFoodFactsProductMapper mapper = new OpenFoodFactsProductMapper(
            Clock.fixed(FETCHED_AT, ZoneOffset.UTC));

    @Test
    void recordedProductAndNotFoundFixturesMapExactlyToCanonicalExpectations() throws IOException {
        JsonNode manifest = JSON.readTree(FIXTURES.resolve("manifest.json").toFile());
        for (JsonNode entry : manifest.get("entries")) {
            String provenance = entry.get("provenance").asText();
            if (!provenance.startsWith("recorded_api_v3_")) {
                continue;
            }
            String basename = entry.get("basename").asText();
            JsonNode raw = JSON.readTree(FIXTURES.resolve("raw/" + basename + ".json").toFile());
            ProductLookupResponse actual = "recorded_api_v3_http_404".equals(provenance)
                    ? new NotFoundProductLookup(entry.get("barcode").asText())
                    : mapper.map(entry.get("barcode").asText(),
                            JSON.treeToValue(raw.get("response"), OpenFoodFactsResponse.class));
            JsonNode expected = JSON.readTree(
                    FIXTURES.resolve("normalized/" + basename + ".json").toFile());

            assertEquals(expected, JSON.valueToTree(actual), basename);
        }
    }

    @Test
    void rejectsMissingProductAndMissingIdentityAsInvalidSourceResponses() throws Exception {
        assertOutcome("invalid_source_response", mapper.map("12345678", response("""
                {"status":"success","product":null}
                """)));
        assertOutcome("invalid_source_response", mapper.map("12345678", response("""
                {"status":"success","product":{"product_name":"  "}}
                """)));
    }

    @Test
    void preservesRequestedBarcodeInsteadOfProviderNormalizedCode() throws Exception {
        ProductLookupResponse result = mapper.map("0000000001008", response(minimalProduct("""
                "code":"00001008","product_quantity_unit":"g",
                "nutriments":{"energy-kcal_100g":1,"energy-kcal_unit":"kcal"}
                """)));

        assertEquals("0000000001008", result.barcode());
    }

    @Test
    void distinguishesMissingInvalidUnsupportedAndUnknownBasisNutrition() throws Exception {
        ProductLookupResponse result = mapper.map("12345678", response(minimalProduct("""
                "nutriments":{
                  "energy-kcal_100g":10,"energy-kcal_unit":"kJ",
                  "carbohydrates_100g":-1,"carbohydrates_unit":"g",
                  "sugars_100g":2,"sugars_unit":"g"
                }
                """)));
        JsonNode nutrition = JSON.valueToTree(result).get("product").get("nutrition");

        assertEquals("unsupported_unit", nutrition.get("energy_kcal").get("reason").asText());
        assertEquals("invalid_value", nutrition.get("carbohydrates").get("reason").asText());
        assertEquals("unknown_basis", nutrition.get("sugars").get("reason").asText());
        assertEquals("missing_source", nutrition.get("fat").get("reason").asText());
    }

    @Test
    void supportsBothExplicitBasesAndRejectsConflictingBasisEvidence() throws Exception {
        assertBasis("per_100g", "g", "100g");
        assertBasis("per_100ml", "ml", "100ml");

        ProductLookupResponse conflict = mapper.map("12345678", response(minimalProduct("""
                "product_quantity_unit":"g","nutrition_data_per":"100ml",
                "nutriments":{"energy-kcal_100g":1,"energy-kcal_unit":"kcal"}
                """)));
        assertEquals("unknown_basis", JSON.valueToTree(conflict).get("product").get("nutrition")
                .get("energy_kcal").get("reason").asText());
    }

    @Test
    void mapsNutriScoreAndIngredientTrustStatesConservatively() throws Exception {
        ProductLookupResponse available = mapper.map("12345678", response(minimalProduct("""
                "nutriscore_grade":"B","unknown_ingredients_n":0,
                "ingredients":[{"id":"en:sugar"},{"id":"en:e322","ingredients":[{"id":"en:soya-lecithin"}]}]
                """)));
        JsonNode product = JSON.valueToTree(available).get("product");
        assertEquals("b", product.get("nutriScore").get("grade").asText());
        assertEquals(List.of("sugar", "soya lecithin"),
                product.get("ingredients").get("names").valueStream().map(JsonNode::asText).toList());

        ProductLookupResponse unparseable = mapper.map("12345678", response(minimalProduct("""
                "nutriscore_grade":"unknown","unknown_ingredients_n":1,
                "ingredients":[{"id":"en:sugar"}]
                """)));
        product = JSON.valueToTree(unparseable).get("product");
        assertEquals("missing", product.get("nutriScore").get("status").asText());
        assertEquals("unparseable", product.get("ingredients").get("status").asText());

        ProductLookupResponse missing = mapper.map("12345678", response(minimalProduct("")));
        assertEquals("missing", JSON.valueToTree(missing).get("product").get("ingredients")
                .get("status").asText());
    }

    private void assertBasis(String expected, String quantityUnit, String dataPer) throws Exception {
        ProductLookupResponse result = mapper.map("12345678", response(minimalProduct("""
                "product_quantity_unit":"%s","nutrition_data_per":"%s",
                "nutriments":{"energy-kcal_100g":1,"energy-kcal_unit":"kcal"}
                """.formatted(quantityUnit, dataPer))));
        assertEquals(expected, JSON.valueToTree(result).get("product").get("nutrition")
                .get("energy_kcal").get("basis").asText());
    }

    private void assertOutcome(String category, ProductLookupResponse response) {
        JsonNode json = JSON.valueToTree(response);
        assertEquals("source_error", json.get("outcome").asText());
        assertEquals(category, json.get("errorCategory").asText());
    }

    private OpenFoodFactsResponse response(String json) throws Exception {
        return JSON.readValue(json, OpenFoodFactsResponse.class);
    }

    private String minimalProduct(String additions) {
        String separator = additions.isBlank() ? "" : "," + additions;
        return """
                {"status":"success","code":"12345678","product":{
                  "code":"12345678","product_name":"Example"%s
                }}
                """.formatted(separator);
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
