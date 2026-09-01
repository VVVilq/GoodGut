package com.example.goodgut_server.product.source.openfoodfacts;

import com.example.goodgut_server.product.classification.IngredientClassifier;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.net.http.HttpClient;
import java.time.Clock;

@Configuration
@EnableConfigurationProperties(OpenFoodFactsProperties.class)
class OpenFoodFactsConfiguration {

    @Bean
    Clock productLookupClock() {
        return Clock.systemUTC();
    }

    @Bean
    OpenFoodFactsProductMapper openFoodFactsProductMapper(
            Clock productLookupClock, IngredientClassifier ingredientClassifier) {
        return new OpenFoodFactsProductMapper(productLookupClock, ingredientClassifier);
    }

    @Bean
    RestClient openFoodFactsRestClient(OpenFoodFactsProperties properties) {
        HttpClient httpClient = HttpClient.newBuilder()
                .connectTimeout(properties.connectTimeout())
                .build();
        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(httpClient);
        requestFactory.setReadTimeout(properties.readTimeout());
        return RestClient.builder()
                .baseUrl(properties.baseUrl())
                .defaultHeader(HttpHeaders.USER_AGENT, properties.userAgent())
                .requestFactory(requestFactory)
                .build();
    }
}
