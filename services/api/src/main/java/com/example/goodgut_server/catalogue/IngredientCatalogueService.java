package com.example.goodgut_server.catalogue;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class IngredientCatalogueService {

    private static final List<String> PROMOTED_IDS = List.of(
            "en:milk", "en:egg", "en:wheat", "en:fish", "en:meat", "en:fruit",
            "en:vegetable", "en:cereal", "en:nuts", "en:seed", "en:mushroom", "en:soybean");
    private final IngredientCatalogueRepository repository;

    public IngredientCatalogueService(IngredientCatalogueRepository repository) {
        this.repository = repository;
    }

    public CatalogueResponse promoted(String requestedLocale) {
        String locale = locale(requestedLocale);
        IngredientCatalogueRepository.ActiveRelease release = requireRelease();
        List<CatalogueSearchRow> rows = repository.nodes(release.id(), PROMOTED_IDS, locale);
        Map<String, Integer> order = new HashMap<>();
        for (int index = 0; index < PROMOTED_IDS.size(); index++) order.put(PROMOTED_IDS.get(index), index);
        rows = rows.stream().sorted(Comparator.comparingInt(row -> order.getOrDefault(row.nodeId(), 999))).toList();
        List<CatalogueItem> items = enrich(release.id(), locale, rows);
        return new CatalogueResponse(release.version(), items, 0, items.size(), items.size());
    }

    public CatalogueResponse search(String rawQuery, String requestedLocale, int page, int size) {
        String query = TaxonomyTextNormalizer.normalize(rawQuery == null ? "" : rawQuery);
        if (query.length() < 2) throw new IllegalArgumentException("Search query must contain at least 2 characters.");
        if (page < 0) throw new IllegalArgumentException("Page must not be negative.");
        int boundedSize = Math.min(Math.max(size, 1), 50);
        String locale = locale(requestedLocale);
        IngredientCatalogueRepository.ActiveRelease release = requireRelease();
        List<CatalogueSearchRow> rows = repository.search(
                release.id(), query, locale, boundedSize, Math.multiplyExact(page, boundedSize));
        return new CatalogueResponse(release.version(), enrich(release.id(), locale, rows), page,
                boundedSize, repository.searchCount(release.id(), query, locale));
    }

    public CatalogueResponse children(String nodeId, String requestedLocale) {
        if (nodeId == null || !nodeId.contains(":")) throw new IllegalArgumentException("A valid parent node id is required.");
        String locale = locale(requestedLocale);
        IngredientCatalogueRepository.ActiveRelease release = requireRelease();
        List<CatalogueItem> items = enrich(release.id(), locale, repository.children(release.id(), nodeId, locale));
        return new CatalogueResponse(release.version(), items, 0, items.size(), items.size());
    }

    private List<CatalogueItem> enrich(long releaseId, String locale, List<CatalogueSearchRow> rows) {
        List<IngredientCatalogueRepository.EnrichmentRow> enrichment = repository.enrichment(
                releaseId, rows.stream().map(CatalogueSearchRow::nodeId).toList(), locale);
        Map<String, Map<String, List<String>>> parentsByRoot = new HashMap<>();
        Map<String, String> labels = new HashMap<>();
        Set<String> withChildren = new HashSet<>();
        for (IngredientCatalogueRepository.EnrichmentRow item : enrichment) {
            if (item.rootHasChildren()) withChildren.add(item.rootId());
            if (item.childId() == null) continue;
            parentsByRoot.computeIfAbsent(item.rootId(), ignored -> new HashMap<>())
                    .computeIfAbsent(item.childId(), ignored -> new ArrayList<>())
                    .add(item.parentId());
            labels.put(item.parentId(), item.parentLabel());
        }
        parentsByRoot.values().forEach(parents ->
                parents.values().forEach(values -> values.sort(String::compareTo)));
        return rows.stream().map(row -> new CatalogueItem(
                row.nodeId(), row.label(), row.locale(),
                breadcrumb(row.nodeId(), parentsByRoot.getOrDefault(row.nodeId(), Map.of()), labels), true,
                withChildren.contains(row.nodeId()),
                withChildren.contains(row.nodeId()) ? List.of("node", "subtree") : List.of("node"))).toList();
    }

    private List<CatalogueBreadcrumb> breadcrumb(
            String nodeId, Map<String, List<String>> parents, Map<String, String> labels) {
        List<CatalogueBreadcrumb> reversed = new ArrayList<>();
        Set<String> visited = new HashSet<>();
        String current = nodeId;
        while (visited.add(current)) {
            List<String> candidates = parents.getOrDefault(current, List.of());
            if (candidates.isEmpty()) break;
            current = candidates.getFirst();
            reversed.add(new CatalogueBreadcrumb(current, labels.getOrDefault(current, current)));
        }
        java.util.Collections.reverse(reversed);
        return List.copyOf(reversed);
    }

    private IngredientCatalogueRepository.ActiveRelease requireRelease() {
        IngredientCatalogueRepository.ActiveRelease release = repository.activeRelease();
        if (release == null) throw new CatalogueUnavailableException();
        return release;
    }

    private String locale(String value) {
        return "en".equalsIgnoreCase(value) ? "en" : "pl";
    }
}
