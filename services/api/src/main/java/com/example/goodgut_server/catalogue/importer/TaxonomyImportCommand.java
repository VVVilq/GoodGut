package com.example.goodgut_server.catalogue.importer;

import com.example.goodgut_server.GoodgutServerApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;

import java.nio.file.Path;

public final class TaxonomyImportCommand {

    private TaxonomyImportCommand() {
    }

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            usage();
        }
        try (ConfigurableApplicationContext context = new SpringApplicationBuilder(GoodgutServerApplication.class)
                .web(WebApplicationType.NONE)
                .run()) {
            TaxonomyImportService service = context.getBean(TaxonomyImportService.class);
            if ("activate".equals(args[0]) && args.length == 2) {
                service.activate(Long.parseLong(args[1]));
                System.out.println("Activated taxonomy release " + args[1] + ".");
                return;
            }
            if (!"import".equals(args[0]) || args.length < 5 || args.length > 6) {
                usage();
            }
            TaxonomyImportReport report = service.importRelease(new TaxonomyImportRequest(
                    Path.of(args[1]),
                    args[2],
                    args[3],
                    args[4],
                    args.length == 6 && "--activate".equals(args[5])));
            System.out.printf(
                    "Imported release %d (%s): %d nodes, %d labels, %d edges, checksum %s, active=%s%n",
                    report.releaseId(), report.version(), report.entryCount(), report.labelCount(),
                    report.edgeCount(), report.checksumSha256(), report.activated());
        }
    }

    private static void usage() {
        throw new IllegalArgumentException("""
                Usage:
                  import <file> <version> <source-revision> <sha256> [--activate]
                  activate <release-id>
                """);
    }
}
