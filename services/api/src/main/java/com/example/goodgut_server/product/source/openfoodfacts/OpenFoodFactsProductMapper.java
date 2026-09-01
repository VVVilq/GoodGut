package com.example.goodgut_server.product.source.openfoodfacts;

import com.example.goodgut_server.product.classification.IngredientClassification;
import com.example.goodgut_server.product.classification.IngredientClassificationBatch;
import com.example.goodgut_server.product.classification.IngredientClassifier;
import com.example.goodgut_server.product.domain.FoundProductLookup;
import com.example.goodgut_server.product.domain.FoundProductSource;
import com.example.goodgut_server.product.domain.NormalizedProduct;
import com.example.goodgut_server.product.domain.NutriScore;
import com.example.goodgut_server.product.domain.NutritionBasis;
import com.example.goodgut_server.product.domain.NutritionFact;
import com.example.goodgut_server.product.domain.NutritionUnavailableReason;
import com.example.goodgut_server.product.domain.ProductIdentity;
import com.example.goodgut_server.product.domain.ProductIngredientItem;
import com.example.goodgut_server.product.domain.ProductIngredients;
import com.example.goodgut_server.product.domain.ProductLookupResponse;
import com.example.goodgut_server.product.domain.ProductNutrition;
import com.example.goodgut_server.product.domain.SourceErrorCategory;
import com.example.goodgut_server.product.domain.SourceErrorProductLookup;
import com.example.goodgut_server.product.source.openfoodfacts.OpenFoodFactsResponse.OpenFoodFactsIngredient;
import com.example.goodgut_server.product.source.openfoodfacts.OpenFoodFactsResponse.OpenFoodFactsProduct;
import tools.jackson.databind.JsonNode;

