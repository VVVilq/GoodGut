package com.example.goodgut_server.product.domain;

import java.util.List;

public record ProductIdentity(
        String displayName,
        List<String> brands,
        String quantity,
        String imageUrl) {

    public ProductIdentity {
        brands = List.copyOf(brands);
    }
}
