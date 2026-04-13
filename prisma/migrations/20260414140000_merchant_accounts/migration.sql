CREATE TABLE "merchant_accounts" (
    "id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "full_name" VARCHAR(255),
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "merchant_accounts_email_key" ON "merchant_accounts"("email");
CREATE UNIQUE INDEX "merchant_accounts_phone_key" ON "merchant_accounts"("phone");
CREATE INDEX "merchant_accounts_merchant_id_idx" ON "merchant_accounts"("merchant_id");

ALTER TABLE "merchant_accounts" ADD CONSTRAINT "merchant_accounts_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
