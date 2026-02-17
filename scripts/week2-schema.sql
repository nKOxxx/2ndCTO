-- Add security_findings table for Week 2

CREATE TABLE IF NOT EXISTS security_findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  file_id UUID REFERENCES code_files(id) ON DELETE CASCADE,
  severity VARCHAR(20) NOT NULL, -- critical, high, medium, low
  category VARCHAR(50) NOT NULL, -- secret, vulnerability, backdoor, misconfiguration, risk
  file_path TEXT NOT NULL,
  line_number INTEGER,
  description TEXT NOT NULL,
  evidence TEXT,
  confidence FLOAT DEFAULT 0.8,
  rule_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'open', -- open, false_positive, resolved
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for security queries
CREATE INDEX IF NOT EXISTS idx_security_repo ON security_findings(repo_id);
CREATE INDEX IF NOT EXISTS idx_security_severity ON security_findings(severity);
CREATE INDEX IF NOT EXISTS idx_security_category ON security_findings(category);
CREATE INDEX IF NOT EXISTS idx_security_status ON security_findings(status);

-- Add file_id to code_entities if not exists
ALTER TABLE code_entities 
ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES code_files(id) ON DELETE CASCADE;

-- Add size_bytes to code_files if not exists
ALTER TABLE code_files 
ADD COLUMN IF NOT EXISTS size_bytes INTEGER;
