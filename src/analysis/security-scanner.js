const { supabase } = require('../db');

class SecurityScanner {
  constructor() {
    this.rules = this.loadRules();
  }

  loadRules() {
    // Custom security rules (can be extended)
    return [
      {
        id: 'SECRET_API_KEY',
        name: 'Potential API Key Exposure',
        pattern: /['"`]([a-zA-Z0-9_-]{20,})['"`].*api.*key|api.*key.*['"`]([a-zA-Z0-9_-]{20,})['"`]/i,
        severity: 'high',
        category: 'secret'
      },
      {
        id: 'HARDCODED_PASSWORD',
        name: 'Hardcoded Password',
        pattern: /password\s*[=:]\s*['"`]([^'"`]{4,})['"`]/i,
        severity: 'critical',
        category: 'secret'
      },
      {
        id: 'SQL_INJECTION',
        name: 'Potential SQL Injection',
        pattern: /(query|execute|exec)\s*\(\s*[`"'].*\$\{|query|execute|exec\s*\(\s*[^)]*\+/i,
        severity: 'high',
        category: 'vulnerability'
      },
      {
        id: 'EVAL_USAGE',
        name: 'Dangerous eval() Usage',
        pattern: /\beval\s*\(/,
        severity: 'high',
        category: 'vulnerability'
      },
      {
        id: 'INSECURE_RANDOM',
        name: 'Insecure Randomness',
        pattern: /Math\.random\s*\(\)/,
        severity: 'medium',
        category: 'vulnerability'
      },
      {
        id: 'DEBUGGER_STATEMENT',
        name: 'Debugger Statement in Code',
        pattern: /debugger\s*;/,
        severity: 'low',
        category: 'misconfiguration'
      },
      {
        id: 'TODO_SECURITY',
        name: 'Security TODO Comment',
        pattern: /\/\/.*TODO.*(?:security|auth|encrypt|hash)/i,
        severity: 'medium',
        category: 'risk'
      },
      {
        id: 'HTTP_NOT_HTTPS',
        name: 'Insecure HTTP URL',
        pattern: /['"`]http:\/\/[^'"`]+['"`]/i,
        severity: 'medium',
        category: 'misconfiguration'
      },
      {
        id: 'DISABLED_SSL_VERIFICATION',
        name: 'SSL Verification Disabled',
        pattern: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED.*0/i,
        severity: 'high',
        category: 'misconfiguration'
      },
      {
        id: 'BACKDOOR_SHELL',
        name: 'Potential Backdoor (shell execution)',
        pattern: /(child_process|exec|spawn|execSync)\s*\(\s*[`"'].*(?:curl|wget|nc|bash|sh|python)/i,
        severity: 'critical',
        category: 'backdoor'
      }
    ];
  }

  async scanFile(repoId, fileId, filePath, content) {
    const findings = [];

    for (const rule of this.rules) {
      const matches = this.findMatches(content, rule.pattern);
      
      for (const match of matches) {
        findings.push({
          repo_id: repoId,
          file_id: fileId,
          severity: rule.severity,
          category: rule.category,
          file_path: filePath,
          line_number: match.line,
          description: rule.name,
          evidence: match.text,
          confidence: match.confidence,
          rule_id: rule.id,
          status: 'open'
        });
      }
    }

    return findings;
  }

  findMatches(content, pattern) {
    const matches = [];
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        // Calculate confidence based on context
        let confidence = 0.8;
        
        // Higher confidence if in production code (not test/comments)
        if (line.includes('test') || line.includes('spec')) confidence -= 0.2;
        if (line.trim().startsWith('//')) confidence -= 0.3;
        if (line.trim().startsWith('*')) confidence -= 0.3;
        
        matches.push({
          line: index + 1,
          text: line.trim().substring(0, 100), // Limit evidence length
          confidence: Math.max(0.3, confidence)
        });
      }
    });

    return matches;
  }

  async saveFindings(findings) {
    if (findings.length === 0) return 0;

    const { error } = await supabase
      .from('security_findings')
      .insert(findings);

    if (error) {
      console.error('[@systems] Failed to save findings:', error.message);
      throw error;
    }

    console.log(`[@systems] Saved ${findings.length} security findings`);
    return findings.length;
  }

  generateReport(findings) {
    const critical = findings.filter(f => f.severity === 'critical').length;
    const high = findings.filter(f => f.severity === 'high').length;
    const medium = findings.filter(f => f.severity === 'medium').length;
    const low = findings.filter(f => f.severity === 'low').length;

    return {
      summary: { critical, high, medium, low, total: findings.length },
      categories: this.categorize(findings),
      top_risks: findings
        .filter(f => ['critical', 'high'].includes(f.severity))
        .slice(0, 10)
    };
  }

  categorize(findings) {
    const categories = {};
    for (const finding of findings) {
      if (!categories[finding.category]) {
        categories[finding.category] = [];
      }
      categories[finding.category].push(finding);
    }
    return categories;
  }
}

module.exports = SecurityScanner;
