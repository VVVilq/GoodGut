package com.example.goodgut_server.catalogue;

import java.text.Normalizer;
import java.util.Locale;

public final class TaxonomyTextNormalizer {

    private TaxonomyTextNormalizer() {
    }

    public static String normalize(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFKC)
                .trim()
                .replaceAll("\\s+", " ")
                .toLowerCase(Locale.ROOT);
    }
}
