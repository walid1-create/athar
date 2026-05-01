-- AlterTable
ALTER TABLE "merchant_categories" ADD COLUMN "name_ar" VARCHAR(255);
ALTER TABLE "merchant_categories" ADD COLUMN "description_ar" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "name_ar" VARCHAR(255);
ALTER TABLE "products" ADD COLUMN "description_ar" TEXT;
