package com.example.goodgut_server.catalogue;

import com.example.goodgut_server.catalogue.persistence.TaxonomyEdgeRow;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class IngredientCatalogueRepository {

    private final JdbcTemplate jdbc;

    public IngredientCatalogueRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ActiveRelease activeRelease() {
        List<ActiveRelease> releases = jdbc.query("""
                SELECT r.id, r.version
                FROM active_taxonomy_release a
                JOIN taxonomy_release r ON r.id = a.release_id
                WHERE r.status = 'active'
                """, (result, row) -> new ActiveRelease(result.getLong(1), result.getString(2)));
        return releases.isEmpty() ? null : releases.getFirst();
    }

    public List<CatalogueSearchRow> search(long releaseId, String query, String locale, int limit, int offset) {
        return jdbc.query("""
                WITH matched AS (
                    SELECT l.taxonomy_id,
                           MIN(CASE
                               WHEN l.locale = ? AND l.kind = 'canonical' AND l.normalized_label = ? THEN 0
                               WHEN l.locale = ? AND l.normalized_label = ? THEN 1
                               WHEN l.locale = ? AND l.normalized_label LIKE ? THEN 2
                               WHEN l.locale = ? AND l.normalized_label LIKE ? THEN 3
                               WHEN l.locale = 'en' AND l.normalized_label = ? THEN 4
                               WHEN l.locale = 'en' AND l.normalized_label LIKE ? THEN 5
                               ELSE 6 END) AS rank
                    FROM ingredient_label l
                    WHERE l.release_id = ?
                      AND l.locale IN (?, 'en')
                      AND l.normalized_label LIKE ?
                    GROUP BY l.taxonomy_id
                )
                SELECT m.taxonomy_id,
                       COALESCE(local_label.label, english_label.label, m.taxonomy_id),
                       CASE WHEN local_label.label IS NULL THEN 'en' ELSE ? END
                FROM matched m
                LEFT JOIN ingredient_label local_label
                  ON local_label.release_id = ? AND local_label.taxonomy_id = m.taxonomy_id
                 AND local_label.locale = ? AND local_label.kind = 'canonical'
                LEFT JOIN ingredient_label english_label
                  ON english_label.release_id = ? AND english_label.taxonomy_id = m.taxonomy_id
                 AND english_label.locale = 'en' AND english_label.kind = 'canonical'
                ORDER BY m.rank, LENGTH(COALESCE(local_label.label, english_label.label, m.taxonomy_id)),
                         COALESCE(local_label.label, english_label.label, m.taxonomy_id), m.taxonomy_id
                LIMIT ? OFFSET ?
                """, (result, row) -> new CatalogueSearchRow(
                        result.getString(1), result.getString(2), result.getString(3)),
                locale, query, locale, query, locale, query + "%", locale, "%" + query + "%",
                query, query + "%", releaseId, locale, "%" + query + "%", locale,
                releaseId, locale, releaseId, limit, offset);
    }

    public long searchCount(long releaseId, String query, String locale) {
        Long count = jdbc.queryForObject("""
                SELECT COUNT(DISTINCT taxonomy_id) FROM ingredient_label
                WHERE release_id = ? AND locale IN (?, 'en') AND normalized_label LIKE ?
                """, Long.class, releaseId, locale, "%" + query + "%");
        return count == null ? 0 : count;
    }

    public List<CatalogueSearchRow> nodes(long releaseId, List<String> ids, String locale) {
        if (ids.isEmpty()) return List.of();
        String placeholders = String.join(",", java.util.Collections.nCopies(ids.size(), "?"));
        List<Object> parameters = new java.util.ArrayList<>();
        parameters.add(locale);
        parameters.add(releaseId);
        parameters.addAll(ids);
        return jdbc.query("""
                SELECT t.taxonomy_id, COALESCE(local_label.label, english_label.label, t.taxonomy_id),
                       CASE WHEN local_label.label IS NULL THEN 'en' ELSE ? END
                FROM ingredient_taxon t
                LEFT JOIN ingredient_label local_label
                  ON local_label.release_id=t.release_id AND local_label.taxonomy_id=t.taxonomy_id
                 AND local_label.locale=? AND local_label.kind='canonical'
                LEFT JOIN ingredient_label english_label
                  ON english_label.release_id=t.release_id AND english_label.taxonomy_id=t.taxonomy_id
                 AND english_label.locale='en' AND english_label.kind='canonical'
                WHERE t.release_id=? AND t.taxonomy_id IN (""" + placeholders + ")",
                (result, row) -> new CatalogueSearchRow(result.getString(1), result.getString(2), result.getString(3)),
                withRepeatedLocale(parameters, locale));
    }

    public List<CatalogueSearchRow> children(long releaseId, String parentId, String locale) {
        return jdbc.query("""
                SELECT child.child_id, COALESCE(local_label.label, english_label.label, child.child_id),
                       CASE WHEN local_label.label IS NULL THEN 'en' ELSE ? END
                FROM ingredient_parent child
                LEFT JOIN ingredient_label local_label ON local_label.release_id=child.release_id
                  AND local_label.taxonomy_id=child.child_id AND local_label.locale=? AND local_label.kind='canonical'
                LEFT JOIN ingredient_label english_label ON english_label.release_id=child.release_id
                  AND english_label.taxonomy_id=child.child_id AND english_label.locale='en' AND english_label.kind='canonical'
                WHERE child.release_id=? AND child.parent_id=?
                ORDER BY COALESCE(local_label.label, english_label.label, child.child_id), child.child_id
                """, (result, row) -> new CatalogueSearchRow(result.getString(1), result.getString(2), result.getString(3)),
                locale, locale, releaseId, parentId);
    }

    private Object[] withRepeatedLocale(List<Object> parameters, String locale) {
        parameters.add(1, locale);
        return parameters.toArray();
    }

    public List<TaxonomyEdgeRow> edges(long releaseId) {
        return jdbc.query("SELECT child_id, parent_id FROM ingredient_parent WHERE release_id = ?",
                (result, row) -> new TaxonomyEdgeRow(result.getString(1), result.getString(2)), releaseId);
    }

    public java.util.Map<String, String> canonicalLabels(long releaseId, String locale) {
        java.util.Map<String, String> labels = new java.util.HashMap<>();
        List<CatalogueSearchRow> rows = jdbc.query("""
                SELECT t.taxonomy_id, COALESCE(local_label.label, english_label.label, t.taxonomy_id)
                FROM ingredient_taxon t
                LEFT JOIN ingredient_label local_label ON local_label.release_id=t.release_id
                  AND local_label.taxonomy_id=t.taxonomy_id AND local_label.locale=? AND local_label.kind='canonical'
                LEFT JOIN ingredient_label english_label ON english_label.release_id=t.release_id
                  AND english_label.taxonomy_id=t.taxonomy_id AND english_label.locale='en' AND english_label.kind='canonical'
                WHERE t.release_id=?
                """, (result, row) -> new CatalogueSearchRow(result.getString(1), result.getString(2), locale),
                locale, releaseId);
        rows.forEach(row -> labels.put(row.nodeId(), row.label()));
        return labels;
    }

    public record ActiveRelease(long id, String version) {
    }
}
