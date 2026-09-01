package com.example.goodgut_server.catalogue;

public final class CatalogueUnavailableException extends RuntimeException {
    public CatalogueUnavailableException() {
        super("No active ingredient catalogue is available.");
    }
}
