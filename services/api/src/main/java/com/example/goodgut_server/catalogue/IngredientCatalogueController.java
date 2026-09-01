package com.example.goodgut_server.catalogue;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/ingredient-catalogue")
public class IngredientCatalogueController {

    private final IngredientCatalogueService service;

    public IngredientCatalogueController(IngredientCatalogueService service) {
        this.service = service;
    }

    @GetMapping("/promoted")
    public CatalogueResponse promoted(@RequestParam(defaultValue = "pl") String locale) {
        return service.promoted(locale);
    }

    @GetMapping("/search")
    public CatalogueResponse search(
            @RequestParam String q,
            @RequestParam(defaultValue = "pl") String locale,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.search(q, locale, page, size);
    }

    @GetMapping("/children")
    public CatalogueResponse children(
            @RequestParam String nodeId,
            @RequestParam(defaultValue = "pl") String locale) {
        return service.children(nodeId, locale);
    }

    @ExceptionHandler(CatalogueUnavailableException.class)
    ResponseEntity<CatalogueUnavailableResponse> unavailable() {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new CatalogueUnavailableResponse("catalogue_unavailable", "Ingredient catalogue is unavailable."));
    }

    @ExceptionHandler({IllegalArgumentException.class, ArithmeticException.class})
    ResponseEntity<CatalogueUnavailableResponse> invalidRequest(RuntimeException exception) {
        return ResponseEntity.badRequest()
                .body(new CatalogueUnavailableResponse("invalid_request", exception.getMessage()));
    }
}
