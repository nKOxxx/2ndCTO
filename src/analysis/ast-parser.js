const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const TypeScript = require('tree-sitter-typescript');
const Python = require('tree-sitter-python');

// Language map
const languages = {
  javascript: JavaScript,
  typescript: TypeScript.typescript,
  tsx: TypeScript.tsx,
  python: Python
};

class ASTParser {
  constructor() {
    this.parsers = {};
  }

  getParser(language) {
    if (!this.parsers[language]) {
      const lang = languages[language];
      if (!lang) return null;
      
      this.parsers[language] = new Parser();
      this.parsers[language].setLanguage(lang);
    }
    return this.parsers[language];
  }

  parse(code, language) {
    const parser = this.getParser(language);
    if (!parser) return null;

    try {
      return parser.parse(code);
    } catch (error) {
      console.error(`[@systems] Parse error:`, error.message);
      return null;
    }
  }

  // Extract functions
  extractFunctions(tree, code) {
    const functions = [];
    const root = tree.rootNode;

    const traverse = (node) => {
      // Function declarations
      if (node.type === 'function_declaration' || 
          node.type === 'function' ||
          node.type === 'arrow_function' ||
          node.type === 'method_definition') {
        
        const name = this.getFunctionName(node, code);
        const signature = this.getSignature(node, code);
        
        functions.push({
          type: 'function',
          name,
          signature,
          start_line: node.startPosition.row + 1,
          end_line: node.endPosition.row + 1,
          complexity: this.calculateComplexity(node)
        });
      }

      // Class declarations
      if (node.type === 'class_declaration' || node.type === 'class') {
        const name = this.getClassName(node, code);
        
        functions.push({
          type: 'class',
          name,
          start_line: node.startPosition.row + 1,
          end_line: node.endPosition.row + 1
        });
      }

      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(root);
    return functions;
  }

  getFunctionName(node, code) {
    // Try to find identifier
    const identifier = node.children.find(n => n.type === 'identifier');
    if (identifier) {
      return code.slice(identifier.startIndex, identifier.endIndex);
    }
    return 'anonymous';
  }

  getClassName(node, code) {
    const identifier = node.children.find(n => n.type === 'type_identifier' || n.type === 'identifier');
    if (identifier) {
      return code.slice(identifier.startIndex, identifier.endIndex);
    }
    return 'AnonymousClass';
  }

  getSignature(node, code) {
    // Get function signature (first line)
    const lines = code.slice(node.startIndex, node.endIndex).split('\n');
    return lines[0].trim();
  }

  calculateComplexity(node) {
    let complexity = 1; // Base complexity
    
    const traverse = (n) => {
      if (['if_statement', 'conditional_expression'].includes(n.type)) complexity++;
      if (['for_statement', 'while_statement', 'do_statement'].includes(n.type)) complexity++;
      if (n.type === 'switch_statement') complexity++;
      if (n.type === 'catch_clause') complexity++;
      if (n.type === 'binary_expression' && n.children.some(c => ['||', '&&'].includes(c.type))) complexity++;
      
      for (const child of n.children) {
        traverse(child);
      }
    };

    traverse(node);
    return complexity;
  }

  // Extract imports/dependencies
  extractImports(tree, code) {
    const imports = [];
    const root = tree.rootNode;

    const traverse = (node) => {
      if (node.type === 'import_statement' || node.type === 'import_declaration') {
        const source = node.children.find(n => n.type === 'string' || n.type === 'string_fragment');
        if (source) {
          const importPath = code.slice(source.startIndex, source.endIndex).replace(/['"]/g, '');
          imports.push(importPath);
        }
      }

      if (node.type === 'call_expression') {
        const func = node.children[0];
        if (func && (func.type === 'identifier' || func.type === 'property_identifier')) {
          const name = code.slice(func.startIndex, func.endIndex);
          if (name === 'require') {
            const args = node.children.find(n => n.type === 'arguments');
            if (args && args.children[1]) {
              const arg = args.children[1];
              if (arg.type === 'string' || arg.type === 'string_fragment') {
                imports.push(code.slice(arg.startIndex, arg.endIndex).replace(/['"]/g, ''));
              }
            }
          }
        }
      }

      for (const child of node.children) {
        traverse(child);
      }
    };

    traverse(root);
    return imports;
  }
}

module.exports = ASTParser;
