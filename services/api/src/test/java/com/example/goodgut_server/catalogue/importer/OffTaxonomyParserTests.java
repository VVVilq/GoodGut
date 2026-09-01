package com.example.goodgut_server.catalogue.importer;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OffTaxonomyParserTests {

    private final OffTaxonomyParser parser = new OffTaxonomyParser(new ObjectMapper());

    @Test
    void streamsOnlyPolishAndEnglishDiscoveryDataAndKeepsMultipleParents() throws Exception {
        List<OffTaxonomyEntry> entries = new ArrayList<>();

        parser.forEach(fixture("ingredients-small.json"), entries::add);

        assertThat(entries).hasSize(4);
        OffTaxonomyEntry milk = entries.getFirst();
        assertThat(milk.names()).containsExactlyInAnyOrderEntriesOf(
                java.util.Map.of("en", "milk", "pl", "mleko"));
        assertThat(milk.synonyms()).containsOnlyKeys("en", "pl");
        assertThat(entries.get(2).parents())
                .containsExactly("en:milk", "en:dairy-ingredient");
    }

    private Path fixture(String name) throws Exception {
        return Path.of(getClass().getResource("/fixtures/taxonomy/" + name).toURI());
    }
}
