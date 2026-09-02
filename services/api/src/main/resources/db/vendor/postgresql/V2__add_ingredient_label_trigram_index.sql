CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX ingredient_label_normalized_trgm_idx
    ON ingredient_label USING GIN (normalized_label gin_trgm_ops);
