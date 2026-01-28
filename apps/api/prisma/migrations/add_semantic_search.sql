-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embeddings table for semantic search
CREATE TABLE IF NOT EXISTS article_embeddings (
    article_id TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
    embedding vector(1536), -- OpenAI text-embedding-3-small размерность
    model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS article_embeddings_vector_idx 
    ON article_embeddings 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Add index on article_id for joins
CREATE INDEX IF NOT EXISTS article_embeddings_article_id_idx 
    ON article_embeddings(article_id);

-- Add column to track if embedding needs update
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS embedding_status VARCHAR(20) DEFAULT 'pending';

-- Index for filtering by embedding status
CREATE INDEX IF NOT EXISTS articles_embedding_status_idx 
    ON articles(embedding_status) 
    WHERE embedding_status != 'completed';

COMMENT ON TABLE article_embeddings IS 'Vector embeddings for semantic search';
COMMENT ON COLUMN article_embeddings.embedding IS 'Vector representation of title + abstract';
COMMENT ON COLUMN article_embeddings.model IS 'Embedding model used (e.g. text-embedding-3-small)';
