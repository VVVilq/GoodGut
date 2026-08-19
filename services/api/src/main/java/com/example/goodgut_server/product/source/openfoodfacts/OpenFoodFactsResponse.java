package com.example.goodgut_server.product.source.openfoodfacts;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import tools.jackson.databind.JsonNode;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record OpenFoodFactsResponse(String status, String code, OpenFoodFactsProduct product) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OpenFoodFactsProduct(
            String code,
            @JsonProperty("product_name") String productName,
            String brands,
            String quantity,
            @JsonProperty("product_quantity_unit") String productQuantityUnit,
            @JsonProperty("image_front_url") String imageFrontUrl,
            @JsonProperty("nutriscore_grade") String nutriScoreGrade,
            List<OpenFoodFactsIngredient> ingredients,
            @JsonProperty("ingredients_text") String ingredientsText,
            @JsonProperty("known_ingredients_n") Integer knownIngredientsCount,
            @JsonProperty("unknown_ingredients_n") Integer unknownIngredientsCount,
            JsonNode nutriments,
            @JsonProperty("nutrition_data_per") String nutritionDataPer) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OpenFoodFactsIngredient(
            String id,
            String text,
            @JsonProperty("is_in_taxonomy") Integer isInTaxonomy,
            List<OpenFoodFactsIngredient> ingredients) {
    }
}
