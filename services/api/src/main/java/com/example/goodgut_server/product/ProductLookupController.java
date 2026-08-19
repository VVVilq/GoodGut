package com.example.goodgut_server.product;

import com.example.goodgut_server.product.domain.ProductLookupResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.regex.Pattern;

@RestController
@RequestMapping("/products")
public class ProductLookupController {

    private static final Pattern BARCODE = Pattern.compile("[0-9]{8,14}");

    private final ProductLookupService service;

    public ProductLookupController(ProductLookupService service) {
        this.service = service;
    }

    @GetMapping("/{barcode}")
    ProductLookupResponse lookup(@PathVariable String barcode) {
        if (!BARCODE.matcher(barcode).matches()) {
            throw new InvalidBarcodeException();
        }
        return service.lookup(barcode);
    }

    @ExceptionHandler(InvalidBarcodeException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    ApiError invalidBarcode() {
        return new ApiError("invalid_barcode", "Barcode must contain 8 to 14 ASCII digits.");
    }

    record ApiError(String code, String message) {
    }

    private static final class InvalidBarcodeException extends RuntimeException {
    }
}
