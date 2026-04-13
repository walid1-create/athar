-- Remove legacy merchant integration / external API fields
ALTER TABLE "merchants" DROP COLUMN IF EXISTS "external_id";
ALTER TABLE "merchants" DROP COLUMN IF EXISTS "website_url";
ALTER TABLE "merchants" DROP COLUMN IF EXISTS "checkout_base_url";
ALTER TABLE "merchants" DROP COLUMN IF EXISTS "products_endpoint";
ALTER TABLE "merchants" DROP COLUMN IF EXISTS "categories_endpoint";
ALTER TABLE "merchants" DROP COLUMN IF EXISTS "auth_type";
ALTER TABLE "merchants" DROP COLUMN IF EXISTS "auth_config";
