// =============================================================================
// EXTENSIBLE TRANSFORM SYSTEM
// =============================================================================
// Simple regex-based preprocessing and postprocessing system
// =============================================================================

import * as fs from 'fs';

// =============================================================================
// TRANSFORM RULE TYPES
// =============================================================================

export interface TransformRule {
  name: string;
  description: string;
  pattern: string | RegExp;
  replacement: string;
  flags?: string; // Only used if pattern is a string
  enabled?: boolean;
}

export interface TransformConfig {
  preprocess: TransformRule[];
  postprocess: TransformRule[];
}

// =============================================================================
// EXPERIMENTAL TRANSFORM RULES
// =============================================================================
export const EXPERIMENTAL_PREPROCESS_RULES: TransformRule[] = [
  // Empty for now - add experimental preprocessing rules here when needed
];

export const EXPERIMENTAL_POSTPROCESS_RULES: TransformRule[] = [
  {
    name: "fix-bracket-notation-access",
    description: "Convert bracket notation to dot notation for any variable (e.g., json['key'] → json.key)",
    pattern: "([a-zA-Z_$][a-zA-Z0-9_$.]*)\\['([^']+)'\\]",
    replacement: "$1.$2",
    flags: "g",
    enabled: true
  },
  {
    name: "fix-double-bracket-access",
    description: "Convert double bracket notation to dot notation for any variable",
    pattern: "([a-zA-Z_$][a-zA-Z0-9_$.]*)\\[\"([^\"]+)\"\\]",
    replacement: "$1.$2",
    flags: "g",
    enabled: true
  }
];

// =============================================================================
// DEFAULT TRANSFORM RULES
// =============================================================================
export const DEFAULT_PREPROCESS_RULES: TransformRule[] = [
  {
    name: "deprecated-pm-syntax",
    description: "Fix deprecated Postman responseHeaders syntax",
    pattern: "\\bpm\\.responseHeaders\\[(.*?)\\]",
    replacement: "pm.response.headers.get($1)",
    flags: "g",
    enabled: true
  },
  {
    name: "old-postman-vars",
    description: "Convert old postman.getEnvironmentVariable calls",
    pattern: "\\bpostman\\.getEnvironmentVariable\\((.*?)\\)",
    replacement: "pm.environment.get($1)",
    flags: "g",
    enabled: true
  },
  {
    name: "old-postman-global-vars",
    description: "Convert old postman.getGlobalVariable calls",
    pattern: "\\bpostman\\.getGlobalVariable\\((.*?)\\)",
    replacement: "pm.globals.get($1)",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-test-syntax",
    description: "Convert legacy test syntax",
    pattern: "\\btests\\[(.*?)\\]\\s*=\\s*(.*?);",
    replacement: "pm.test($1, function() { pm.expect($2).to.be.true; });",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-environment-set",
    description: "Convert postman.setEnvironmentVariable to pm.environment.set",
    pattern: "\\bpostman\\.setEnvironmentVariable\\s*\\(\\s*(.+?)\\s*,\\s*(.+?)\\s*\\)",
    replacement: "pm.environment.set($1, $2)",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-global-set",
    description: "Convert postman.setGlobalVariable to pm.globals.set",
    pattern: "\\bpostman\\.setGlobalVariable\\s*\\(\\s*(.+?)\\s*,\\s*(.+?)\\s*\\)",
    replacement: "pm.globals.set($1, $2)",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-clear-env",
    description: "Convert postman.clearEnvironmentVariable to pm.environment.unset",
    pattern: "\\bpostman\\.clearEnvironmentVariable\\s*\\(\\s*(.+?)\\s*\\)",
    replacement: "pm.environment.unset($1)",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-clear-global",
    description: "Convert postman.clearGlobalVariable to pm.globals.unset",
    pattern: "\\bpostman\\.clearGlobalVariable\\s*\\(\\s*(.+?)\\s*\\)",
    replacement: "pm.globals.unset($1)",
    flags: "g",
    enabled: true
  },
  {
    name: "responseCode-to-response",
    description: "Convert responseCode.code to pm.response.code",
    pattern: "\\bresponseCode\\.code",
    replacement: "pm.response.code",
    flags: "g",
    enabled: true
  },
  {
    name: "responseBody-to-response",
    description: "Convert responseBody to pm.response.text()",
    pattern: /(?<![$.])\bresponseBody\b(?!\$)/g,
    replacement: "pm.response.text()",
    enabled: true
  },
  {
    name: "legacy-postman-test",
    description: "Convert postman.test() to pm.test()",
    pattern: "\\bpostman\\.test\\s*\\(",
    replacement: "pm.test(",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-postman-expect",
    description: "Convert postman.expect() to pm.expect()",
    pattern: "\\bpostman\\.expect\\s*\\(",
    replacement: "pm.expect(",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-postman-environment-set",
    description: "Convert postman.environment.set() to pm.environment.set()",
    pattern: "\\bpostman\\.environment\\.set\\s*\\(",
    replacement: "pm.environment.set(",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-postman-environment-get",
    description: "Convert postman.environment.get() to pm.environment.get()",
    pattern: "\\bpostman\\.environment\\.get\\s*\\(",
    replacement: "pm.environment.get(",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-postman-globals-set",
    description: "Convert postman.globals.set() to pm.globals.set()",
    pattern: "\\bpostman\\.globals\\.set\\s*\\(",
    replacement: "pm.globals.set(",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-postman-globals-get",
    description: "Convert postman.globals.get() to pm.globals.get()",
    pattern: "\\bpostman\\.globals\\.get\\s*\\(",
    replacement: "pm.globals.get(",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-set-next-request",
    description: "Convert postman.setNextRequest to pm.execution.setNextRequest",
    pattern: "\\bpostman\\.setNextRequest\\s*\\(\\s*(.+?)\\s*\\)",
    replacement: "pm.execution.setNextRequest($1)",
    flags: "g",
    enabled: true
  }
];

