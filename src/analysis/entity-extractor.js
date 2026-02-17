const { supabase } = require('../db');
const ASTParser = require('./ast-parser');

class EntityExtractor {
  constructor() {
    this.parser = new ASTParser();
  }

  async extractFromFile(fileId, content, language) {
    const tree = this.parser.parse(content, language);
    if (!tree) return [];

    const functions = this.parser.extractFunctions(tree, content);
    const imports = this.parser.extractImports(tree, content);

    const entities = [];

    for (const func of functions) {
      entities.push({
        file_id: fileId,
        type: func.type,
        name: func.name,
        signature: func.signature,
        start_line: func.start_line,
        end_line: func.end_line,
        complexity_score: func.complexity || 1
        // dependencies: imports  // TODO: Resolve to UUIDs later
      });
    }

    return entities;
  }

  async saveEntities(repoId, entities) {
    if (entities.length === 0) return;

    // Add repo_id to each entity
    const entitiesWithRepo = entities.map(e => ({ ...e, repo_id: repoId }));

    const { error } = await supabase
      .from('code_entities')
      .insert(entitiesWithRepo);

    if (error) {
      console.error('[@systems] Failed to save entities:', error.message);
      throw error;
    }

    console.log(`[@systems] Saved ${entities.length} entities`);
  }
}

module.exports = EntityExtractor;
