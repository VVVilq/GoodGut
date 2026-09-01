package com.example.goodgut_server.catalogue.importer;

import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

@Component
public class OffTaxonomyParser {

    private static final List<String> SUPPORTED_LOCALES = List.of("pl", "en");

    private final ObjectMapper objectMapper;

    public OffTaxonomyParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void forEach(Path source, Consumer<OffTaxonomyEntry> consumer) throws IOException {
        try (InputStream input = Files.newInputStream(source);
                JsonParser parser = objectMapper.createParser(input)) {
            if (parser.nextToken() != JsonToken.START_OBJECT) {
                throw new IllegalArgumentException("OFF taxonomy root must be a JSON object.");
            }
            while (parser.nextToken() != JsonToken.END_OBJECT) {
                if (parser.currentToken() != JsonToken.PROPERTY_NAME) {
                    throw new IllegalArgumentException("OFF taxonomy entry must have an identifier.");
                }
                String taxonomyId = parser.currentName();
                if (parser.nextToken() != JsonToken.START_OBJECT) {
                    throw new IllegalArgumentException("OFF taxonomy entry must be a JSON object: " + taxonomyId);
                }
                JsonNode node = parser.readValueAsTree();
                consumer.accept(new OffTaxonomyEntry(
                        taxonomyId,
                        localizedNames(node.get("name")),
                        localizedSynonyms(node.get("synonyms")),
                        stringArray(node.get("parents"))));
            }
        }
    }

    private Map<String, String> localizedNames(JsonNode value) {
        Map<String, String> result = new LinkedHashMap<>();
        if (value == null || !value.isObject()) {
            return result;
        }
        for (String locale : SUPPORTED_LOCALES) {
            JsonNode label = value.get(locale);
            if (label != null && label.isString() && !label.asString().isBlank()) {
                result.put(locale, label.asString().trim());
            }
        }
        return result;
    }

    private Map<String, List<String>> localizedSynonyms(JsonNode value) {
        Map<String, List<String>> result = new LinkedHashMap<>();
        if (value == null || !value.isObject()) {
            return result;
        }
        for (String locale : SUPPORTED_LOCALES) {
            List<String> labels = stringArray(value.get(locale));
            if (!labels.isEmpty()) {
                result.put(locale, labels);
            }
        }
        return result;
    }

    private List<String> stringArray(JsonNode value) {
        if (value == null || !value.isArray()) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        for (JsonNode item : value) {
            if (item.isString() && !item.asString().isBlank()) {
                result.add(item.asString().trim());
            }
        }
        return List.copyOf(result);
    }
}
