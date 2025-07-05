// =============================================================================
// EXTENSIBLE TRANSFORM SYSTEM
// =============================================================================
// Simple regex-based preprocessing and postprocessing system
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// TRANSFORM RULE TYPES
// =============================================================================

export interface TransformRule {
  name: string;
  description: string;
  pattern: string;
  replacement: string;
  flags?: string;
  enabled?: boolean;
}

export interface TransformConfig {
  preprocess: TransformRule[];
  postprocess: TransformRule[];
}

// =============================================================================
// DEFAULT TRANSFORM RULES
// =============================================================================

export const DEFAULT_PREPROCESS_RULES: TransformRule[] = [
  {
    name: "deprecated-pm-syntax",
    description: "Fix deprecated Postman responseHeaders syntax",
    pattern: "pm\\.responseHeaders\\[(.*?)\\]",
    replacement: "pm.response.headers.get($1)",
    flags: "g",
    enabled: true
  },
  {
    name: "old-postman-vars",
    description: "Convert old postman.getEnvironmentVariable calls",
    pattern: "postman\\.getEnvironmentVariable\\((.*?)\\)",
    replacement: "pm.environment.get($1)",
    flags: "g",
    enabled: true
  },
  // ADD THIS MISSING RULE:
  {
    name: "old-postman-global-vars",
    description: "Convert old postman.getGlobalVariable calls",
    pattern: "postman\\.getGlobalVariable\\((.*?)\\)",
    replacement: "pm.globals.get($1)",
    flags: "g",
    enabled: true
  },
  {
    name: "legacy-test-syntax",
    description: "Convert legacy test syntax",
    pattern: "tests\\[(.*?)\\]\\s*=\\s*(.*?);",
    replacement: "pm.test($1, function() { pm.expect($2).to.be.true; });",
    flags: "g",
    enabled: true
  }
];

// =============================================================================
// UPDATED DEFAULT POSTPROCESS RULES - ADD HEADER FIX
// =============================================================================
export const DEFAULT_POSTPROCESS_RULES: TransformRule[] = [
  {
    name: "fix-header-value-access",
    description: "Fix header value access for Insomnia API",
    pattern: "insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.(?!value\\b)(\\w+)",
    replacement: "insomnia.response.headers.get($1).value.$2",
    flags: "g",
    enabled: true
  },
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
    name: "fix-request-headers-add",
    description: "Convert insomnia.request.headers.add() to insomnia.request.addHeader()",
    pattern: "insomnia\\.request\\.headers\\.add\\(\\s*\\{([\\s\\S]*?)\\}\\s*\\);?",  // FIXED
    replacement: "insomnia.request.addHeader({$1});",
    flags: "g",
    enabled: true
  },
  {
    name: "fix-response-json-access",
    description: "Fix response JSON access if needed",
    pattern: "insomnia\\.response\\.json\\(\\)\\.(?!data\\b)(\\w+)",
    replacement: "insomnia.response.json().$1",
    flags: "g",
    enabled: false // Disabled by default, enable if needed
  }
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
  preprocess(postmanJson: string): string {
    if (!this.config.preprocess?.length) {
      return postmanJson;
    }

    let transformed = postmanJson;

    for (const rule of this.config.preprocess) {
      if (!rule.enabled) continue;

      try {
        const regex = new RegExp(rule.pattern, rule.flags || 'g');
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
  postprocess(scriptContent: string): string {
    if (!this.config.postprocess?.length) {
      return scriptContent;
    }

    let transformed = scriptContent;

    for (const rule of this.config.postprocess) {
      if (!rule.enabled) continue;

      try {
        const regex = new RegExp(rule.pattern, rule.flags || 'g');
        transformed = transformed.replace(regex, rule.replacement);
      } catch (error) {
        console.warn(`Failed to apply postprocess rule "${rule.name}":`, error);
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

// =============================================================================
// CLI INTEGRATION TYPES
// =============================================================================

export interface ConversionOptionsWithTransforms {
  outputDir: string;
  format: 'yaml' | 'json';
  merge: boolean;
  verbose: boolean;
  preprocess?: boolean;
  postprocess?: boolean;
  configFile?: string;
}

// =============================================================================
// SAMPLE CONFIG FILE GENERATION
// =============================================================================

export function generateSampleConfig(outputPath: string): void {
  const sampleConfig: TransformConfig = {
    preprocess: DEFAULT_PREPROCESS_RULES,
    postprocess: DEFAULT_POSTPROCESS_RULES
  };

  const configWithComments = `{
  "preprocess": [
    {
      "name": "deprecated-pm-syntax",
      "description": "Fix deprecated Postman syntax patterns",
      "pattern": "pm\\\\.responseHeaders\\\\[(.*?)\\\\]",
      "replacement": "pm.response.headers.get($1)",
      "flags": "g",
      "enabled": true
    }
  ],
  "postprocess": [
    {
      "name": "fix-header-value-access",
      "description": "Fix header value access for Insomnia API",
      "pattern": "insomnia\\\\.response\\\\.headers\\\\.get\\\\(([^)]+)\\\\)\\\\.(?!value\\\\b)(\\\\w+)",
      "replacement": "insomnia.response.headers.get($1).value.$2",
      "flags": "g",
      "enabled": true
    }
  ]
}`;

  fs.writeFileSync(outputPath, configWithComments, 'utf8');
  console.log(`Sample config generated at: ${outputPath}`);
  console.log('Edit this file to customize transformation rules.');
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
