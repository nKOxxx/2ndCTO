const { execSync } = require('child_process');
const path = require('path');

/**
 * Git History Parser
 * Analyzes git log to calculate bus factor and knowledge distribution
 */
class GitParser {
  /**
   * Parse git history for a repository
   * @param {string} repoPath - Path to cloned repository
   * @returns {Object} Analysis results
   */
  analyzeRepo(repoPath) {
    try {
      // Get all commits with files and authors
      const logData = this.getGitLog(repoPath);
      const commits = this.parseLog(logData);
      
      // Calculate file ownership
      const fileOwnership = this.calculateFileOwnership(commits);
      
      // Calculate author stats
      const authorStats = this.calculateAuthorStats(commits);
      
      // Calculate bus factor
      const busFactor = this.calculateBusFactor(fileOwnership, authorStats);
      
      // Find knowledge silos
      const knowledgeSilos = this.findKnowledgeSilos(fileOwnership, authorStats);
      
      // Find critical files
      const criticalFiles = this.findCriticalFiles(fileOwnership, repoPath);
      
      return {
        bus_factor: busFactor.score,
        risk_level: busFactor.riskLevel,
        total_commits: commits.length,
        unique_authors: Object.keys(authorStats).length,
        file_ownership: fileOwnership,
        author_stats: authorStats,
        critical_files: criticalFiles,
        knowledge_silos: knowledgeSilos
      };
    } catch (error) {
      console.error('[@systems] Git analysis failed:', error.message);
      return {
        bus_factor: 0,
        risk_level: 'UNKNOWN',
        error: error.message
      };
    }
  }

  /**
   * Get git log data
   */
  getGitLog(repoPath) {
    const cmd = `git -C "${repoPath}" log --all --format="COMMIT|%H|%an|%ae|%at" --name-only`;
    return execSync(cmd, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
  }

  /**
   * Parse git log into structured commits
   */
  parseLog(logData) {
    const commits = [];
    let currentCommit = null;
    
    const lines = logData.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('COMMIT|')) {
        // Save previous commit
        if (currentCommit) {
          commits.push(currentCommit);
        }
        
        // Parse commit header: COMMIT|hash|author|email|timestamp
        const parts = line.split('|');
        currentCommit = {
          hash: parts[1],
          author: parts[2],
          email: parts[3],
          timestamp: parseInt(parts[4]) * 1000, // Convert to ms
          files: []
        };
      } else if (line.trim() && currentCommit) {
        // This is a file path
        currentCommit.files.push(line.trim());
      }
    }
    
    // Don't forget the last commit
    if (currentCommit) {
      commits.push(currentCommit);
    }
    
