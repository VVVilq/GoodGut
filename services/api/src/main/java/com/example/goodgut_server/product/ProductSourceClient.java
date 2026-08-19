package com.example.goodgut_server.product;

public interface ProductSourceClient {

    ProductSourceResult lookup(String barcode);
}
