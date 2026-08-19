package com.example.goodgut_server.productcontract;

import com.networknt.schema.InputFormat;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaLocation;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SpecificationVersion;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductContractFixturesTests {

    private static final String LOOKUP_SCHEMA_ID =
            "https://goodgut.app/schemas/product-lookup-1.0.schema.json";
    private static final String PRODUCT_SCHEMA_ID =
            "https://goodgut.app/schemas/normalized-product-1.0.schema.json";
    private static final Path REPOSITORY_ROOT = findRepositoryRoot();
    private static final Path FIXTURES = REPOSITORY_ROOT.resolve(
            "services/api/src/test/resources/fixtures/openfoodfacts");
    private static final ObjectMapper JSON = new ObjectMapper();

    @Test
    void everyNormalizedFixtureAndCanonicalExampleValidatesAgainstCanonicalSchemas() throws IOException {
        String lookupSchema = Files.readString(REPOSITORY_ROOT.resolve(
                "docs/reference/schemas/product-lookup.schema.json"));
        String productSchema = Files.readString(REPOSITORY_ROOT.resolve(
                "docs/reference/schemas/normalized-product.schema.json"));
        SchemaRegistry registry = SchemaRegistry.withDefaultDialect(
                SpecificationVersion.DRAFT_2020_12,
                builder -> builder.schemas(Map.of(
                        LOOKUP_SCHEMA_ID, lookupSchema,
                        PRODUCT_SCHEMA_ID, productSchema)));
        Schema schema = registry.getSchema(SchemaLocation.of(LOOKUP_SCHEMA_ID));
        schema.initializeValidators();

        for (Path fixture : jsonFiles(FIXTURES.resolve("normalized"))) {
            var errors = schema.validate(Files.readString(fixture), InputFormat.JSON,
                    context -> context.executionConfig(config -> config.formatAssertionsEnabled(true)));
            assertTrue(errors.isEmpty(), () -> fixture.getFileName() + ": " + errors);
        }
        for (Path example : jsonFiles(REPOSITORY_ROOT.resolve("docs/reference/examples"))) {
            var errors = schema.validate(Files.readString(example), InputFormat.JSON,
                    context -> context.executionConfig(config -> config.formatAssertionsEnabled(true)));
            assertTrue(errors.isEmpty(), () -> example.getFileName() + ": " + errors);
        }
    }

    @Test
    void manifestDeclaresEveryRawAndNormalizedFixtureExactlyOnce() throws IOException {
        JsonNode manifest = JSON.readTree(FIXTURES.resolve("manifest.json").toFile());
        List<String> declared = manifest.get("entries").valueStream()
                .map(entry -> entry.get("basename").asText())
                .toList();

        assertEquals(declared.size(), new HashSet<>(declared).size(), "duplicate manifest basename");
        assertEquals(Set.copyOf(declared), basenames(FIXTURES.resolve("raw")));
        assertEquals(Set.copyOf(declared), basenames(FIXTURES.resolve("normalized")));
    }

    @Test
    void manifestCoversEveryLoadBearingCapability() throws IOException {
        JsonNode manifest = JSON.readTree(FIXTURES.resolve("manifest.json").toFile());
        Set<String> actual = new HashSet<>();
        for (JsonNode entry : manifest.get("entries")) {
            String basename = entry.get("basename").asText();
            JsonNode raw = JSON.readTree(FIXTURES.resolve("raw/" + basename + ".json").toFile());
            JsonNode normalized = JSON.readTree(
                    FIXTURES.resolve("normalized/" + basename + ".json").toFile());
            Set<String> declared = entry.get("capabilities").valueStream()
                    .map(JsonNode::asText)
                    .collect(java.util.stream.Collectors.toSet());
            Set<String> derived = deriveCapabilities(normalized);

            assertEquals(derived, declared, basename + " capability declarations drifted from its facts");
            assertFixtureProvenance(entry, raw);
            actual.addAll(derived);
        }

        Set<String> required = Set.of(
                "source:found", "source:not_found",
                "basis:per_100g", "basis:per_100ml",
                "nutrition:complete", "nutrition:partial",
                "ingredients:available", "ingredients:missing", "ingredients:unparseable",
                "nutriscore:available", "nutriscore:missing",
                "source_error:rate_limited", "source_error:network_error",
                "source_error:invalid_source_response", "source_error:source_unavailable",
                "nutrient:energy_kcal", "nutrient:carbohydrates", "nutrient:sugars",
                "nutrient:fat", "nutrient:saturated_fat", "nutrient:fiber",
                "nutrient:protein", "nutrient:salt");

        assertTrue(actual.containsAll(required), () -> "Missing: " + difference(required, actual));
    }

    @Test
    void availableNutritionHasExplicitRequestedBasisEvidence() throws IOException {
        JsonNode manifest = JSON.readTree(FIXTURES.resolve("manifest.json").toFile());

        for (JsonNode entry : manifest.get("entries")) {
            if (!"recorded_api_v3_response".equals(entry.get("provenance").asText())) {
                continue;
            }

            String basename = entry.get("basename").asText();
            JsonNode raw = JSON.readTree(FIXTURES.resolve("raw/" + basename + ".json").toFile());
            JsonNode normalized = JSON.readTree(
                    FIXTURES.resolve("normalized/" + basename + ".json").toFile());
            String requestUrl = raw.get("capture").get("requestUrl").asText();
            assertTrue(requestUrl.contains("product_quantity_unit"),
                    () -> basename + " did not request product_quantity_unit");

            List<JsonNode> available = normalized.get("product").get("nutrition").valueStream()
                    .filter(fact -> "available".equals(fact.get("status").asText()))
                    .toList();
            if (available.isEmpty()) {
                continue;
            }

            JsonNode unitNode = raw.get("response").get("product").get("product_quantity_unit");
            assertTrue(unitNode != null && unitNode.isTextual(),
                    () -> basename + " exposes available nutrition without a source quantity unit");
            String expectedBasis = switch (unitNode.asText()) {
                case "g", "kg" -> "per_100g";
                case "ml", "cl", "l" -> "per_100ml";
                default -> throw new AssertionError(basename + " has unsupported basis unit: " + unitNode);
            };
            assertTrue(available.stream().allMatch(fact -> expectedBasis.equals(fact.get("basis").asText())),
                    () -> basename + " has nutrition facts that conflict with " + unitNode.asText());
        }
    }

    @Test
    void foundFixturesPreserveTheRequestedBarcode() throws IOException {
        JsonNode manifest = JSON.readTree(FIXTURES.resolve("manifest.json").toFile());

        for (JsonNode entry : manifest.get("entries")) {
            if (!"recorded_api_v3_response".equals(entry.get("provenance").asText())) {
                continue;
            }

            String basename = entry.get("basename").asText();
            JsonNode raw = JSON.readTree(FIXTURES.resolve("raw/" + basename + ".json").toFile());
            JsonNode normalized = JSON.readTree(
                    FIXTURES.resolve("normalized/" + basename + ".json").toFile());
            JsonNode capture = raw.get("capture");
            JsonNode requestedBarcode = capture.get("requestedBarcode");
            String expectedBarcode = requestedBarcode == null
                    ? capture.get("barcode").asText()
                    : requestedBarcode.asText();

            assertEquals(expectedBarcode, normalized.get("barcode").asText(),
                    basename + " replaced the requested barcode with a provider-normalized code");
            assertEquals(expectedBarcode, entry.get("barcode").asText(),
                    basename + " manifest barcode does not identify the requested product");
        }
    }

    private static Set<String> difference(Set<String> required, Set<String> actual) {
        Set<String> missing = new HashSet<>(required);
        missing.removeAll(actual);
        return missing;
    }

    private static Set<String> deriveCapabilities(JsonNode normalized) {
        Set<String> capabilities = new HashSet<>();
        String outcome = normalized.get("outcome").asText();
        capabilities.add("source:" + outcome);
        if ("source_error".equals(outcome)) {
            capabilities.remove("source:source_error");
            capabilities.add("source_error:" + normalized.get("errorCategory").asText());
            return capabilities;
        }
        if (!"found".equals(outcome)) {
            return capabilities;
        }

        JsonNode product = normalized.get("product");
        capabilities.add("ingredients:" + product.get("ingredients").get("status").asText());
        capabilities.add("nutriscore:" + product.get("nutriScore").get("status").asText());
        List<Map.Entry<String, JsonNode>> available = product.get("nutrition").properties().stream()
                .filter(entry -> "available".equals(entry.getValue().get("status").asText()))
                .toList();
        available.stream().map(Map.Entry::getKey).map(key -> "nutrient:" + key)
                .forEach(capabilities::add);
        available.stream().map(Map.Entry::getValue).map(fact -> "basis:" + fact.get("basis").asText())
                .forEach(capabilities::add);

        if (available.size() == 8) {
            capabilities.add("nutrition:complete");
        } else if (!available.isEmpty()) {
            capabilities.add("nutrition:partial");
        } else if (product.get("nutrition").valueStream().anyMatch(fact ->
                "unknown_basis".equals(fact.path("reason").asText()))) {
            capabilities.add("nutrition:unavailable_unknown_basis");
        }
        return capabilities;
    }

    private static void assertFixtureProvenance(JsonNode entry, JsonNode raw) {
        JsonNode capture = raw.get("capture");
        String provenance = entry.get("provenance").asText();
        assertTrue(capture != null && capture.isObject(), entry.get("basename") + " lacks capture metadata");
        assertTrue(capture.path("apiVersion").isTextual(), entry.get("basename") + " lacks API version");
        assertTrue(capture.path("attribution").isTextual(), entry.get("basename") + " lacks attribution");
        OffsetDateTime.parse(capture.get("retrievedAt").asText());

        if ("recorded_api_v3_response".equals(provenance)) {
            assertEquals("recorded_response", capture.get("kind").asText());
            assertTrue(capture.path("requestUrl").asText().startsWith("https://world.openfoodfacts.org/api/v3/product/"));
            assertTrue(capture.path("returnedSchemaVersion").isIntegralNumber());
        } else if ("recorded_api_v3_http_404".equals(provenance)) {
            assertEquals("recorded_http_response", capture.get("kind").asText());
            assertEquals(404, raw.get("http").get("status").asInt());
        } else {
            assertEquals("deterministic_transport_scenario", provenance);
            assertEquals("transport_scenario", capture.get("kind").asText());
        }
    }

    private static Set<String> basenames(Path directory) throws IOException {
        Set<String> names = new HashSet<>();
        for (Path file : jsonFiles(directory)) {
            String filename = file.getFileName().toString();
            names.add(filename.substring(0, filename.length() - ".json".length()));
        }
        return names;
    }

    private static List<Path> jsonFiles(Path directory) throws IOException {
        try (Stream<Path> files = Files.list(directory)) {
            return files.filter(path -> path.getFileName().toString().endsWith(".json"))
                    .sorted()
                    .toList();
        }
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
