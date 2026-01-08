-- CreateTable
CREATE TABLE IF NOT EXISTS "project_files" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "description" TEXT,
    "used_in_documents" TEXT[] DEFAULT '{}',
    "uploaded_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "project_files_project_id_idx" ON "project_files"("project_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "project_files_category_idx" ON "project_files"("category");

-- AddForeignKey (ignore if exists)
DO $$ BEGIN
    ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_fkey" 
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey (ignore if exists)
DO $$ BEGIN
    ALTER TABLE "project_files" ADD CONSTRAINT "project_files_uploaded_by_fkey" 
    FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add used_in_documents column if not exists
DO $$ BEGIN
    ALTER TABLE "project_files" ADD COLUMN "used_in_documents" TEXT[] DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
