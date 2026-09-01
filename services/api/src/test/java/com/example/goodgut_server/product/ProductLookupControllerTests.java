package com.example.goodgut_server.product;

import com.example.goodgut_server.product.domain.NotFoundProductLookup;
import com.example.goodgut_server.product.classification.IngredientClassification;
import com.example.goodgut_server.product.classification.IngredientClassificationBatch;
import com.example.goodgut_server.product.source.openfoodfacts.OpenFoodFactsProductMapper;
import com.example.goodgut_server.product.source.openfoodfacts.OpenFoodFactsResponse;
import com.example.goodgut_server.product.domain.SourceErrorCategory;
import com.example.goodgut_server.product.domain.SourceErrorProductLookup;
import com.networknt.schema.InputFormat;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaLocation;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SpecificationVersion;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductLookupControllerTests {

    private static final String LOOKUP_SCHEMA_ID =
            "https://goodgut.app/schemas/product-lookup-2.0.schema.json";
    private static final String PRODUCT_SCHEMA_ID =
            "https://goodgut.app/schemas/normalized-product-2.0.schema.json";
    private static final Path REPOSITORY_ROOT = findRepositoryRoot();
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Schema LOOKUP_SCHEMA = loadLookupSchema();

    private ProductLookupService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        service = mock(ProductLookupService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new ProductLookupController(service)).build();
    }

    @Test
    void preservesLeadingZerosAndReturnsContractOutcomeWithHttp200() throws Exception {
        when(service.lookup("0000000001008")).thenReturn(new NotFoundProductLookup("0000000001008"));

        String response = mockMvc.perform(get("/products/0000000001008"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contractVersion").value("2.0"))
                .andExpect(jsonPath("$.outcome").value("not_found"))
                .andExpect(jsonPath("$.barcode").value("0000000001008"))
                .andExpect(jsonPath("$.source.provider").value("open_food_facts"))
                .andExpect(jsonPath("$.reason").value("not_in_source"))
                .andReturn().getResponse().getContentAsString();

        assertValidContract(response);

        verify(service).lookup("0000000001008");
    }

    @Test
    void sourceErrorsAlsoReturnHttp200() throws Exception {
        when(service.lookup("12345678")).thenReturn(
                new SourceErrorProductLookup("12345678", SourceErrorCategory.NETWORK_ERROR));

        String response = mockMvc.perform(get("/products/12345678"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("source_error"))
                .andExpect(jsonPath("$.errorCategory").value("network_error"))
                .andReturn().getResponse().getContentAsString();

        assertValidContract(response);
    }

    @Test
    void serializesFoundOutcomeAgainstCanonicalContract() throws Exception {
        Path fixture = REPOSITORY_ROOT.resolve(
                "services/api/src/test/resources/fixtures/openfoodfacts/raw/solid-nutella.json");
        JsonNode raw = JSON.readTree(fixture.toFile());
        var mapper = new OpenFoodFactsProductMapper(
                Clock.fixed(Instant.parse("2026-08-19T13:30:00Z"), ZoneOffset.UTC),
                taxonomyIds -> new IngredientClassificationBatch("fixture-2026-08-19",
                        taxonomyIds.stream().distinct()
                                .map(id -> new IngredientClassification("fixture-2026-08-19", id, List.of()))
                                .collect(Collectors.toMap(IngredientClassification::nodeId, Function.identity()))));
        var found = mapper.map("3017620422003",
                JSON.treeToValue(raw.get("response"), OpenFoodFactsResponse.class));
        when(service.lookup("3017620422003")).thenReturn(found);

        String response = mockMvc.perform(get("/products/3017620422003"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("found"))
                .andExpect(jsonPath("$.product.identity.displayName").value("Nutella"))
                .andReturn().getResponse().getContentAsString();

        assertValidContract(response);
    }

    @Test
    void rejectsInvalidBarcodeBeforeCallingService() throws Exception {
        for (String invalid : new String[]{"1234567", "123456789012345", "1234abcd", "１２３４５６７８"}) {
            mockMvc.perform(get("/products/{barcode}", invalid))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("invalid_barcode"));
        }
        verifyNoInteractions(service);
    }

    private static void assertValidContract(String response) {
        var errors = LOOKUP_SCHEMA.validate(response, InputFormat.JSON,
                context -> context.executionConfig(config -> config.formatAssertionsEnabled(true)));
        assertTrue(errors.isEmpty(), () -> "Controller response violates canonical schema: " + errors);
    }

    private static Schema loadLookupSchema() {
        try {
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
            return schema;
        } catch (Exception exception) {
            throw new ExceptionInInitializerError(exception);
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
