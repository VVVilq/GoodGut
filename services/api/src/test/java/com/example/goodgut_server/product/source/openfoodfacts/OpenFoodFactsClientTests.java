package com.example.goodgut_server.product.source.openfoodfacts;

import com.example.goodgut_server.product.ProductSourceResult;
import com.example.goodgut_server.product.domain.SourceErrorCategory;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OpenFoodFactsClientTests {

    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void sendsSelectedFieldsAndConfiguredUserAgentExactlyOnce() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        AtomicReference<URI> requestUri = new AtomicReference<>();
        AtomicReference<String> userAgent = new AtomicReference<>();
        start(exchange -> {
            calls.incrementAndGet();
            requestUri.set(exchange.getRequestURI());
            userAgent.set(exchange.getRequestHeaders().getFirst("User-Agent"));
            respond(exchange, 200, """
                    {"status":"success","code":"0000000001008","product":{"product_name":"Example"}}
                    """);
        });

        ProductSourceResult result = client(Duration.ofSeconds(1)).lookup("0000000001008");

        assertInstanceOf(ProductSourceResult.Found.class, result);
        assertEquals(1, calls.get());
        assertEquals("/api/v3/product/0000000001008", requestUri.get().getPath());
        String query = URLDecoder.decode(requestUri.get().getRawQuery(), StandardCharsets.UTF_8);
        assertEquals("fields=" + OpenFoodFactsClient.FIELDS, query);
        assertEquals("GoodGut-tests/1.0 (test@example.com)", userAgent.get());
    }

    @Test
    void classifiesHttpAndMalformedResponsesWithoutRetry() throws Exception {
        assertFailure(404, null, ProductSourceResult.NotFound.class, null);
        assertFailure(429, null, ProductSourceResult.Failure.class, SourceErrorCategory.RATE_LIMITED);
        assertFailure(503, null, ProductSourceResult.Failure.class, SourceErrorCategory.SOURCE_UNAVAILABLE);
        assertFailure(500, null, ProductSourceResult.Failure.class, SourceErrorCategory.SOURCE_UNAVAILABLE);
        assertFailure(200, "{not-json", ProductSourceResult.Failure.class,
                SourceErrorCategory.INVALID_SOURCE_RESPONSE);
    }

    @Test
    void readTimeoutMapsToNetworkErrorWithoutRetry() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        start(exchange -> {
            calls.incrementAndGet();
            try {
                Thread.sleep(250);
                respond(exchange, 200, "{}");
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
            }
        });

        ProductSourceResult result = client(Duration.ofMillis(30)).lookup("12345678");

        ProductSourceResult.Failure failure = assertInstanceOf(ProductSourceResult.Failure.class, result);
        assertEquals(SourceErrorCategory.NETWORK_ERROR, failure.category());
        assertEquals(1, calls.get());
    }

    private void assertFailure(int status, String body, Class<?> expectedType,
            SourceErrorCategory expectedCategory) throws Exception {
        AtomicInteger calls = new AtomicInteger();
        start(exchange -> {
            calls.incrementAndGet();
            respond(exchange, status, body == null ? "" : body);
        });

        ProductSourceResult result = client(Duration.ofSeconds(1)).lookup("12345678");

        assertTrue(expectedType.isInstance(result));
        if (expectedCategory != null) {
            assertEquals(expectedCategory, ((ProductSourceResult.Failure) result).category());
        }
        assertEquals(1, calls.get());
        server.stop(0);
        server = null;
    }

    private OpenFoodFactsClient client(Duration readTimeout) {
        OpenFoodFactsProperties properties = new OpenFoodFactsProperties(
                "http://localhost:" + server.getAddress().getPort(),
                "GoodGut-tests/1.0 (test@example.com)",
                Duration.ofSeconds(1),
                readTimeout);
        RestClient restClient = new OpenFoodFactsConfiguration().openFoodFactsRestClient(properties);
        return new OpenFoodFactsClient(restClient);
    }

    private void start(ExchangeHandler handler) throws IOException {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/", exchange -> handler.handle(exchange));
        server.start();
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        if (!body.isEmpty()) {
            exchange.getResponseHeaders().set("Content-Type", "application/json");
        }
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }

    @FunctionalInterface
    private interface ExchangeHandler {
        void handle(HttpExchange exchange) throws IOException;
    }
}
