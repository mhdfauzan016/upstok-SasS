-- Minimum purchase quantity per product (defaults to 1).
ALTER TABLE "products" ADD COLUMN "min_purchase" INTEGER NOT NULL DEFAULT 1;
