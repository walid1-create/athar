-- Login credentials live on merchants; retire merchant_accounts
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "email" VARCHAR(255);
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50);
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'merchant_accounts'
  ) THEN
    UPDATE "merchants" m
    SET
      "email" = sub."email",
      "phone" = sub."phone",
      "password_hash" = sub."password_hash"
    FROM (
      SELECT DISTINCT ON ("merchant_id")
        "merchant_id",
        "email",
        "phone",
        "password_hash"
      FROM "merchant_accounts"
      ORDER BY "merchant_id", "created_at" ASC
    ) AS sub
    WHERE m."id" = sub."merchant_id";
  END IF;
END $$;

DROP TABLE IF EXISTS "merchant_accounts";

CREATE UNIQUE INDEX IF NOT EXISTS "merchants_email_key" ON "merchants"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "merchants_phone_key" ON "merchants"("phone");
