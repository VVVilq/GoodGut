package com.example.goodgut_server.product.domain;

public enum SourceErrorCategory {
    RATE_LIMITED("rate_limited"),
    NETWORK_ERROR("network_error"),
    INVALID_SOURCE_RESPONSE("invalid_source_response"),
    SOURCE_UNAVAILABLE("source_unavailable");

    private final String wireValue;

    SourceErrorCategory(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }
}
