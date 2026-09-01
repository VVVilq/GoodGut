package com.example.goodgut_server.catalogue;

import com.example.goodgut_server.catalogue.importer.TaxonomyImportRequest;
import com.example.goodgut_server.catalogue.importer.TaxonomyImportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class IngredientCatalogueControllerTests {

    @Autowired WebApplicationContext context;
    @Autowired TaxonomyImportService importer;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    @Test
    void returnsExplicitUnavailableResponseWithoutActiveRelease() throws Exception {
        mvc.perform(get("/ingredient-catalogue/promoted").param("locale", "pl"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("catalogue_unavailable"));
    }

    @Test
    void promotedUsesLocalizedLabelAndReportsScopes() throws Exception {
        activateFixture();
        mvc.perform(get("/ingredient-catalogue/promoted").param("locale", "pl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.catalogueVersion").value("catalogue-test"))
                .andExpect(jsonPath("$.items[0].nodeId").value("en:milk"))
                .andExpect(jsonPath("$.items[0].label").value("mleko"))
                .andExpect(jsonPath("$.items[0].hasChildren").value(true))
                .andExpect(jsonPath("$.items[0].supportedScopes[1]").value("subtree"));
    }

    @Test
    void searchCoversSynonymsFallbackBreadcrumbRankingAndPaging() throws Exception {
        activateFixture();
        mvc.perform(get("/ingredient-catalogue/search")
                        .param("q", "kozie mleko").param("locale", "pl").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].nodeId").value("en:goat-milk"))
                .andExpect(jsonPath("$.items[0].label").value("mleko kozie"))
                .andExpect(jsonPath("$.items[0].breadcrumb[0].nodeId").value("en:dairy-ingredient"))
                .andExpect(jsonPath("$.total").value(1));

        mvc.perform(get("/ingredient-catalogue/search")
                        .param("q", "whole goat").param("locale", "pl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].locale").value("en"))
                .andExpect(jsonPath("$.items[0].label").value("whole goat milk"));

        mvc.perform(get("/ingredient-catalogue/search")
                        .param("q", "milk").param("locale", "en").param("page", "1").param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(1));
    }

    @Test
    void rejectsShortQueriesAndBoundsPageSize() throws Exception {
        activateFixture();
        mvc.perform(get("/ingredient-catalogue/search").param("q", "m"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("invalid_request"));
        mvc.perform(get("/ingredient-catalogue/search").param("q", "milk").param("size", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(50));
    }

    @Test
    void exposesDirectChildrenForExpandableBranches() throws Exception {
        activateFixture();
        mvc.perform(get("/ingredient-catalogue/children").param("nodeId", "en:milk").param("locale", "pl"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].nodeId").value("en:goat-milk"))
                .andExpect(jsonPath("$.items[0].breadcrumb[0].nodeId").value("en:dairy-ingredient"));
    }

    private void activateFixture() throws Exception {
        Path source = Path.of(getClass().getResource("/fixtures/taxonomy/ingredients-small.json").toURI());
        importer.importRelease(new TaxonomyImportRequest(
                source, "catalogue-test", "fixture", checksum(source), true));
    }

    private String checksum(Path source) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = Files.newInputStream(source)) {
            input.transferTo(new java.security.DigestOutputStream(java.io.OutputStream.nullOutputStream(), digest));
        }
        return HexFormat.of().formatHex(digest.digest());
    }
}
