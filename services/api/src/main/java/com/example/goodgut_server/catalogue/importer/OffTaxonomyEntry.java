package com.example.goodgut_server.catalogue.importer;

import java.util.List;
import java.util.Map;

public record OffTaxonomyEntry(
        String taxonomyId,
        Map<String, String> names,
        Map<String, List<String>> synonyms,
        List<String> parents) {
}
