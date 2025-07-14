// =============================================================================
// TRANSFORM ENGINE TESTS
// =============================================================================
// Comprehensive tests for the extensible transform system
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  TransformEngine,
  TransformRule,
  TransformConfig,
  DEFAULT_PREPROCESS_RULES,
  DEFAULT_POSTPROCESS_RULES,
  generateSampleConfig,
  translateHandlersInScriptWithTransforms
} from '../../src/transform-engine';

describe('TransformEngine', () => {
  let tempDir: string;
  let testFiles: string[];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transform-test-'));
    testFiles = [];
  });

  afterEach(() => {
    // Clean up temp files
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createTestConfigFile = (config: Partial<TransformConfig>): string => {
    const filePath = path.join(tempDir, 'test-config.json');
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    testFiles.push(filePath);
    return filePath;
  };

  // ==========================================================================
  // CONSTRUCTOR AND INITIALIZATION TESTS
  // ==========================================================================

  describe('Constructor and Initialization', () => {
    test('should create engine with default config when no config provided', () => {
      const engine = new TransformEngine();

      expect(engine).toBeInstanceOf(TransformEngine);
      // Should have default rules
      const config = JSON.parse(engine.exportConfig());
      expect(config.preprocess).toHaveLength(DEFAULT_PREPROCESS_RULES.length);
      expect(config.postprocess).toHaveLength(DEFAULT_POSTPROCESS_RULES.length);
    });

    test('should create engine with partial config', () => {
      const customPreprocess: TransformRule[] = [
        {
          name: 'custom-rule',
          description: 'Custom test rule',
          pattern: 'test',
          replacement: 'replaced',
          enabled: true
        }
      ];

      const engine = new TransformEngine({
        preprocess: customPreprocess
      });

      const config = JSON.parse(engine.exportConfig());
      expect(config.preprocess).toHaveLength(1);
      expect(config.preprocess[0].name).toBe('custom-rule');
      expect(config.postprocess).toHaveLength(DEFAULT_POSTPROCESS_RULES.length);
    });

    test('should create engine with complete custom config', () => {
      const customConfig: TransformConfig = {
        preprocess: [
          {
            name: 'custom-pre',
            description: 'Custom preprocess',
            pattern: 'pre',
            replacement: 'pre-replaced',
            enabled: true
          }
        ],
        postprocess: [
          {
            name: 'custom-post',
            description: 'Custom postprocess',
            pattern: 'post',
            replacement: 'post-replaced',
            enabled: true
          }
        ]
      };

      const engine = new TransformEngine(customConfig);

      const config = JSON.parse(engine.exportConfig());
      expect(config.preprocess).toHaveLength(1);
      expect(config.postprocess).toHaveLength(1);
      expect(config.preprocess[0].name).toBe('custom-pre');
      expect(config.postprocess[0].name).toBe('custom-post');
    });
  });

  // ==========================================================================
  // CONFIG FILE LOADING TESTS
  // ==========================================================================

  describe('Config File Loading', () => {
    test('should load config from valid JSON file', () => {
      const config: TransformConfig = {
        preprocess: [
          {
            name: 'file-rule',
            description: 'Rule from file',
            pattern: 'file-pattern',
            replacement: 'file-replacement',
            enabled: true
          }
        ],
        postprocess: []
      };

      const configFile = createTestConfigFile(config);
      const engine = TransformEngine.fromConfigFile(configFile);

      const loadedConfig = JSON.parse(engine.exportConfig());
      expect(loadedConfig.preprocess).toHaveLength(1);
      expect(loadedConfig.preprocess[0].name).toBe('file-rule');
      expect(loadedConfig.preprocess[0].pattern).toBe('file-pattern');
    });

    it('should fall back to defaults when config file does not exist', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transform-test-'));
      const nonExistentPath = path.join(tempDir, 'non-existent.json');

      try {
        const engine = TransformEngine.fromConfigFile(nonExistentPath);
        expect(engine).toBeInstanceOf(TransformEngine);

        // Check that console.warn was called with the right arguments
        expect(consoleSpy).toHaveBeenCalled();
        const [message, error] = consoleSpy.mock.calls[0];
        expect(message).toMatch(/Failed to load config from.*using defaults:/);
        expect(error).toBeTruthy();
        expect(error.message).toContain('ENOENT');

      } finally {
        consoleSpy.mockRestore();
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
    test('should fall back to defaults when config file has invalid JSON', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidFile = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(invalidFile, '{ invalid json }');
      testFiles.push(invalidFile);

      const engine = TransformEngine.fromConfigFile(invalidFile);

      const config = JSON.parse(engine.exportConfig());
      expect(config.preprocess).toHaveLength(DEFAULT_PREPROCESS_RULES.length);
      expect(config.postprocess).toHaveLength(DEFAULT_POSTPROCESS_RULES.length);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // PREPROCESSING TESTS
  // ==========================================================================

  describe('Preprocessing', () => {
    test('should apply enabled preprocessing rules', () => {
      const rules: TransformRule[] = [
        {
          name: 'test-rule',
          description: 'Test rule',
          pattern: 'oldSyntax',
          replacement: 'newSyntax',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ preprocess: rules });
      const input = 'This has oldSyntax and more oldSyntax here';
      const result = engine.preprocess(input);

      expect(result).toBe('This has newSyntax and more newSyntax here');
    });

    test('should skip disabled preprocessing rules', () => {
      const rules: TransformRule[] = [
        {
          name: 'disabled-rule',
          description: 'Disabled rule',
          pattern: 'shouldNotChange',
          replacement: 'changed',
          flags: 'g',
          enabled: false
        }
      ];

      const engine = new TransformEngine({ preprocess: rules });
      const input = 'This shouldNotChange remain the same';
      const result = engine.preprocess(input);

      expect(result).toBe('This shouldNotChange remain the same');
    });

    test('should apply multiple preprocessing rules in order', () => {
      const rules: TransformRule[] = [
        {
          name: 'rule-1',
          description: 'First rule',
          pattern: 'step1',
          replacement: 'step2',
          flags: 'g',
          enabled: true
        },
        {
          name: 'rule-2',
          description: 'Second rule',
          pattern: 'step2',
          replacement: 'step3',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ preprocess: rules });
      const input = 'start step1 end';
      const result = engine.preprocess(input);

      expect(result).toBe('start step3 end');
    });

    test('should handle complex regex patterns', () => {
      const rules: TransformRule[] = [
        {
          name: 'complex-regex',
          description: 'Complex pattern',
          pattern: 'pm\\.responseHeaders\\[(.*?)\\]',
          replacement: 'pm.response.headers.get($1)',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ preprocess: rules });
      const input = 'pm.responseHeaders["Content-Type"] and pm.responseHeaders["Accept"]';
      const result = engine.preprocess(input);

      expect(result).toBe('pm.response.headers.get("Content-Type") and pm.response.headers.get("Accept")');
    });

    test('should handle regexp patterns', () => {
      const rules: TransformRule[] = [
        {
          name: 'regexp patterns',
          description: 'Regexp pattern',
          pattern: /(?<![\$\.])\bresponseBody\b(?!\$)/g,
          replacement: "pm.response.text()",
          enabled: true
        }
      ];

      const engine = new TransformEngine({ preprocess: rules });
      let result = engine.preprocess('responseBody');
      expect(result).toBe('pm.response.text()');

      result = engine.preprocess('foo.responseBody');
      expect(result).toBe('foo.responseBody');

      result = engine.preprocess('responseBody$foo');
      expect(result).toBe('responseBody$foo');
    });

    test('should handle invalid regex patterns gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const rules: TransformRule[] = [
        {
          name: 'invalid-regex',
          description: 'Invalid pattern',
          pattern: '[invalid-regex(',
          replacement: 'replacement',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ preprocess: rules });
      const input = 'This should remain unchanged';
      const result = engine.preprocess(input);

      expect(result).toBe('This should remain unchanged');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to apply preprocess rule'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test('should return original input when no preprocess rules exist', () => {
      const engine = new TransformEngine({ preprocess: [] });
      const input = 'No changes expected';
      const result = engine.preprocess(input);

      expect(result).toBe('No changes expected');
    });
  });

  // ==========================================================================
  // POSTPROCESSING TESTS
  // ==========================================================================

  describe('Postprocessing', () => {
    test('should apply enabled postprocessing rules', () => {
      const rules: TransformRule[] = [
        {
          name: 'header-fix',
          description: 'Fix header access',
          pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
          replacement: 'insomnia.response.headers.get($1).value.includes(',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ postprocess: rules });
      const input = 'insomnia.response.headers.get("Content-Type").includes("json")';
      const result = engine.postprocess(input);

      expect(result).toBe('insomnia.response.headers.get("Content-Type").value.includes("json")');
    });

    test('should skip disabled postprocessing rules', () => {
      const rules: TransformRule[] = [
        {
          name: 'disabled-post-rule',
          description: 'Disabled postprocess rule',
          pattern: 'shouldNotChange',
          replacement: 'changed',
          flags: 'g',
          enabled: false
        }
      ];

      const engine = new TransformEngine({ postprocess: rules });
      const input = 'This shouldNotChange remain the same';
      const result = engine.postprocess(input);

      expect(result).toBe('This shouldNotChange remain the same');
    });

    test('should handle complex postprocessing patterns', () => {
      const rules: TransformRule[] = [
        {
          name: 'header-conditional',
          description: 'Fix header conditional access',
          pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*&&\\s*insomnia\\.response\\.headers\\.get\\(\\1\\)\\.(?!value\\b)(\\w+)',
          replacement: 'insomnia.response.headers.get($1) && insomnia.response.headers.get($1).value.$2',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ postprocess: rules });
      const input = 'insomnia.response.headers.get("Content-Type") && insomnia.response.headers.get("Content-Type").includes("json")';
      const result = engine.postprocess(input);

      expect(result).toBe('insomnia.response.headers.get("Content-Type") && insomnia.response.headers.get("Content-Type").value.includes("json")');
    });

    test('should return original input when no postprocess rules exist', () => {
      const engine = new TransformEngine({ postprocess: [] });
      const input = 'No changes expected';
      const result = engine.postprocess(input);

      expect(result).toBe('No changes expected');
    });
  });

  // ==========================================================================
  // DYNAMIC RULE MANAGEMENT TESTS
  // ==========================================================================

  describe('Dynamic Rule Management', () => {
    test('should add custom preprocessing rule', () => {
      const engine = new TransformEngine({ preprocess: [], postprocess: [] });

      const customRule: TransformRule = {
        name: 'added-rule',
        description: 'Dynamically added rule',
        pattern: 'dynamic',
        replacement: 'added',
        enabled: true
      };

      engine.addPreprocessRule(customRule);

      const input = 'This is dynamic content';
      const result = engine.preprocess(input);

      expect(result).toBe('This is added content');
    });

    test('should add custom postprocessing rule', () => {
      const engine = new TransformEngine({ preprocess: [], postprocess: [] });

      const customRule: TransformRule = {
        name: 'added-post-rule',
        description: 'Dynamically added post rule',
        pattern: 'postDynamic',
        replacement: 'postAdded',
        enabled: true
      };

      engine.addPostprocessRule(customRule);

      const input = 'This is postDynamic content';
      const result = engine.postprocess(input);

      expect(result).toBe('This is postAdded content');
    });

    test('should toggle rule enabled/disabled state', () => {
      const rules: TransformRule[] = [
        {
          name: 'toggleable-rule',
          description: 'Rule that can be toggled',
          pattern: 'toggle',
          replacement: 'toggled',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ preprocess: rules });

      // Initially enabled - should transform
      let input = 'This will toggle';
      let result = engine.preprocess(input);
      expect(result).toBe('This will toggled');

      // Disable the rule
      engine.toggleRule('toggleable-rule', false);
      result = engine.preprocess(input);
      expect(result).toBe('This will toggle'); // No change

      // Re-enable the rule
      engine.toggleRule('toggleable-rule', true);
      result = engine.preprocess(input);
      expect(result).toBe('This will toggled'); // Changed again
    });

    test('should handle toggling non-existent rules gracefully', () => {
      const engine = new TransformEngine();

      // Should not throw error
      expect(() => {
        engine.toggleRule('non-existent-rule', false);
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // CONFIG EXPORT/SAVE TESTS
  // ==========================================================================

  describe('Config Export and Save', () => {
    test('should export config as JSON string', () => {
      const customConfig: TransformConfig = {
        preprocess: [
          {
            name: 'export-test',
            description: 'Test export',
            pattern: 'test',
            replacement: 'exported',
            enabled: true
          }
        ],
        postprocess: []
      };

      const engine = new TransformEngine(customConfig);
      const exported = engine.exportConfig();

      const parsed = JSON.parse(exported);
      expect(parsed.preprocess).toHaveLength(1);
      expect(parsed.preprocess[0].name).toBe('export-test');
    });

    test('should save config to file', () => {
      const engine = new TransformEngine();
      const configFile = path.join(tempDir, 'saved-config.json');

      engine.saveConfig(configFile);
      testFiles.push(configFile);

      expect(fs.existsSync(configFile)).toBe(true);

      const savedContent = fs.readFileSync(configFile, 'utf8');
      const parsed = JSON.parse(savedContent);

      expect(parsed.preprocess).toBeDefined();
      expect(parsed.postprocess).toBeDefined();
    });
  });

  // ==========================================================================
  // DEFAULT RULES VALIDATION TESTS
  // ==========================================================================

  describe('Default Rules Validation', () => {
    test('should have valid default preprocessing rules', () => {
      expect(DEFAULT_PREPROCESS_RULES).toBeDefined();
      expect(Array.isArray(DEFAULT_PREPROCESS_RULES)).toBe(true);
      expect(DEFAULT_PREPROCESS_RULES.length).toBeGreaterThan(0);

      DEFAULT_PREPROCESS_RULES.forEach(rule => {
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.pattern).toBeDefined();
        expect(rule.replacement).toBeDefined();
        expect(typeof rule.enabled).toBe('boolean');
      });
    });

    test('should have valid default postprocessing rules', () => {
      expect(DEFAULT_POSTPROCESS_RULES).toBeDefined();
      expect(Array.isArray(DEFAULT_POSTPROCESS_RULES)).toBe(true);
      expect(DEFAULT_POSTPROCESS_RULES.length).toBeGreaterThan(0);

      DEFAULT_POSTPROCESS_RULES.forEach(rule => {
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(rule.pattern).toBeDefined();
        expect(rule.replacement).toBeDefined();
        expect(typeof rule.enabled).toBe('boolean');
      });
    });

    test('should validate that default patterns are valid regex', () => {
      const allRules = [...DEFAULT_PREPROCESS_RULES, ...DEFAULT_POSTPROCESS_RULES];

      allRules.forEach(rule => {
        expect(() => {
          new RegExp(rule.pattern, rule.flags || 'g');
        }).not.toThrow();
      });
    });
  });

  // ==========================================================================
  // INTEGRATION WITH SCRIPT TRANSFORMATION TESTS
  // ==========================================================================

  describe('Integration with Script Transformation', () => {
    test('should integrate with translateHandlersInScriptWithTransforms', () => {
      const rules: TransformRule[] = [
        {
          name: 'header-fix',
          description: 'Fix header access',
          pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
          replacement: 'insomnia.response.headers.get($1).value.includes(',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ postprocess: rules });

      const scriptContent = `
        pm.test("Content type check", function() {
          pm.expect(pm.response.headers.get("Content-Type").includes("json")).to.be.true;
        });
      `;

      const result = translateHandlersInScriptWithTransforms(scriptContent, engine);

      // Should convert pm. to insomnia. AND fix the header access
      expect(result).toContain('insomnia.test');
      expect(result).toContain('insomnia.expect');
      expect(result).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
    });

    test('should work without transform engine (backwards compatibility)', () => {
      const scriptContent = `
        pm.test("Simple test", function() {
          pm.expect(pm.response.responseTime).to.be.below(1000);
        });
      `;

      const result = translateHandlersInScriptWithTransforms(scriptContent);

      expect(result).toContain('insomnia.test');
      expect(result).toContain('insomnia.expect');
      expect(result).toContain('insomnia.response.responseTime');
    });
  });

  // ==========================================================================
  // EDGE CASES AND ERROR HANDLING
  // ==========================================================================

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty input strings', () => {
      const engine = new TransformEngine();

      expect(engine.preprocess('')).toBe('');
      expect(engine.postprocess('')).toBe('');
    });

    test('should handle very large input strings', () => {
      const engine = new TransformEngine();
      const largeInput = 'test '.repeat(10000);

      expect(() => {
        engine.preprocess(largeInput);
        engine.postprocess(largeInput);
      }).not.toThrow();
    });

    test('should handle special characters in patterns', () => {
      const rules: TransformRule[] = [
        {
          name: 'special-chars',
          description: 'Handle special characters',
          pattern: '\\$\\{([^}]+)\\}',
          replacement: '{{$1}}',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ preprocess: rules });
      const input = 'Replace ${variable} and ${another}';
      const result = engine.preprocess(input);

      expect(result).toBe('Replace {{variable}} and {{another}}');
    });

    test('should handle unicode characters', () => {
      const rules: TransformRule[] = [
        {
          name: 'unicode-test',
          description: 'Handle unicode',
          pattern: '测试',
          replacement: 'test',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ preprocess: rules });
      const input = '这是一个测试字符串';
      const result = engine.preprocess(input);

      expect(result).toBe('这是一个test字符串');
    });
  });

  // ==========================================================================
  // SAMPLE CONFIG GENERATION TESTS
  // ==========================================================================

  describe('Sample Config Generation', () => {
    test('should generate sample config file', () => {
      const configFile = path.join(tempDir, 'sample-config.json');

      generateSampleConfig(configFile);
      testFiles.push(configFile);

      expect(fs.existsSync(configFile)).toBe(true);

      const content = fs.readFileSync(configFile, 'utf8');
      const parsed = JSON.parse(content);

      expect(parsed.preprocess).toBeDefined();
      expect(parsed.postprocess).toBeDefined();
      expect(Array.isArray(parsed.preprocess)).toBe(true);
      expect(Array.isArray(parsed.postprocess)).toBe(true);
    });

    test('should generate valid JSON config', () => {
      const configFile = path.join(tempDir, 'valid-config.json');

      generateSampleConfig(configFile);
      testFiles.push(configFile);

      const content = fs.readFileSync(configFile, 'utf8');

      expect(() => {
        JSON.parse(content);
      }).not.toThrow();
    });
  });

  // =============================================================================
  // UNIT TEST FOR REQUEST HEADERS.ADD() FIX RULE
  // =============================================================================
  describe('Request Headers Add Fix Rule', () => {
    test('should convert insomnia.request.headers.add() to insomnia.request.addHeader()', () => {
      const rules: TransformRule[] = [
        {
          name: 'fix-request-headers-add',
          description: 'Convert insomnia.request.headers.add() to insomnia.request.addHeader()',
          pattern: 'insomnia\\.request\\.headers\\.add\\(\\s*\\{([\\s\\S]*?)\\}\\s*\\);?',
          replacement: 'insomnia.request.addHeader({$1});',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ preprocess: [], postprocess: rules });

      // Test Case 1: Simple header addition
      const input1 = `
        // Add custom headers
        insomnia.request.headers.add({
          key: "X-Client-Version",
          value: "1.2.3"
        });
      `;

      const result1 = engine.postprocess(input1);
      expect(result1).toContain('insomnia.request.addHeader({');
      expect(result1).toContain('key: "X-Client-Version"');
      expect(result1).toContain('value: "1.2.3"');
      expect(result1).not.toContain('insomnia.request.headers.add');

      // Test Case 2: Header with template variable
      const input2 = `
        insomnia.request.headers.add({
          key: "X-Request-ID",
          value: insomnia.variables.replaceIn("{{$guid}}")
        });
      `;

      const result2 = engine.postprocess(input2);
      expect(result2).toContain('insomnia.request.addHeader({');
      expect(result2).toContain('key: "X-Request-ID"');
      expect(result2).toContain('value: insomnia.variables.replaceIn("{{$guid}}")');
      expect(result2).not.toContain('insomnia.request.headers.add');

      // Test Case 3: Multiple headers
      const input3 = `
        insomnia.request.headers.add({
          key: "X-Client-Version",
          value: "1.2.3"
        });
        insomnia.request.headers.add({
          key: "X-Request-ID",
          value: insomnia.variables.replaceIn("{{$guid}}")
        });
      `;

      const result3 = engine.postprocess(input3);
      const addHeaderMatches = (result3.match(/insomnia\.request\.addHeader/g) || []).length;
      expect(addHeaderMatches).toBe(2);
      expect(result3).not.toContain('insomnia.request.headers.add');

      // Test Case 4: Header with complex value
      const input4 = `
        insomnia.request.headers.add({
          key: "Authorization",
          value: "Bearer " + token
        });
      `;

      const result4 = engine.postprocess(input4);
      expect(result4).toContain('insomnia.request.addHeader({');
      expect(result4).toContain('key: "Authorization"');
      expect(result4).toContain('value: "Bearer " + token');
    });

    test('should preserve formatting and handle edge cases', () => {
      const rules: TransformRule[] = [
        {
          name: 'fix-request-headers-add',
          description: 'Convert insomnia.request.headers.add() to insomnia.request.addHeader()',
          pattern: 'insomnia\\.request\\.headers\\.add\\(\\s*\\{([^}]+)\\}\\s*\\);?',
          replacement: 'insomnia.request.addHeader({$1});',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ preprocess: [], postprocess: rules });

      // Test Case 5: Compact format (no spaces)
      const input5 = 'insomnia.request.headers.add({key:"X-Test",value:"test"});';
      const result5 = engine.postprocess(input5);
      expect(result5).toBe('insomnia.request.addHeader({key:"X-Test",value:"test"});');

      // Test Case 6: With extra whitespace
      const input6 = `
        insomnia.request.headers.add(  {
          key: "X-Extra-Spaces",
          value: "test"
        }  );
      `;
      const result6 = engine.postprocess(input6);
      expect(result6).toContain('insomnia.request.addHeader({');
      expect(result6).not.toContain('insomnia.request.headers.add');

      // Test Case 7: Without semicolon
      const input7 = `
        insomnia.request.headers.add({
          key: "X-No-Semicolon",
          value: "test"
        })
      `;
      const result7 = engine.postprocess(input7);
      expect(result7).toContain('insomnia.request.addHeader({');
      expect(result7).toContain('key: "X-No-Semicolon"');
    });

    test('should not interfere with other request methods', () => {
      const rules: TransformRule[] = [
        {
          name: 'fix-request-headers-add',
          description: 'Convert insomnia.request.headers.add() to insomnia.request.addHeader()',
          pattern: 'insomnia\\.request\\.headers\\.add\\(\\s*\\{([^}]+)\\}\\s*\\);?',
          replacement: 'insomnia.request.addHeader({$1});',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ preprocess: [], postprocess: rules });

      // Test Case 8: Should not affect other request methods
      const input8 = `
        insomnia.request.removeHeader('X-Old-Header');
        insomnia.request.headers.add({
          key: "X-New-Header",
          value: "new-value"
        });
        insomnia.request.method = 'POST';
      `;

      const result8 = engine.postprocess(input8);
      expect(result8).toContain('insomnia.request.removeHeader(\'X-Old-Header\')');
      expect(result8).toContain('insomnia.request.addHeader({');
      expect(result8).toContain('insomnia.request.method = \'POST\'');
      expect(result8).not.toContain('insomnia.request.headers.add');
    });
  });

  // ==========================================================================
  // REAL-WORLD SCENARIO TESTS
  // ==========================================================================
  describe('Real-World Scenarios', () => {
    test('should handle complex Postman to Insomnia conversion scenario', () => {
      const preprocessRules: TransformRule[] = [
        {
          name: 'fix-responseHeaders',
          description: 'Fix deprecated responseHeaders syntax',
          pattern: 'pm\\.responseHeaders\\[(.*?)\\]',
          replacement: 'pm.response.headers.get($1)',
          flags: 'g',
          enabled: true
        }
      ];

      const postprocessRules: TransformRule[] = [
        {
          name: 'fix-header-includes',
          description: 'Fix header includes method',
          pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
          replacement: 'insomnia.response.headers.get($1).value.includes(',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({
        preprocess: preprocessRules,
        postprocess: postprocessRules
      });

      // Simulate preprocessing on raw Postman JSON
      const postmanJson = `{
        "script": {
          "exec": [
            "if (pm.responseHeaders[\\"Content-Type\\"].includes(\\"json\\")) {",
            "  console.log('JSON response');",
            "}"
          ]
        }
      }`;

      const preprocessed = engine.preprocess(postmanJson);

      // Should fix the responseHeaders syntax
      expect(preprocessed).toContain('pm.response.headers.get(\\"Content-Type\\")');

      // Simulate script transformation after conversion
      const convertedScript = `
        if (insomnia.response.headers.get("Content-Type").includes("json")) {
          console.log('JSON response');
        }
      `;

      const postprocessed = engine.postprocess(convertedScript);

      // Should fix the header access for Insomnia
      expect(postprocessed).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
    });

    test('should handle multiple API difference fixes', () => {
      const postprocessRules: TransformRule[] = [
        {
          name: 'fix-header-methods',
          description: 'Fix header string methods',
          pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.(toLowerCase|toUpperCase|includes|startsWith)\\(',
          replacement: 'insomnia.response.headers.get($1).value.$2(',
          flags: 'g',
          enabled: true
        }
      ];

      const engine = new TransformEngine({ postprocess: postprocessRules });

      const script = `
        const contentType = insomnia.response.headers.get("Content-Type").toLowerCase();
        const isJson = insomnia.response.headers.get("Content-Type").includes("json");
        const isHtml = insomnia.response.headers.get("Content-Type").startsWith("text/html");
      `;

      const result = engine.postprocess(script);

      expect(result).toContain('insomnia.response.headers.get("Content-Type").value.toLowerCase()');
      expect(result).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(result).toContain('insomnia.response.headers.get("Content-Type").value.startsWith("text/html")');
    });
  });
});
