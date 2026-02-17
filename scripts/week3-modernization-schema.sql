-- Week 3 Part 2: Code Modernization Tables

-- Modernization jobs table
CREATE TABLE IF NOT EXISTS modernization_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  target_language VARCHAR(50) NOT NULL,
  transformations TEXT[], -- Array of transformation types
  file_count INTEGER DEFAULT 0,
  files_processed INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0, -- 0-100
  status VARCHAR(50) DEFAULT 'queued', -- queued, processing, completed, failed
  results JSONB, -- Stores converted files
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Modernized files (individual file results)
CREATE TABLE IF NOT EXISTS modernized_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES modernization_jobs(id) ON DELETE CASCADE,
  original_path TEXT NOT NULL,
  new_path TEXT,
  original_content TEXT,
  modernized_content TEXT,
  language VARCHAR(50),
  transformations_applied TEXT[],
  syntax_valid BOOLEAN,
  test_results JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_modernize_repo ON modernization_jobs(repo_id);
CREATE INDEX IF NOT EXISTS idx_modernize_status ON modernization_jobs(status);
CREATE INDEX IF NOT EXISTS idx_modernized_files_job ON modernized_files(job_id);
