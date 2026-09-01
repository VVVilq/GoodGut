package com.example.goodgut_server.catalogue.persistence;

public record TaxonomyLabelRow(
        String taxonomyId,
        String locale,
        String kind,
        String label,
        String normalizedLabel) {
}
