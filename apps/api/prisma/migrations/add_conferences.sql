-- Migration: add_conferences
-- Creates MedicalSpecialty enum and conferences table

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MedicalSpecialty') THEN
    CREATE TYPE "MedicalSpecialty" AS ENUM (
      'THERAPY',
      'SURGERY',
      'DENTISTRY',
      'CARDIOLOGY',
      'ENDOCRINOLOGY',
      'NEUROLOGY',
      'TRAUMATOLOGY',
      'OTORHINOLARYNGOLOGY',
      'REHABILITATION',
      'PLASTIC_SURGERY',
      'GENETICS'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "conferences" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid(),
  "title"        VARCHAR(300) NOT NULL,
  "subtitle"     VARCHAR(500),
  "location"     VARCHAR(300),
  "date"         TIMESTAMP(3) NOT NULL,
  "end_date"     TIMESTAMP(3),
  "specialty"    "MedicalSpecialty" NOT NULL,
  "description"  TEXT,
  "image_url"    VARCHAR(1000),
  "logo_url"     VARCHAR(1000),
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conferences_pkey" PRIMARY KEY ("id")
);

-- Add logo_url if table already exists (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conferences' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE "conferences" ADD COLUMN "logo_url" VARCHAR(1000);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "conferences_date_idx" ON "conferences"("date");
CREATE INDEX IF NOT EXISTS "conferences_specialty_idx" ON "conferences"("specialty");
CREATE INDEX IF NOT EXISTS "conferences_is_published_idx" ON "conferences"("is_published");

-- Drop restaurant schema if it exists
DROP SCHEMA IF EXISTS restaurant CASCADE;
