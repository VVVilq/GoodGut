package com.example.goodgut_server;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
public class GoodgutServerApplication {

	public static void main(String[] args) {
		SpringApplication.run(GoodgutServerApplication.class, args);
	}

	@RestController
	static class HealthController {

		@GetMapping("/health")
		String health() {
			return "OK";
		}
	}

}
