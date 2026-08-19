package com.example.goodgut_server.product.source.openfoodfacts;

import com.example.goodgut_server.product.ProductSourceClient;
import com.example.goodgut_server.product.ProductSourceResult;
import com.example.goodgut_server.product.domain.SourceErrorCategory;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class OpenFoodFactsClient implements ProductSourceClient {

    static final String FIELDS = String.join(",",
            "code", "product_name", "brands", "quantity", "product_quantity",
            "product_quantity_unit", "image_front_url", "nutriscore_grade", "ingredients",
            "ingredients_tags", "ingredients_text", "ingredients_lc", "known_ingredients_n",
            "unknown_ingredients_n", "nutriments", "nutrition_data_per", "schema_version");

    private final RestClient restClient;

    public OpenFoodFactsClient(RestClient openFoodFactsRestClient) {
        this.restClient = openFoodFactsRestClient;
    }

    @Override
    public ProductSourceResult lookup(String barcode) {
        try {
            OpenFoodFactsResponse body = restClient.get()
                    .uri(builder -> builder.path("/api/v3/product/{barcode}")
                            .queryParam("fields", FIELDS)
                            .build(barcode))
                    .retrieve()
                    .body(OpenFoodFactsResponse.class);
            return body == null
                    ? new ProductSourceResult.Failure(SourceErrorCategory.INVALID_SOURCE_RESPONSE)
                    : new ProductSourceResult.Found(body);
        } catch (ResourceAccessException exception) {
            return new ProductSourceResult.Failure(SourceErrorCategory.NETWORK_ERROR);
        } catch (RestClientResponseException exception) {
            return classifyStatus(exception.getStatusCode());
        } catch (RuntimeException exception) {
            return new ProductSourceResult.Failure(SourceErrorCategory.INVALID_SOURCE_RESPONSE);
        }
    }

    private ProductSourceResult classifyStatus(HttpStatusCode status) {
        if (status.value() == 404) {
            return new ProductSourceResult.NotFound();
        }
        if (status.value() == 429) {
            return new ProductSourceResult.Failure(SourceErrorCategory.RATE_LIMITED);
        }
        return new ProductSourceResult.Failure(SourceErrorCategory.SOURCE_UNAVAILABLE);
    }
}
