-- Create merchant_types and move merchants from enum/varchar column to FK

CREATE TABLE "merchant_types" (
    "id" UUID NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merchant_types_code_key" ON "merchant_types"("code");

INSERT INTO "merchant_types" ("id", "code", "name", "description", "is_active", "sort_order", "created_at", "updated_at")
VALUES
    ('a0000000-0000-4000-8000-000000000001', 'SUPERMARKET', 'Supermarket', NULL, true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-4000-8000-000000000002', 'RESTAURANT', 'Restaurant', NULL, true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-4000-8000-000000000003', 'PHARMACY', 'Pharmacy', NULL, true, 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('a0000000-0000-4000-8000-000000000004', 'OTHER', 'Other', NULL, true, 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "merchants" ADD COLUMN "merchant_type_id" UUID;

UPDATE "merchants" m
SET "merchant_type_id" = COALESCE(
    (SELECT mt.id FROM "merchant_types" mt WHERE mt.code = upper(trim(both from m."merchant_type"::text))),
    (SELECT id FROM "merchant_types" WHERE code = 'OTHER')
);

ALTER TABLE "merchants" ALTER COLUMN "merchant_type_id" SET NOT NULL;

ALTER TABLE "merchants" DROP COLUMN "merchant_type";

ALTER TABLE "merchants" ADD CONSTRAINT "merchants_merchant_type_id_fkey" FOREIGN KEY ("merchant_type_id") REFERENCES "merchant_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "merchants_merchant_type_id_idx" ON "merchants"("merchant_type_id");

DROP TYPE IF EXISTS "MerchantType";
