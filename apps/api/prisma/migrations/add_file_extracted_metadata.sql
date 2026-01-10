-- Add extracted_metadata column to project_files for caching AI extraction results
ALTER TABLE project_files 
ADD COLUMN IF NOT EXISTS extracted_metadata JSONB,
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS extraction_date TIMESTAMPTZ;

-- Index for quick lookup of files with cached metadata
CREATE INDEX IF NOT EXISTS idx_project_files_has_metadata 
ON project_files ((extracted_metadata IS NOT NULL));

COMMENT ON COLUMN project_files.extracted_metadata IS 'Cached AI-extracted article metadata (title, authors, DOI, bibliography, etc.)';
COMMENT ON COLUMN project_files.extracted_text IS 'Cached full text extracted from PDF/Word file';
COMMENT ON COLUMN project_files.extraction_date IS 'When the metadata was last extracted';
