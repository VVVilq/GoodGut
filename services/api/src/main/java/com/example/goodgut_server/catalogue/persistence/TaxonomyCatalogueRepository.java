package com.example.goodgut_server.catalogue.persistence;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Repository
public class TaxonomyCatalogueRepository {

    private final JdbcTemplate jdbcTemplate;

    public TaxonomyCatalogueRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public long createRelease(String version, String revision, String sourceUrl, String checksum) {
        KeyHolder keys = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO taxonomy_release(
                        version, source_revision, source_url, checksum_sha256, imported_at, status
                    ) VALUES (?, ?, ?, ?, ?, 'staged')
                    """, new String[]{"id"});
            statement.setString(1, version);
            statement.setString(2, revision);
            statement.setString(3, sourceUrl);
            statement.setString(4, checksum);
            statement.setObject(5, OffsetDateTime.now(ZoneOffset.UTC));
            return statement;
        }, keys);
        Number id = keys.getKey();
        if (id == null) {
            throw new IllegalStateException("Database did not return a taxonomy release id.");
        }
        return id.longValue();
    }

    public void insertNodes(long releaseId, List<String> taxonomyIds) {
        jdbcTemplate.batchUpdate(
                "INSERT INTO ingredient_taxon(release_id, taxonomy_id) VALUES (?, ?)",
                taxonomyIds,
                taxonomyIds.size(),
                (statement, taxonomyId) -> {
                    statement.setLong(1, releaseId);
                    statement.setString(2, taxonomyId);
                });
    }

    public void insertLabels(long releaseId, List<TaxonomyLabelRow> labels) {
        jdbcTemplate.batchUpdate("""
                INSERT INTO ingredient_label(
                    release_id, taxonomy_id, locale, kind, label, normalized_label
                ) VALUES (?, ?, ?, ?, ?, ?)
                """, labels, labels.size(), (statement, label) -> {
            statement.setLong(1, releaseId);
            statement.setString(2, label.taxonomyId());
            statement.setString(3, label.locale());
            statement.setString(4, label.kind());
            statement.setString(5, label.label());
            statement.setString(6, label.normalizedLabel());
        });
    }

    public void insertEdges(long releaseId, List<TaxonomyEdgeRow> edges) {
        jdbcTemplate.batchUpdate(
                "INSERT INTO ingredient_parent(release_id, child_id, parent_id) VALUES (?, ?, ?)",
                edges,
                edges.size(),
                (statement, edge) -> {
                    statement.setLong(1, releaseId);
                    statement.setString(2, edge.childId());
                    statement.setString(3, edge.parentId());
                });
    }

    public List<TaxonomyEdgeRow> findEdges(long releaseId) {
        return jdbcTemplate.query(
                "SELECT child_id, parent_id FROM ingredient_parent WHERE release_id = ?",
                (result, row) -> new TaxonomyEdgeRow(result.getString(1), result.getString(2)),
                releaseId);
    }

    public ReleaseCounts releaseCounts(long releaseId) {
        Integer nodes = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ingredient_taxon WHERE release_id = ?", Integer.class, releaseId);
        Integer labels = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ingredient_label WHERE release_id = ?", Integer.class, releaseId);
        Integer edges = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM ingredient_parent WHERE release_id = ?", Integer.class, releaseId);
        Integer missingEnglishCanonicalLabels = jdbcTemplate.queryForObject("""
                SELECT COUNT(*)
                FROM ingredient_taxon taxon
                WHERE taxon.release_id = ?
                  AND taxon.taxonomy_id LIKE 'en:%'
                  AND NOT EXISTS (
                    SELECT 1
                    FROM ingredient_label label
                    WHERE label.release_id = taxon.release_id
                      AND label.taxonomy_id = taxon.taxonomy_id
                      AND label.locale = 'en'
                      AND label.kind = 'canonical'
                      AND TRIM(label.label) <> ''
                  )
                """, Integer.class, releaseId);
        return new ReleaseCounts(nodes, labels, edges, missingEnglishCanonicalLabels);
    }

    public void completeRelease(long releaseId, int entries, int labels, int edges) {
        jdbcTemplate.update("""
                UPDATE taxonomy_release
                SET entry_count = ?, label_count = ?, edge_count = ?
                WHERE id = ? AND status = 'staged'
                """, entries, labels, edges, releaseId);
    }

    public void markFailed(long releaseId) {
        jdbcTemplate.update("UPDATE taxonomy_release SET status = 'failed' WHERE id = ?", releaseId);
    }

    public void activate(long releaseId) {
        jdbcTemplate.update("""
                UPDATE taxonomy_release SET status = 'retired'
                WHERE status = 'active' AND id <> ?
                """, releaseId);
        jdbcTemplate.update("DELETE FROM active_taxonomy_release WHERE singleton_key = 1");
        jdbcTemplate.update(
                "INSERT INTO active_taxonomy_release(singleton_key, release_id) VALUES (1, ?)",
                releaseId);
        jdbcTemplate.update("""
                UPDATE taxonomy_release
                SET status = 'active', activated_at = ?
                WHERE id = ? AND status IN ('staged', 'retired')
                """, OffsetDateTime.now(ZoneOffset.UTC), releaseId);
    }

    public Long activeReleaseId() {
        List<Long> ids = jdbcTemplate.query(
                "SELECT release_id FROM active_taxonomy_release WHERE singleton_key = 1",
                (result, row) -> result.getLong(1));
        return ids.isEmpty() ? null : ids.getFirst();
    }

    public String releaseStatus(long releaseId) {
        return jdbcTemplate.queryForObject(
                "SELECT status FROM taxonomy_release WHERE id = ?", String.class, releaseId);
    }

    public record ReleaseCounts(
            int nodes,
            int labels,
            int edges,
            int missingEnglishCanonicalLabels) {
    }
}