// =============================================================================
// DEFAULT POSTPROCESS RULES - ADD HEADER FIX
// =============================================================================
export const DEFAULT_POSTPROCESS_RULES: TransformRule[] = [
  {
    name: "fix-header-conditional-access",
    description: "Fix header access in conditional statements",
    pattern: "insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*&&\\s*insomnia\\.response\\.headers\\.get\\(\\1\\)\\.(?!value\\b)(\\w+)",
    replacement: "insomnia.response.headers.get($1) && insomnia.response.headers.get($1).value.$2",
    flags: "g",
    enabled: true
  },
  {
    name: "fix-header-string-comparison",
    description: "Fix header string comparisons",
    pattern: "insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==|==|!=)\\s*",
    replacement: "insomnia.response.headers.get($1).value $2 ",
    flags: "g",
    enabled: true
  },
  {
    name: "fix-header-value-access",
    description: "Fix header value access for Insomnia API",
    pattern: "insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.(?!value\\b)(\\w+)",
    replacement: "insomnia.response.headers.get($1).value.$2",
    flags: "g",
    enabled: true
  },
  {
    name: "fix-request-headers-add",
    description: "Convert insomnia.request.headers.add() to insomnia.request.addHeader()",
    pattern: "insomnia\\.request\\.headers\\.add\\s*\\(\\s*\\{([\\s\\S]*?)\\}\\s*\\)\\s*;?",
    replacement: "insomnia.request.addHeader({$1});",
    flags: "g",
    enabled: true
  },
  {
    name: "fix-request-url-assignment",
    description: "Convert insomnia.request.url assignment to update() method",
    pattern: "insomnia\\.request\\.url\\s*=\\s*([^;]+);?",
    replacement: "insomnia.request.url.update($1);",
    flags: "g",
    enabled: true
  },
];

// =============================================================================
// TRANSFORM ENGINE
// =============================================================================

export class TransformEngine {
  private config: TransformConfig;

