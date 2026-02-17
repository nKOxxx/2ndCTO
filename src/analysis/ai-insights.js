const { supabase } = require('../db');

/**
 * AI Insights Generator
 * Analyzes findings and generates actionable recommendations
 */
class AIInsights {
  /**
   * Generate comprehensive insights for a repository
   */
  async generateInsights(repoId, report) {
    const insights = {
      summary: this.generateSummary(report),
      priorities: this.generatePriorities(report),
      fixes: this.generateFixes(report),
      trends: this.analyzeTrends(report),
      recommendations: this.generateRecommendations(report)
    };
    
    // Store insights
    await this.storeInsights(repoId, insights);
    
    return insights;
  }
  
  /**
   * Generate executive summary
   */
  generateSummary(report) {
    const risk = report.analysis.risk_score;
    const findings = report.security.summary;
    const busFactor = report.entities?.total || 0;
    
    let summary = '';
    let tone = '';
    
    if (risk >= 80) {
      summary = `Critical attention required. This codebase has ${findings.critical} critical security issues and a high concentration of knowledge risk.`;
      tone = 'urgent';
    } else if (risk >= 50) {
      summary = `Moderate risks detected. While functional, addressing the ${findings.high} high-priority issues will improve maintainability.`;
      tone = 'caution';
    } else {
      summary = `Healthy codebase with good practices. Minor improvements suggested for long-term maintainability.`;
      tone = 'positive';
    }
    
    return {
      text: summary,
      tone,
      score: risk,
      grade: this.getGrade(risk)
    };
  }
  
  /**
   * Get letter grade from score
   */
  getGrade(score) {
    if (score >= 90) return { letter: 'F', color: 'danger', label: 'Critical' };
    if (score >= 70) return { letter: 'D', color: 'warning', label: 'Poor' };
    if (score >= 50) return { letter: 'C', color: 'caution', label: 'Fair' };
    if (score >= 30) return { letter: 'B', color: 'good', label: 'Good' };
    return { letter: 'A', color: 'success', label: 'Excellent' };
  }
  
  /**
   * Generate prioritized action items
   */
  generatePriorities(report) {
    const priorities = [];
    const findings = report.security.top_findings || [];
    
    // Critical findings first
    const critical = findings.filter(f => f.severity === 'critical');
    critical.forEach((f, i) => {
      if (i < 3) {
        priorities.push({
          rank: priorities.length + 1,
          title: `Fix ${f.description}`,
          location: f.file_path,
          impact: `Resolving this reduces risk score by ~${Math.min(15, 5 + i * 3)} points`,
          effort: this.estimateEffort(f),
          type: 'security',
          severity: f.severity
        });
      }
    });
    
    // Bus factor issues
    if (report.analysis?.risk_score >= 70) {
      priorities.push({
        rank: priorities.length + 1,
        title: 'Address knowledge concentration',
        location: 'Team practices',
        impact: 'Improves bus factor from critical to acceptable range',
        effort: '2-3 weeks',
        type: 'process',
        severity: 'high'
      });
    }
    
    // Quick wins
    const quickWins = findings.filter(f => 
      f.severity === 'medium' && 
      (f.rule_id === 'DEBUGGER_STATEMENT' || f.rule_id === 'INSECURE_RANDOM')
    );
    
    if (quickWins.length > 0) {
      priorities.push({
        rank: priorities.length + 1,
        title: `Fix ${quickWins.length} quick-win issues`,
        location: 'Multiple files',
        impact: 'Low effort, immediate security improvement',
        effort: '1-2 hours',
        type: 'quick-win',
        severity: 'medium'
      });
    }
    
    return priorities.slice(0, 5);
  }
  
  /**
   * Estimate effort to fix
   */
  estimateEffort(finding) {
    switch (finding.rule_id) {
      case 'SECRET_API_KEY':
      case 'HARDCODED_PASSWORD':
        return '1-2 hours';
      case 'SQL_INJECTION':
        return '2-4 hours';
      case 'EVAL_USAGE':
        return '4-8 hours';
      case 'DEBUGGER_STATEMENT':
        return '5 minutes';
      default:
        return '1-3 hours';
    }
  }
  
