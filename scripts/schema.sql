-- 2ndCTO Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_id BIGINT UNIQUE,
  owner VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(510),
  description TEXT,
  clone_url TEXT,
  default_branch VARCHAR(255),
  language VARCHAR(50),
  size_kb INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  topics TEXT[],
  analysis_status VARCHAR(50) DEFAULT 'pending',
  risk_score INTEGER,
  last_error TEXT,
  last_analyzed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Code files table
CREATE TABLE IF NOT EXISTS code_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT,
  language VARCHAR(50),
  line_count INTEGER,
  size_bytes INTEGER,
  ast_data JSONB,
  last_modified TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(repo_id, file_path)
);

-- Code entities table (functions, classes, etc.)
CREATE TABLE IF NOT EXISTS code_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  file_id UUID REFERENCES code_files(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  signature TEXT,
  start_line INTEGER,
  end_line INTEGER,
  ast_data JSONB,
  complexity_score INTEGER,
  dependencies UUID[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analysis jobs table
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  result JSONB,
  error TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_repositories_status ON repositories(analysis_status);
CREATE INDEX idx_repositories_github_id ON repositories(github_id);
CREATE INDEX idx_code_files_repo ON code_files(repo_id);
CREATE INDEX idx_code_files_language ON code_files(language);
CREATE INDEX idx_code_entities_repo ON code_entities(repo_id);
CREATE INDEX idx_code_entities_type ON code_entities(type);