  constructor(config?: Partial<TransformConfig>) {
    this.config = {
      preprocess: config?.preprocess || [...DEFAULT_PREPROCESS_RULES],
      postprocess: config?.postprocess || [...DEFAULT_POSTPROCESS_RULES]
    };
  }

  /**
   * Load transform rules from a JSON config file
   */
  static fromConfigFile(configPath: string): TransformEngine {
    try {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return new TransformEngine(configData);
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}, using defaults:`, error);
      return new TransformEngine();
    }
  }

  /**
   * Apply preprocessing transformations to raw Postman JSON
   */
  preprocess(postmanJson: string, includeExperimental: boolean = false): string {
    if (!this.config.preprocess?.length) {
      return postmanJson;
    }

    let transformed = postmanJson;
    const rules = includeExperimental
      ? [...this.config.preprocess, ...EXPERIMENTAL_PREPROCESS_RULES]
      : this.config.preprocess;

      for (const rule of rules) {
        if (!rule.enabled) continue;

        try {
          const regex = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, rule.flags || 'g');
          transformed = transformed.replace(regex, rule.replacement);
        } catch (error) {
          console.warn(`Failed to apply preprocess rule "${rule.name}":`, error);
        }
      }

      return transformed;
  }

  /**
   * Apply postprocessing transformations to converted scripts
   */
  postprocess(scriptContent: string, includeExperimental: boolean = false): string {
    if (!this.config.postprocess?.length && !includeExperimental) {
      return scriptContent;
    }

    let transformed = scriptContent;

    // Combine standard rules with experimental rules if flag is set
    const rules = includeExperimental
      ? [...this.config.postprocess, ...EXPERIMENTAL_POSTPROCESS_RULES]
      : this.config.postprocess;

    // Apply rules with multiple passes for nested bracket notation
    let previousResult = '';
    let passCount = 0;
    const maxPasses = 10; // Prevent infinite loops

    while (transformed !== previousResult && passCount < maxPasses) {
      previousResult = transformed;
      passCount++;

      for (const rule of rules) {
        if (!rule.enabled) continue;

        try {
          const regex = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern, rule.flags || 'g');
          transformed = transformed.replace(regex, rule.replacement);
        } catch (error) {
          console.warn(`Failed to apply postprocess rule "${rule.name}":`, error);
        }
      }
    }

    return transformed;
  }

  /**
   * Add a custom preprocessing rule
   */
  addPreprocessRule(rule: TransformRule): void {
    this.config.preprocess.push(rule);
  }

  /**
   * Add a custom postprocessing rule
   */
  addPostprocessRule(rule: TransformRule): void {
    this.config.postprocess.push(rule);
  }

  /**
   * Enable/disable a rule by name
   */
  toggleRule(ruleName: string, enabled: boolean): void {
    const preprocessRule = this.config.preprocess.find(r => r.name === ruleName);
    if (preprocessRule) {
      preprocessRule.enabled = enabled;
    }

    const postprocessRule = this.config.postprocess.find(r => r.name === ruleName);
    if (postprocessRule) {
      postprocessRule.enabled = enabled;
    }
  }

  /**
   * Export current config to JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Save current config to file
   */
  saveConfig(filePath: string): void {
    fs.writeFileSync(filePath, this.exportConfig(), 'utf8');
  }
}

// =============================================================================
// INTEGRATION WITH EXISTING CONVERTER
// =============================================================================

/**
 * Enhanced script transformation that uses the transform engine
 */
export function translateHandlersInScriptWithTransforms(
  scriptContent: string,
  transformEngine?: TransformEngine
): string {
  // Step 1: Basic pm. to insomnia. replacement (existing logic)
  let translated = scriptContent;
  let offset = 0;

  for (let i = 0; i < scriptContent.length - 2; i++) {
    const isPM = scriptContent.slice(i, i + 3) === 'pm.';
    const isPrevCharacterAlphaNumeric = i - 1 >= 0 && /[0-9a-zA-Z_$]/.test(scriptContent[i - 1]);

    if (isPM && !isPrevCharacterAlphaNumeric) {
      translated = translated.slice(0, i + offset) + 'insomnia.' + translated.slice(i + 3 + offset);
      offset += 6;
    }
  }

  // Step 2: Apply postprocessing transforms if provided
  if (transformEngine) {
    translated = transformEngine.postprocess(translated);
  }

  return translated;
}

/**
 * Configuration with comments structure
 */
interface ConfigWithComments {
  _comment: string;
  _description: string;
  _documentation: Record<string, string>;
  preprocess: TransformRule[];
  postprocess: TransformRule[];
  _experimental_notice?: string;
}

// =============================================================================
// SAMPLE CONFIG FILE GENERATION
// =============================================================================
export function generateSampleConfig(outputPath: string, includeExperimental: boolean = false): void {
  const sampleConfig = {
    preprocess: DEFAULT_PREPROCESS_RULES,
    postprocess: DEFAULT_POSTPROCESS_RULES
  };

  const configWithComments: ConfigWithComments = {
    "_comment": "Transform Configuration - Generated from Default Rules",
    "_description": "Customize preprocessing and postprocessing rules for Postman to Insomnia conversion",
    "_documentation": {
      "preprocess": "Rules applied before pm.* to insomnia.* conversion",
      "postprocess": "Rules applied after pm.* to insomnia.* conversion",
      "pattern": "Regular expression pattern to match (use double backslashes for escaping)",
      "replacement": "Replacement string (use $1, $2, etc. for capture groups)",
      "flags": "Regex flags: 'g' for global, 'i' for case-insensitive, 'm' for multiline",
      "enabled": "Set to false to disable a rule without deleting it"
    },

    preprocess: sampleConfig.preprocess.map(rule => ({
      name: rule.name,
      description: rule.description,
      pattern: rule.pattern,
      replacement: rule.replacement,
      flags: rule.flags || "g",
      enabled: rule.enabled !== false
    })),

    postprocess: [
      // Standard rules
      ...sampleConfig.postprocess.map(rule => ({
        name: rule.name,
        description: rule.description,
        pattern: rule.pattern,
        replacement: rule.replacement,
        flags: rule.flags || "g",
        enabled: rule.enabled !== false
      })),

      // Add experimental rules if requested
      ...(includeExperimental ? EXPERIMENTAL_POSTPROCESS_RULES.map(rule => ({
        name: rule.name,
        description: rule.description + " (EXPERIMENTAL)",
        pattern: rule.pattern,
        replacement: rule.replacement,
        flags: rule.flags || "g",
        enabled: rule.enabled !== false
      })) : [])
    ]
  };

  if (includeExperimental) {
    configWithComments._experimental_notice = "Experimental rules included - not confirmed by Insomnia team";
  }

  const jsonString = JSON.stringify(configWithComments, null, 2);
  fs.writeFileSync(outputPath, jsonString, 'utf8');

  console.log(`✅ Sample config generated at: ${outputPath}`);
  console.log(`📝 Config contains ${sampleConfig.preprocess.length} preprocessing rules`);
  console.log(`📝 Config contains ${sampleConfig.postprocess.length + (includeExperimental ? EXPERIMENTAL_POSTPROCESS_RULES.length : 0)} postprocessing rules`);
  if (includeExperimental) {
    console.log(`🧪 Included ${EXPERIMENTAL_POSTPROCESS_RULES.length} experimental rules`);
  }
}
// =============================================================================
// USAGE EXAMPLES
// =============================================================================

/*
// Basic usage with defaults
const engine = new TransformEngine();

// Load custom config
const engine = TransformEngine.fromConfigFile('./transform-config.json');

// Add custom rules
engine.addPostprocessRule({
  name: "my-custom-fix",
  description: "Fix my specific case",
  pattern: "oldPattern",
  replacement: "newPattern",
  flags: "g",
  enabled: true
});

// Apply transforms
const preprocessedJson = engine.preprocess(rawPostmanJson);
const postprocessedScript = engine.postprocess(convertedScript);

// Generate sample config
generateSampleConfig('./transform-config.json');
*/
