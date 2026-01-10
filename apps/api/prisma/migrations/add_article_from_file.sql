-- Migration: Add support for importing articles from project files
-- This allows tracking articles that were imported from PDF/Word files

-- Add source_file_id to track which file an article was imported from
ALTER TABLE articles ADD COLUMN IF NOT EXISTS source_file_id TEXT;

-- Add extracted_bibliography JSONB for storing bibliography parsed from the file
ALTER TABLE articles ADD COLUMN IF NOT EXISTS extracted_bibliography JSONB;

-- Add is_from_file boolean flag for easy filtering
ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_from_file BOOLEAN DEFAULT FALSE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_articles_source_file_id ON articles(source_file_id);
CREATE INDEX IF NOT EXISTS idx_articles_is_from_file ON articles(is_from_file) WHERE is_from_file = TRUE;

-- Add column to project_articles to track if article was imported from file
-- This allows the article to persist even if the file is deleted
ALTER TABLE project_articles ADD COLUMN IF NOT EXISTS imported_from_file_id TEXT;
ALTER TABLE project_articles ADD COLUMN IF NOT EXISTS file_import_date TIMESTAMP;

-- Create index
CREATE INDEX IF NOT EXISTS idx_project_articles_imported_from_file ON project_articles(imported_from_file_id) WHERE imported_from_file_id IS NOT NULL;
