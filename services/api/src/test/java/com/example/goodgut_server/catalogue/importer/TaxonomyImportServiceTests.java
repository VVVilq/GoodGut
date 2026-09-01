package com.example.goodgut_server.catalogue.importer;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD)
class TaxonomyImportServiceTests {

    @Autowired
    private TaxonomyImportService service;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void importsPolishAndEnglishLabelsMultipleParentsAndActivatesRelease() throws Exception {
        Path source = fixture("ingredients-small.json");

        TaxonomyImportReport report = service.importRelease(request(source, "test-1", true));

        assertThat(report.entryCount()).isEqualTo(4);
        assertThat(report.edgeCount()).isEqualTo(3);
        assertThat(report.labelCount()).isEqualTo(16);
        assertThat(report.activated()).isTrue();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM ingredient_parent WHERE release_id = ? AND child_id = 'en:goat-milk'",
                Integer.class,
                report.releaseId())).isEqualTo(2);
        assertThat(jdbc.queryForObject(
                "SELECT status FROM taxonomy_release WHERE id = ?",
                String.class,
                report.releaseId())).isEqualTo("active");
    }

    @Test
    void failedCycleLeavesTheCurrentReleaseActive() throws Exception {
        Path valid = fixture("ingredients-small.json");
        TaxonomyImportReport active = service.importRelease(request(valid, "test-active", true));
        Path cycle = fixture("ingredients-cycle.json");

        assertThatThrownBy(() -> service.importRelease(request(cycle, "test-cycle", true)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("cycle");

        assertThat(jdbc.queryForObject(
                "SELECT release_id FROM active_taxonomy_release WHERE singleton_key = 1",
                Long.class)).isEqualTo(active.releaseId());
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM taxonomy_release WHERE version = 'test-cycle' AND status = 'failed'",
                Integer.class)).isEqualTo(1);
    }

    @Test
    void activationCanRollBackToThePreviousImmutableRelease() throws Exception {
        Path source = fixture("ingredients-small.json");
        TaxonomyImportReport first = service.importRelease(request(source, "test-first", true));
        Path secondSource = Files.createTempFile("goodgut-taxonomy-", ".json");
        secondSource.toFile().deleteOnExit();
        Files.writeString(secondSource, Files.readString(source) + System.lineSeparator());
        TaxonomyImportReport second = service.importRelease(request(secondSource, "test-second", false));
        service.activate(second.releaseId());

        service.activate(first.releaseId());

        assertThat(jdbc.queryForObject(
                "SELECT release_id FROM active_taxonomy_release WHERE singleton_key = 1",
                Long.class)).isEqualTo(first.releaseId());
        assertThat(jdbc.queryForObject(
                "SELECT status FROM taxonomy_release WHERE id = ?",
                String.class,
                second.releaseId())).isEqualTo("retired");
    }

    private TaxonomyImportRequest request(Path source, String version, boolean activate) throws Exception {
        return new TaxonomyImportRequest(source, version, "fixture-revision", checksum(source), activate);
    }

    private String checksum(Path source) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = Files.newInputStream(source)) {
            input.transferTo(new java.security.DigestOutputStream(java.io.OutputStream.nullOutputStream(), digest));
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private Path fixture(String name) throws Exception {
        return Path.of(getClass().getResource("/fixtures/taxonomy/" + name).toURI());
    }
}