    return commits;
  }

  /**
   * Calculate who owns each file (most commits)
   */
  calculateFileOwnership(commits) {
    const fileAuthors = {}; // file -> {author -> commitCount}
    
    for (const commit of commits) {
      for (const file of commit.files) {
        // Skip non-code files
        if (!this.isCodeFile(file)) continue;
        
        if (!fileAuthors[file]) {
          fileAuthors[file] = {};
        }
        
        if (!fileAuthors[file][commit.author]) {
          fileAuthors[file][commit.author] = 0;
        }
        
        fileAuthors[file][commit.author]++;
      }
    }
    
    // Calculate ownership percentages
    const ownership = {};
    for (const [file, authors] of Object.entries(fileAuthors)) {
      const totalCommits = Object.values(authors).reduce((a, b) => a + b, 0);
      const sortedAuthors = Object.entries(authors)
        .sort((a, b) => b[1] - a[1])
        .map(([author, count]) => ({
          author,
          commits: count,
          percentage: Math.round((count / totalCommits) * 100)
        }));
      
      ownership[file] = {
        primary_author: sortedAuthors[0].author,
        primary_percentage: sortedAuthors[0].percentage,
        total_commits: totalCommits,
        authors: sortedAuthors
      };
    }
    
    return ownership;
  }

  /**
   * Calculate overall author statistics
   */
  calculateAuthorStats(commits) {
    const stats = {};
    
    for (const commit of commits) {
      if (!stats[commit.author]) {
        stats[commit.author] = {
          commits: 0,
          files_touched: new Set(),
          first_commit: commit.timestamp,
          last_commit: commit.timestamp
        };
      }
      
      const author = stats[commit.author];
      author.commits++;
      commit.files.forEach(f => author.files_touched.add(f));
      author.first_commit = Math.min(author.first_commit, commit.timestamp);
      author.last_commit = Math.max(author.last_commit, commit.timestamp);
    }
    
    // Convert sets to counts
    for (const author of Object.values(stats)) {
      author.files_touched = author.files_touched.size;
    }
    
    return stats;
  }

  /**
   * Calculate bus factor
   * How many people can leave before 50% of codebase knowledge is lost
   */
  calculateBusFactor(fileOwnership, authorStats) {
    const files = Object.values(fileOwnership);
    const totalFiles = files.length;
    
    if (totalFiles === 0) {
      return { score: 0, riskLevel: 'UNKNOWN' };
    }
    
    // Count files owned by single author
    const singleOwnerFiles = files.filter(f => f.primary_percentage >= 80);
    const singleOwnerPercentage = (singleOwnerFiles.length / totalFiles) * 100;
    
    // Get unique authors sorted by file ownership
    const authorFileCount = {};
    for (const file of files) {
      const author = file.primary_author;
      authorFileCount[author] = (authorFileCount[author] || 0) + 1;
    }
    
    const sortedAuthors = Object.entries(authorFileCount)
      .sort((a, b) => b[1] - a[1]);
    
    // Calculate how many authors needed to cover 50% of files
    let filesCovered = 0;
    let busFactor = 0;
    for (const [author, count] of sortedAuthors) {
      filesCovered += count;
      busFactor++;
      if (filesCovered >= totalFiles * 0.5) break;
    }
    
    // Add fractional part based on remaining coverage
    const coverage = filesCovered / totalFiles;
    if (coverage < 0.6) {
      busFactor += (0.5 - (coverage - 0.5)) * 2; // Partial credit
    }
    
    // Determine risk level
    let riskLevel;
    if (busFactor <= 1.5) riskLevel = 'CRITICAL';
    else if (busFactor <= 2.5) riskLevel = 'HIGH';
    else if (busFactor <= 4) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';
    
    return {
      score: Math.round(busFactor * 10) / 10,
      riskLevel,
      single_owner_percentage: Math.round(singleOwnerPercentage),
      total_authors: Object.keys(authorStats).length
    };
  }

  /**
   * Find knowledge silos (areas owned by single person)
   */
  findKnowledgeSilos(fileOwnership, authorStats) {
    const authorAreas = {};
    
    // Group files by directory and primary author
    for (const [file, data] of Object.entries(fileOwnership)) {
      if (data.primary_percentage < 80) continue; // Skip shared files
      
      const dir = path.dirname(file).split('/')[0] || 'root';
      const author = data.primary_author;
      
      if (!authorAreas[author]) {
        authorAreas[author] = {};
      }
      
      if (!authorAreas[author][dir]) {
        authorAreas[author][dir] = { files: 0, commits: 0 };
      }
      
      authorAreas[author][dir].files++;
      authorAreas[author][dir].commits += data.total_commits;
    }
    
    // Find significant silos (>5 files)
    const silos = [];
    for (const [author, areas] of Object.entries(authorAreas)) {
      for (const [area, data] of Object.entries(areas)) {
        if (data.files >= 5) {
          silos.push({
            owner: author,
            area,
            files: data.files,
            risk: data.files > 10 ? 'HIGH' : 'MEDIUM'
          });
        }
      }
    }
    
    return silos.sort((a, b) => b.files - a.files);
  }

  /**
   * Find critical files (high impact, single owner)
   */
  findCriticalFiles(fileOwnership, repoPath) {
    const critical = [];
    
    for (const [file, data] of Object.entries(fileOwnership)) {
      // Skip files with multiple active contributors
      if (data.authors.length > 1 && data.authors[1].percentage > 20) {
        continue;
      }
      
      // Score based on commit activity and ownership concentration
      const score = data.total_commits * (data.primary_percentage / 100);
      
      if (score >= 10 && data.primary_percentage >= 80) {
        critical.push({
          file,
          owner: data.primary_author,
          commits: data.total_commits,
          ownership_percentage: data.primary_percentage,
          risk: score > 30 ? 'CRITICAL' : score > 15 ? 'HIGH' : 'MEDIUM'
        });
      }
    }
    
    return critical
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 20); // Top 20
  }

  /**
   * Check if file is a code file we care about
   */
  isCodeFile(file) {
    const codeExtensions = [
      '.js', '.ts', '.jsx', '.tsx',
      '.py', '.rb', '.go', '.rs',
      '.java', '.kt', '.scala',
      '.c', '.cpp', '.h', '.hpp',
      '.php', '.swift', '.m', '.mm'
    ];
    
    const ext = path.extname(file).toLowerCase();
    return codeExtensions.includes(ext);
  }
}

module.exports = GitParser;
