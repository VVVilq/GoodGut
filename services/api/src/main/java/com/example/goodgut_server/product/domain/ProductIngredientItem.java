package com.example.goodgut_server.product.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProductIngredientItem(
        String recognition, String displayName, String nodeId, List<String> ancestorNodeIds) {

    public ProductIngredientItem {
        if (!"recognized".equals(recognition) && !"unrecognized".equals(recognition)) {
            throw new IllegalArgumentException("Unsupported ingredient recognition: " + recognition);
        }
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("Ingredient displayName must not be blank");
        }
        if ("recognized".equals(recognition) && (nodeId == null || ancestorNodeIds == null)) {
            throw new IllegalArgumentException("Recognized ingredients require taxonomy evidence");
        }
        if ("recognized".equals(recognition)
                && (!isTaxonomyId(nodeId) || ancestorNodeIds.stream().anyMatch(id -> !isTaxonomyId(id)))) {
            throw new IllegalArgumentException("Recognized ingredients require canonical taxonomy ids");
        }
        if ("unrecognized".equals(recognition) && (nodeId != null || ancestorNodeIds != null)) {
            throw new IllegalArgumentException("Unrecognized ingredients cannot carry taxonomy evidence");
        }
        ancestorNodeIds = ancestorNodeIds == null ? null : List.copyOf(ancestorNodeIds);
    }

    public static ProductIngredientItem recognized(
            String displayName, String nodeId, List<String> ancestorNodeIds) {
        return new ProductIngredientItem("recognized", displayName, nodeId, ancestorNodeIds);
    }

    public static ProductIngredientItem unrecognized(String displayName) {
        return new ProductIngredientItem("unrecognized", displayName, null, null);
    }

    private static boolean isTaxonomyId(String value) {
        return value != null && value.matches("^[a-z]{2}:[^\\s:]+$");
    }
}