import java.time.Clock;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class OpenFoodFactsProductMapper {

    private static final Set<String> NUTRI_SCORE_GRADES = Set.of("a", "b", "c", "d", "e");

    private final Clock clock;
    private final IngredientClassifier ingredientClassifier;

    public OpenFoodFactsProductMapper(Clock clock, IngredientClassifier ingredientClassifier) {
        this.clock = clock;
        this.ingredientClassifier = ingredientClassifier;
    }

    public ProductLookupResponse map(String requestedBarcode, OpenFoodFactsResponse response) {
        if (response == null || response.product() == null || !isSuccess(response.status())) {
            return invalidSource(requestedBarcode);
        }

        OpenFoodFactsProduct source = response.product();
        String displayName = usable(source.productName());
        if (displayName == null) {
            return invalidSource(requestedBarcode);
        }

        String providerCode = firstUsable(source.code(), response.code());
        String providerUrl = providerCode == null
                ? null
                : "https://world.openfoodfacts.org/product/" + providerCode;
        NormalizedProduct product = new NormalizedProduct(
                new ProductIdentity(
                        displayName,
                        splitBrands(source.brands()),
                        usable(source.quantity()),
                        usable(source.imageFrontUrl())),
                mapNutriScore(source.nutriScoreGrade()),
                mapIngredients(source),
                mapNutrition(source));

        return new FoundProductLookup(
                requestedBarcode,
                FoundProductSource.openFoodFacts(providerUrl, clock.instant()),
                product);
    }

    private boolean isSuccess(String status) {
        return "success".equals(status) || "success_with_warnings".equals(status);
    }

    private SourceErrorProductLookup invalidSource(String barcode) {
        return new SourceErrorProductLookup(barcode, SourceErrorCategory.INVALID_SOURCE_RESPONSE);
    }

    private List<String> splitBrands(String source) {
        if (usable(source) == null) {
            return List.of();
        }
        LinkedHashSet<String> brands = new LinkedHashSet<>();
        for (String brand : source.split(",")) {
            String normalized = usable(brand);
            if (normalized != null) {
                brands.add(normalized);
            }
        }
        return List.copyOf(brands);
    }

    private NutriScore mapNutriScore(String source) {
        String grade = usable(source);
        if (grade == null) {
            return NutriScore.missing();
        }
        grade = grade.toLowerCase(Locale.ROOT);
        return NUTRI_SCORE_GRADES.contains(grade) ? NutriScore.available(grade) : NutriScore.missing();
    }

    private ProductIngredients mapIngredients(OpenFoodFactsProduct source) {
        if (source.ingredients() == null || source.ingredients().isEmpty()) {
            return usable(source.ingredientsText()) == null
                    ? ProductIngredients.missing()
                    : ProductIngredients.unparseable();
        }
        boolean[] partial = {source.unknownIngredientsCount() == null || source.unknownIngredientsCount() != 0};
        List<LeafCandidate> candidates = new ArrayList<>();
        for (OpenFoodFactsIngredient ingredient : source.ingredients()) {
            collectTrustedLeaves(ingredient, candidates, partial);
        }
        IngredientClassificationBatch batch = ingredientClassifier.classify(
                candidates.stream().map(LeafCandidate::nodeId).toList());
        List<ProductIngredientItem> items = new ArrayList<>();
        for (LeafCandidate candidate : candidates) {
            IngredientClassification resolved = batch.classifications().get(candidate.nodeId());
            if (resolved == null) {
                partial[0] = true;
            } else {
                items.add(new ProductIngredientItem(
                        candidate.displayName(), resolved.nodeId(), resolved.ancestorNodeIds()));
            }
        }
        List<ProductIngredientItem> uniqueItems = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (ProductIngredientItem item : items) {
            if (seen.add(item.nodeId())) uniqueItems.add(item);
        }
        return uniqueItems.isEmpty() || batch.catalogueVersion() == null
                ? ProductIngredients.unparseable()
                : ProductIngredients.available(partial[0] ? "partial" : "complete",
                        batch.catalogueVersion(), uniqueItems);
    }

    private void collectTrustedLeaves(OpenFoodFactsIngredient ingredient,
            List<LeafCandidate> candidates, boolean[] partial) {
        if (ingredient == null || Integer.valueOf(0).equals(ingredient.isInTaxonomy())) {
            partial[0] = true;
            return;
        }
        if (ingredient.ingredients() != null && !ingredient.ingredients().isEmpty()) {
            for (OpenFoodFactsIngredient child : ingredient.ingredients()) {
                collectTrustedLeaves(child, candidates, partial);
            }
            return;
        }
        String id = usable(ingredient.id());
        if (id == null || !id.startsWith("en:")) {
            partial[0] = true;
            return;
        }
        candidates.add(new LeafCandidate(id, displayIngredientName(id.substring(3), ingredient.text())));
    }

    private String displayIngredientName(String taxonomyId, String sourceText) {
        String text = usable(sourceText);
        return text == null ? taxonomyId.replace('-', ' ') : text;
    }

    private ProductNutrition mapNutrition(OpenFoodFactsProduct source) {
        NutritionBasis basis = basis(source.productQuantityUnit(), source.nutritionDataPer());
        JsonNode nutriments = source.nutriments();
        return new ProductNutrition(
                mapFact(nutriments, "energy-kcal", "kcal", basis),
                mapFact(nutriments, "carbohydrates", "g", basis),
                mapFact(nutriments, "sugars", "g", basis),
                mapFact(nutriments, "fat", "g", basis),
                mapFact(nutriments, "saturated-fat", "g", basis),
                mapFact(nutriments, "fiber", "g", basis),
                mapFact(nutriments, "proteins", "g", basis),
                mapFact(nutriments, "salt", "g", basis));
    }

    private NutritionBasis basis(String quantityUnit, String nutritionDataPer) {
        String unit = usable(quantityUnit);
        NutritionBasis basis = switch (unit == null ? "" : unit.toLowerCase(Locale.ROOT)) {
            case "g", "kg" -> NutritionBasis.PER_100G;
            case "ml", "cl", "l" -> NutritionBasis.PER_100ML;
            default -> null;
        };
        if (basis == null) {
            return null;
        }
        String declared = usable(nutritionDataPer);
        if (declared == null) {
            return basis;
        }
        boolean compatible = (basis == NutritionBasis.PER_100G && "100g".equalsIgnoreCase(declared))
                || (basis == NutritionBasis.PER_100ML
                && ("100ml".equalsIgnoreCase(declared) || "100g".equalsIgnoreCase(declared)));
        return compatible ? basis : null;
    }

    private NutritionFact mapFact(JsonNode nutriments, String sourceKey, String requiredUnit,
            NutritionBasis basis) {
        if (nutriments == null || !nutriments.isObject()) {
            return NutritionFact.unavailable(NutritionUnavailableReason.MISSING_SOURCE);
        }
        JsonNode valueNode = nutriments.get(sourceKey + "_100g");
        if (valueNode == null || valueNode.isNull()) {
            return NutritionFact.unavailable(NutritionUnavailableReason.MISSING_SOURCE);
        }
        if (!valueNode.isNumber()) {
            return NutritionFact.unavailable(NutritionUnavailableReason.INVALID_VALUE);
        }
        double value = valueNode.doubleValue();
        if (!Double.isFinite(value) || value < 0) {
            return NutritionFact.unavailable(NutritionUnavailableReason.INVALID_VALUE);
        }
        String sourceUnit = usableText(nutriments.get(sourceKey + "_unit"));
        if (sourceUnit == null || !requiredUnit.equalsIgnoreCase(sourceUnit)) {
            return NutritionFact.unavailable(NutritionUnavailableReason.UNSUPPORTED_UNIT);
        }
        if (basis == null) {
            return NutritionFact.unavailable(NutritionUnavailableReason.UNKNOWN_BASIS);
        }
        return NutritionFact.available(valueNode.numberValue(), requiredUnit, basis);
    }

    private String usableText(JsonNode node) {
        return node != null && node.isTextual() ? usable(node.asText()) : null;
    }

    private String firstUsable(String first, String second) {
        String value = usable(first);
        return value == null ? usable(second) : value;
    }

    private String usable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private record LeafCandidate(String nodeId, String displayName) {
    }
}