  /**
   * Generate specific fix suggestions
   */
  generateFixes(report) {
    const fixes = [];
    const findings = report.security.top_findings || [];
    
    findings.slice(0, 3).forEach(finding => {
      const fix = this.getFixTemplate(finding);
      if (fix) {
        fixes.push({
          finding: finding.description,
          location: finding.file_path,
          explanation: fix.explanation,
          before: fix.before,
          after: fix.after,
          steps: fix.steps
        });
      }
    });
    
    return fixes;
  }
  
  /**
   * Get fix template for a finding type
   */
  getFixTemplate(finding) {
    const templates = {
      SECRET_API_KEY: {
        explanation: 'Move the API key from code to environment variables',
        before: `const API_KEY = 'sk_live_1234567890abcdef';`,
        after: `const API_KEY = process.env.API_KEY;`,
        steps: [
          '1. Remove the hardcoded key from the file',
          '2. Add API_KEY to your .env file',
          '3. Update deployment environment with the key',
          '4. Rotate the exposed key immediately'
        ]
      },
      HARDCODED_PASSWORD: {
        explanation: 'Use environment variables or a secrets manager',
        before: `const password = 'admin12345';`,
        after: `const password = process.env.DB_PASSWORD;`,
        steps: [
          '1. Move password to environment variable',
          '2. Use a secrets manager for production',
          '3. Change the exposed password immediately',
          '4. Check git history for the exposed password'
        ]
      },
      SQL_INJECTION: {
        explanation: 'Use parameterized queries instead of string concatenation',
        before: `db.query("SELECT * FROM users WHERE id = '" + userId + "'");`,
        after: `db.query("SELECT * FROM users WHERE id = ?", [userId]);`,
        steps: [
          '1. Identify all SQL query constructions',
          '2. Replace with parameterized queries',
          '3. Use an ORM for complex queries',
          '4. Add input validation layer'
        ]
      },
      EVAL_USAGE: {
        explanation: 'Parse JSON safely or use safer alternatives',
        before: `const data = eval(jsonString);`,
        after: `const data = JSON.parse(jsonString);`,
        steps: [
          '1. Replace eval() with JSON.parse() for JSON data',
          '2. For dynamic code, use Function constructor',
          '3. Validate all inputs before parsing',
          '4. Consider schema validation with Zod/Joi'
        ]
      }
    };
    
    return templates[finding.rule_id] || {
      explanation: `Review and fix ${finding.description.toLowerCase()}`,
      before: finding.evidence || '// problematic code',
      after: '// fixed code',
      steps: [
        '1. Review the identified code',
        '2. Apply security best practices',
        '3. Test the changes',
        '4. Deploy and monitor'
      ]
    };
  }
  
  /**
   * Analyze trends from history
   */
  analyzeTrends(report) {
    // In production: compare with previous analyses
    return {
      direction: 'stable',
      change: 0,
      prediction: 'Risk level expected to remain stable without intervention',
      recommendation: 'Schedule quarterly security reviews'
    };
  }
  
  /**
   * Generate strategic recommendations
   */
  generateRecommendations(report) {
    const recs = [];
    const risk = report.analysis.risk_score;
    
    if (risk >= 70) {
      recs.push({
        title: 'Emergency Security Sprint',
        description: 'Dedicate next sprint to addressing critical findings',
        timeline: '1-2 weeks',
        impact: 'Reduces risk by 60-80%'
      });
    }
    
    if (risk >= 50) {
      recs.push({
        title: 'Implement Code Review Automation',
        description: 'Add automated security scanning to CI/CD pipeline',
        timeline: '1 week',
        impact: 'Prevents 80% of issues from reaching production'
      });
    }
    
    recs.push({
      title: 'Knowledge Sharing Sessions',
      description: 'Regular team sessions to distribute codebase knowledge',
      timeline: 'Ongoing',
      impact: 'Improves bus factor by 2-3 points'
    });
    
    recs.push({
      title: 'Dependency Update Schedule',
      description: 'Monthly review and update of dependencies',
      timeline: 'Monthly',
      impact: 'Reduces vulnerability exposure'
    });
    
    return recs;
  }
  
  /**
   * Store insights in database
   */
  async storeInsights(repoId, insights) {
    try {
      await supabase
        .from('ai_insights')
        .upsert({
          repo_id: repoId,
          insights: insights,
          generated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to store insights:', error.message);
    }
  }
}

module.exports = AIInsights;
