package com.example.goodgut_server.product;

import com.example.goodgut_server.product.domain.NotFoundProductLookup;
import com.example.goodgut_server.product.domain.ProductLookupResponse;
import com.example.goodgut_server.product.domain.SourceErrorProductLookup;
import com.example.goodgut_server.product.source.openfoodfacts.OpenFoodFactsProductMapper;
import org.springframework.stereotype.Service;

@Service
public class ProductLookupService {

    private final ProductSourceClient sourceClient;
    private final OpenFoodFactsProductMapper mapper;

    public ProductLookupService(ProductSourceClient sourceClient, OpenFoodFactsProductMapper mapper) {
        this.sourceClient = sourceClient;
        this.mapper = mapper;
    }

    public ProductLookupResponse lookup(String barcode) {
        return switch (sourceClient.lookup(barcode)) {
            case ProductSourceResult.Found found -> mapper.map(barcode, found.response());
            case ProductSourceResult.NotFound ignored -> new NotFoundProductLookup(barcode);
            case ProductSourceResult.Failure failure ->
                    new SourceErrorProductLookup(barcode, failure.category());
        };
    }
}
