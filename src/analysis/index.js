const { supabase } = require('../db');
const EntityExtractor = require('./entity-extractor');
const SecurityScanner = require('./security-scanner');

class CodeAnalyzer {
  constructor() {
    this.extractor = new EntityExtractor();
    this.security = new SecurityScanner();
  }

  async analyzeRepo(repoId) {
    console.log(`[@systems] Starting analysis for repo ${repoId}`);
    const startTime = Date.now();

    try {
      // Get all files for this repo
      const { data: files, error } = await supabase
        .from('code_files')
        .select('*')
        .eq('repo_id', repoId);

      if (error) throw error;
      if (!files || files.length === 0) {
        console.log(`[@systems] No files found for repo ${repoId}`);
        return { success: false, error: 'No files' };
      }

      console.log(`[@systems] Analyzing ${files.length} files`);

      let totalEntities = 0;
      let totalFindings = 0;
      const allFindings = [];

      // Analyze each file
      for (const file of files) {
        // Skip non-code files
        if (!file.language || file.language === 'unknown') continue;

        // Extract entities (functions, classes)
        if (['javascript', 'typescript', 'python'].includes(file.language)) {
          try {
            const entities = await this.extractor.extractFromFile(
              file.id, 
              file.content || '', 
              file.language
            );
            
            if (entities.length > 0) {
              await this.extractor.saveEntities(repoId, entities);
              totalEntities += entities.length;
            }
          } catch (err) {
            console.error(`[@systems] Entity extraction failed for ${file.file_path}:`, err.message);
          }
        }

        // Security scan
        try {
          const findings = await this.security.scanFile(
            repoId,
            file.id,
            file.file_path,
            file.content || ''
          );
          
          if (findings.length > 0) {
            await this.security.saveFindings(findings);
            totalFindings += findings.length;
            allFindings.push(...findings);
          }
        } catch (err) {
          console.error(`[@systems] Security scan failed for ${file.file_path}:`, err.message);
        }
      }

      // Generate report
      const report = this.security.generateReport(allFindings);
      
      // Calculate risk score (0-100)
      const riskScore = this.calculateRiskScore(report.summary);
      
      // Update repo with results
      await supabase
        .from('repositories')
        .update({
          analysis_status: 'completed',
          risk_score: riskScore,
          last_analyzed_at: new Date().toISOString()
        })
        .eq('id', repoId);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[@systems] Analysis complete: ${totalEntities} entities, ${totalFindings} findings in ${duration}s`);

      return {
        success: true,
        entities: totalEntities,
        findings: totalFindings,
        riskScore,
        report,
        duration
      };

    } catch (error) {
      console.error(`[@systems] Analysis failed:`, error.message);
      
      await supabase
        .from('repositories')
        .update({
          analysis_status: 'failed',
          last_error: error.message
        })
        .eq('id', repoId);

      return { success: false, error: error.message };
    }
  }

  calculateRiskScore(summary) {
    // Simple scoring: critical=40, high=20, medium=5, low=1
    let score = summary.critical * 40 + summary.high * 20 + summary.medium * 5 + summary.low;
    // Cap at 100
    return Math.min(100, score);
  }
}

module.exports = CodeAnalyzer;
