package com.example.goodgut_server.product;

import com.example.goodgut_server.product.domain.NotFoundProductLookup;
import com.example.goodgut_server.product.domain.SourceErrorCategory;
import com.example.goodgut_server.product.domain.SourceErrorProductLookup;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProductLookupControllerTests {

    private ProductLookupService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        service = mock(ProductLookupService.class);
        mockMvc = MockMvcBuilders.standaloneSetup(new ProductLookupController(service)).build();
    }

    @Test
    void preservesLeadingZerosAndReturnsContractOutcomeWithHttp200() throws Exception {
        when(service.lookup("0000000001008")).thenReturn(new NotFoundProductLookup("0000000001008"));

        mockMvc.perform(get("/products/0000000001008"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contractVersion").value("1.0"))
                .andExpect(jsonPath("$.outcome").value("not_found"))
                .andExpect(jsonPath("$.barcode").value("0000000001008"))
                .andExpect(jsonPath("$.source.provider").value("open_food_facts"))
                .andExpect(jsonPath("$.reason").value("not_in_source"));

        verify(service).lookup("0000000001008");
    }

    @Test
    void sourceErrorsAlsoReturnHttp200() throws Exception {
        when(service.lookup("12345678")).thenReturn(
                new SourceErrorProductLookup("12345678", SourceErrorCategory.NETWORK_ERROR));

        mockMvc.perform(get("/products/12345678"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("source_error"))
                .andExpect(jsonPath("$.errorCategory").value("network_error"));
    }

    @Test
    void rejectsInvalidBarcodeBeforeCallingService() throws Exception {
        for (String invalid : new String[]{"1234567", "123456789012345", "1234abcd", "１２３４５６７８"}) {
            mockMvc.perform(get("/products/{barcode}", invalid))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code").value("invalid_barcode"));
        }
        verifyNoInteractions(service);
    }
}
