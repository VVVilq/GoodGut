# Implementation Review Follow-ups

## Classified product-result caching

Product scans currently require a successful API lookup. Treat offline access to previously classified products as a separate planned change rather than part of `ingredient-warning-scan` acceptance.

Before implementation, define:

- retention limits and eviction policy;
- invalidation when the taxonomy or product contract version changes;
- privacy expectations for locally retained barcode and product data;
- stale-result labeling and refresh/retry behavior;
- Android acceptance scenarios for offline scans and restored connectivity.

Use `/10x-new` and `/10x-plan` before adding this capability.
