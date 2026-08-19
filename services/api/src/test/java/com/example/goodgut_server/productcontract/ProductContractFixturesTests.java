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
    void everyNormalizedFixtureValidatesAgainstCanonicalSchemas() throws IOException {
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
        manifest.get("entries").valueStream().forEach(entry ->
                entry.get("capabilities").valueStream()
                        .map(JsonNode::asText)
                        .forEach(actual::add));

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

    private static Set<String> difference(Set<String> required, Set<String> actual) {
        Set<String> missing = new HashSet<>(required);
        missing.removeAll(actual);
        return missing;
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
