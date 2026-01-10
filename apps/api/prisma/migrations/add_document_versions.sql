-- Document Versions - snapshots for version history
-- Умная система версионирования документов

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT,
    title VARCHAR(500),
    version_number INT NOT NULL,
    version_type VARCHAR(50) NOT NULL DEFAULT 'auto', -- 'auto', 'manual', 'exit'
    version_note TEXT, -- пользовательский комментарий к версии
    content_length INT, -- размер контента для сравнения
    content_hash VARCHAR(64), -- хеш для определения значительных изменений
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created ON document_versions(document_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_number ON document_versions(document_id, version_number DESC);

-- Function to auto-increment version number for a document
CREATE OR REPLACE FUNCTION get_next_version_number(doc_id UUID)
RETURNS INT AS $$
DECLARE
    next_num INT;
BEGIN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_num
    FROM document_versions
    WHERE document_id = doc_id;
    RETURN next_num;
END;
$$ LANGUAGE plpgsql;

-- Add last_version_at column to documents for tracking when the last version was created
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS last_version_at TIMESTAMP;

-- Comment
COMMENT ON TABLE document_versions IS 'Stores document history snapshots for version control';
COMMENT ON COLUMN document_versions.version_type IS 'Type: auto (time-based), manual (user-created), exit (on close)';
