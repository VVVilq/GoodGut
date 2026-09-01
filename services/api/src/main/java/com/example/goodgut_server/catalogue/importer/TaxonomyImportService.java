package com.example.goodgut_server.catalogue.importer;

import com.example.goodgut_server.catalogue.TaxonomyTextNormalizer;
import com.example.goodgut_server.catalogue.persistence.TaxonomyCatalogueRepository;
import com.example.goodgut_server.catalogue.persistence.TaxonomyEdgeRow;
import com.example.goodgut_server.catalogue.persistence.TaxonomyLabelRow;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class TaxonomyImportService {

    private static final int BATCH_SIZE = 1_000;

    private final OffTaxonomyParser parser;
    private final TaxonomyCatalogueRepository repository;
    private final TransactionTemplate transactions;

    public TaxonomyImportService(
            OffTaxonomyParser parser,
            TaxonomyCatalogueRepository repository,
            TransactionTemplate transactions) {
        this.parser = parser;
        this.repository = repository;
        this.transactions = transactions;
    }

    public TaxonomyImportReport importRelease(TaxonomyImportRequest request) throws IOException {
        validateRequest(request);
        String checksum = checksum(request);
        long releaseId = transactions.execute(status -> repository.createRelease(
                request.version().trim(),
                request.sourceRevision().trim(),
                TaxonomyImportRequest.OFF_INGREDIENTS_SOURCE,
                checksum));

        try {
            ImportCounts counts = transactions.execute(status -> {
                try {
                    return importContent(releaseId, request);
                } catch (IOException error) {
                    throw new TaxonomySourceException(error);
                }
            });
            if (request.activate()) {
                activate(releaseId);
            }
            return new TaxonomyImportReport(
                    releaseId,
                    request.version().trim(),
                    checksum,
                    counts.entries(),
                    counts.labels(),
                    counts.edges(),
                    request.activate());
        } catch (RuntimeException error) {
            transactions.executeWithoutResult(status -> repository.markFailed(releaseId));
            if (error instanceof TaxonomySourceException sourceError) {
                throw sourceError.ioException();
            }
            throw error;
        }
    }

    public void activate(long releaseId) {
        transactions.executeWithoutResult(status -> {
            String releaseStatus = repository.releaseStatus(releaseId);
            if (!List.of("staged", "retired", "active").contains(releaseStatus)) {
                throw new IllegalArgumentException("Only staged, retired, or active releases can be activated.");
            }
            if (!"active".equals(releaseStatus)) {
                repository.activate(releaseId);
            }
        });
    }

    private ImportCounts importContent(long releaseId, TaxonomyImportRequest request) throws IOException {
        int entries = importNodes(releaseId, request);
        int labels = importLabels(releaseId, request);
        int edges = importEdges(releaseId, request);
        validateAcyclic(repository.findEdges(releaseId));
        repository.completeRelease(releaseId, entries, labels, edges);
        return new ImportCounts(entries, labels, edges);
    }

    private int importNodes(long releaseId, TaxonomyImportRequest request) throws IOException {
        List<String> batch = new ArrayList<>(BATCH_SIZE);
        int[] count = {0};
        parser.forEach(request.source(), entry -> {
            requireTaxonomyId(entry.taxonomyId());
            batch.add(entry.taxonomyId());
            count[0]++;
            flushNodes(releaseId, batch, false);
        });
        flushNodes(releaseId, batch, true);
        if (count[0] == 0) {
            throw new IllegalArgumentException("OFF taxonomy contains no entries.");
        }
        return count[0];
    }

    private int importLabels(long releaseId, TaxonomyImportRequest request) throws IOException {
        List<TaxonomyLabelRow> batch = new ArrayList<>(BATCH_SIZE);
        int[] count = {0};
        parser.forEach(request.source(), entry -> {
            for (Map.Entry<String, String> name : entry.names().entrySet()) {
                addLabel(batch, entry.taxonomyId(), name.getKey(), "canonical", name.getValue(), count);
            }
            for (Map.Entry<String, List<String>> synonyms : entry.synonyms().entrySet()) {
                Map<String, String> unique = new LinkedHashMap<>();
                for (String synonym : synonyms.getValue()) {
                    unique.putIfAbsent(TaxonomyTextNormalizer.normalize(synonym), synonym);
                }
                for (String synonym : unique.values()) {
                    addLabel(batch, entry.taxonomyId(), synonyms.getKey(), "synonym", synonym, count);
                }
            }
            flushLabels(releaseId, batch, false);
        });
        flushLabels(releaseId, batch, true);
        return count[0];
    }

    private int importEdges(long releaseId, TaxonomyImportRequest request) throws IOException {
        List<TaxonomyEdgeRow> batch = new ArrayList<>(BATCH_SIZE);
        int[] count = {0};
        parser.forEach(request.source(), entry -> {
            Set<String> uniqueParents = new HashSet<>(entry.parents());
            for (String parent : uniqueParents) {
                requireTaxonomyId(parent);
                batch.add(new TaxonomyEdgeRow(entry.taxonomyId(), parent));
                count[0]++;
            }
            flushEdges(releaseId, batch, false);
        });
        flushEdges(releaseId, batch, true);
        return count[0];
    }

    private void addLabel(
            List<TaxonomyLabelRow> batch,
            String taxonomyId,
            String locale,
            String kind,
            String value,
            int[] count) {
        String normalized = TaxonomyTextNormalizer.normalize(value);
        if (normalized.isBlank()) {
            return;
        }
        batch.add(new TaxonomyLabelRow(taxonomyId, locale, kind, value.trim(), normalized));
        count[0]++;
    }

    private void flushNodes(long releaseId, List<String> batch, boolean force) {
        if (batch.size() >= BATCH_SIZE || force && !batch.isEmpty()) {
            repository.insertNodes(releaseId, List.copyOf(batch));
            batch.clear();
        }
    }

    private void flushLabels(long releaseId, List<TaxonomyLabelRow> batch, boolean force) {
        if (batch.size() >= BATCH_SIZE || force && !batch.isEmpty()) {
            repository.insertLabels(releaseId, List.copyOf(batch));
            batch.clear();
        }
    }

    private void flushEdges(long releaseId, List<TaxonomyEdgeRow> batch, boolean force) {
        if (batch.size() >= BATCH_SIZE || force && !batch.isEmpty()) {
            repository.insertEdges(releaseId, List.copyOf(batch));
            batch.clear();
        }
    }

    private void validateAcyclic(List<TaxonomyEdgeRow> edges) {
        Map<String, Set<String>> childrenByParent = new HashMap<>();
        Map<String, Integer> parentCount = new HashMap<>();
        Set<String> nodes = new HashSet<>();
        for (TaxonomyEdgeRow edge : edges) {
            nodes.add(edge.childId());
            nodes.add(edge.parentId());
            childrenByParent.computeIfAbsent(edge.parentId(), ignored -> new HashSet<>()).add(edge.childId());
            parentCount.merge(edge.childId(), 1, Integer::sum);
            parentCount.putIfAbsent(edge.parentId(), 0);
        }
        ArrayDeque<String> roots = new ArrayDeque<>();
        for (String node : nodes) {
            if (parentCount.getOrDefault(node, 0) == 0) {
                roots.add(node);
            }
        }
        int visited = 0;
        while (!roots.isEmpty()) {
            String parent = roots.removeFirst();
            visited++;
            for (String child : childrenByParent.getOrDefault(parent, Set.of())) {
                int remaining = parentCount.compute(child, (key, value) -> value - 1);
                if (remaining == 0) {
                    roots.add(child);
                }
            }
        }
        if (visited != nodes.size()) {
            throw new IllegalArgumentException("OFF taxonomy parent graph contains a cycle.");
        }
    }

    private String checksum(TaxonomyImportRequest request) throws IOException {
        String expected = request.expectedChecksumSha256().trim().toLowerCase();
        if (!expected.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("Expected checksum must be 64 lowercase hexadecimal characters.");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream input = Files.newInputStream(request.source())) {
                input.transferTo(new java.security.DigestOutputStream(java.io.OutputStream.nullOutputStream(), digest));
            }
            String actual = java.util.HexFormat.of().formatHex(digest.digest());
            if (!actual.equals(expected)) {
                throw new IllegalArgumentException("OFF taxonomy checksum does not match the expected value.");
            }
            return actual;
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable.", impossible);
        }
    }

    private void validateRequest(TaxonomyImportRequest request) {
        if (request.source() == null || !Files.isRegularFile(request.source())) {
            throw new IllegalArgumentException("OFF taxonomy source must be a readable file.");
        }
        if (request.version() == null || request.version().isBlank()
                || request.sourceRevision() == null || request.sourceRevision().isBlank()
                || request.expectedChecksumSha256() == null) {
            throw new IllegalArgumentException("Version, source revision, and checksum are required.");
        }
    }

    private void requireTaxonomyId(String value) {
        if (value == null || value.isBlank() || value.length() > 300 || !value.contains(":")) {
            throw new IllegalArgumentException("Invalid OFF taxonomy identifier: " + value);
        }
    }

    private record ImportCounts(int entries, int labels, int edges) {
    }

    private static final class TaxonomySourceException extends RuntimeException {

        private final IOException ioException;

        private TaxonomySourceException(IOException ioException) {
            super(ioException);
            this.ioException = ioException;
        }

        private IOException ioException() {
            return ioException;
        }
    }
}
