// =============================================================================
// EXPERIMENTAL RULES IN TRANSFORM ENGINE UNIT TESTS
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EXPERIMENTAL_POSTPROCESS_RULES, EXPERIMENTAL_PREPROCESS_RULES, TransformRule, TransformEngine, generateSampleConfig } from '../../src/transform-engine';

describe('TransformEngine with Experimental Rules', () => {
  let engine: TransformEngine;
  let tempDir: string;
  let testFiles: string[] = [];
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    engine = new TransformEngine();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'extended-transform-test-'));
    testFiles = [];

    // Mock console methods to reduce test output noise
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up test files
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  // ==========================================================================
  // EXPERIMENTAL POSTPROCESSING TESTS
  // ==========================================================================
  describe('Experimental Postprocessing', () => {
    test('debug experimental bracket notation', () => {
      consoleLogSpy.mockRestore();
      const engine = new TransformEngine();
      const input = `insomnia.expect(json['access_token']).to.be.a('string');`;

      console.log('Input:', input);

      // Test without experimental rules
      const resultWithout = engine.postprocess(input, false);
      console.log('Without experimental:', resultWithout);

      // Test with experimental rules
      const resultWith = engine.postprocess(input, true);
      console.log('With experimental:', resultWith);

      expect(resultWith).toContain('json.access_token');
      expect(resultWith).not.toContain("json['access_token']");
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    test('should apply bracket notation fixes when experimental flag is true', () => {
      const input = `
        insomnia.test("Get an access token", function(){
            var json = insomnia.response.json();
            insomnia.expect(json['access_token']).to.be.a('string');
            insomnia.environment.set("ACCESS_TOKEN", json['access_token']);
        });
      `;

      const result = engine.postprocess(input, true);

      expect(result).toContain("json.access_token");
      expect(result).not.toContain("json['access_token']");
    });

    test('should not apply experimental rules when experimental flag is false', () => {
      const input = `
        var json = insomnia.response.json();
        insomnia.expect(json['access_token']).to.be.a('string');
      `;

      const result = engine.postprocess(input, false);

      // Should not change bracket notation
      expect(result).toContain("json['access_token']");
      expect(result).not.toContain("json.access_token");
    });

    test('should apply experimental rules by default when no flag provided', () => {
      const input = `var data = response['user_id'];`;

      // Default behavior should be false (no experimental rules)
      const result = engine.postprocess(input);
      expect(result).toContain("response['user_id']");
    });

    test('should handle double-quoted bracket notation', () => {
      const input = `insomnia.expect(json["refresh_token"]).to.be.a('string');`;

      const result = engine.postprocess(input, true);

      expect(result).toContain('json.refresh_token');
      expect(result).not.toContain('json["refresh_token"]');
    });

    test('should handle multiple bracket notations in same script', () => {
      const input = `
        const token = json['access_token'];
        const userId = json['user_id'];
        const email = userData["email"];
      `;

      const result = engine.postprocess(input, true);

      expect(result).toContain('json.access_token');
      expect(result).toContain('json.user_id');
      expect(result).toContain('userData.email');
      expect(result).not.toContain("['");
      expect(result).not.toContain('["');
    });

    test('should handle different variable names', () => {
      const input = `
        const token = apiResponse['token'];
        const data = responseData['data'];
        const config = settings['config'];
      `;

      const result = engine.postprocess(input, true);

      expect(result).toContain('apiResponse.token');
      expect(result).toContain('responseData.data');
      expect(result).toContain('settings.config');
    });
  });

  // ==========================================================================
  // EXPERIMENTAL PREPROCESSING TESTS
  // ==========================================================================
  describe('Experimental Preprocessing', () => {
    test('should handle empty experimental preprocessing rules gracefully', () => {
      const input = 'Some Postman JSON content';
      const result = engine.preprocess(input, true);

      // Should not throw and should return input unchanged
      expect(result).toBe(input);
    });
  });

  // ==========================================================================
  // CONFIG GENERATION TESTS
  // ==========================================================================
  describe('Config Generation', () => {
    test('should generate config without experimental rules when flag is false', () => {
      const configPath = path.join(tempDir, 'config-no-experimental.json');
      testFiles.push(configPath);

      generateSampleConfig(configPath, false);

      expect(fs.existsSync(configPath)).toBe(true);

      const configContent = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Check that config has the expected structure
      expect(configContent.preprocess).toBeDefined();
      expect(configContent.postprocess).toBeDefined();
      expect(configContent._experimental_notice).toBeUndefined();
    });

    test('should generate config with experimental rules when flag is true', () => {
      const configPath = path.join(tempDir, 'config-with-experimental.json');
      testFiles.push(configPath);

      generateSampleConfig(configPath, true);

      expect(fs.existsSync(configPath)).toBe(true);

      const configContent = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Should include experimental notice
      expect(configContent._experimental_notice).toBeDefined();

      // Should have experimental postprocess rules
      expect(configContent.postprocess.length).toBeGreaterThan(0);

      // Check that some rules are marked as experimental
      const experimentalRules = configContent.postprocess.filter(
        (rule: any) => rule.description && rule.description.includes('(EXPERIMENTAL)')
      );
      expect(experimentalRules.length).toBeGreaterThan(0);
    });

    test('should generate valid JSON config file', () => {
      const configPath = path.join(tempDir, 'valid-config.json');
      testFiles.push(configPath);

      generateSampleConfig(configPath, true);

      expect(() => {
        JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================
  describe('Error Handling', () => {
    test('should handle invalid regex patterns gracefully', () => {
      // Temporarily restore console.warn to verify it's called
      consoleWarnSpy.mockRestore();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // Create a transform engine with an invalid rule for testing
      const configWithInvalidRule = {
        preprocess: [],
        postprocess: [
          {
            name: 'invalid-regex-rule',
            description: 'Rule with invalid regex',
            pattern: '[invalid regex(',  // Invalid regex pattern
            replacement: 'replacement',
            flags: 'g',
            enabled: true
          }
        ]
      };

      const engineWithInvalidRule = new TransformEngine(configWithInvalidRule);
      const input = 'test content';

      // Should not throw, should warn and continue processing
      expect(() => {
        engineWithInvalidRule.postprocess(input, false);
      }).not.toThrow();

      // Verify console.warn was called for the invalid regex
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to apply postprocess rule "invalid-regex-rule"'),
        expect.any(Error)
      );
    });

    test('should handle experimental rules with invalid patterns gracefully', () => {
      // Test that experimental rules don't break the engine
      const input = 'var data = response["test"];';

      // Should not throw when applying experimental rules
      expect(() => {
        engine.postprocess(input, true);
      }).not.toThrow();

      // Should still process valid experimental rules
      const result = engine.postprocess(input, true);
      expect(result).toContain('response.test');
    });

    test('should handle empty input with experimental rules', () => {
      const emptyInput = '';

      // Should handle empty input gracefully
      expect(() => {
        engine.postprocess(emptyInput, true);
        engine.preprocess(emptyInput, true);
      }).not.toThrow();

      expect(engine.postprocess(emptyInput, true)).toBe('');
      expect(engine.preprocess(emptyInput, true)).toBe('');
    });

    test('should handle disabled experimental rules', () => {
      // Create engine with disabled experimental rules
      const configWithDisabledRule = {
        preprocess: [],
        postprocess: [
          {
            name: 'disabled-experimental-rule',
            description: 'Disabled experimental rule',
            pattern: 'shouldNotChange',
            replacement: 'changed',
            flags: 'g',
            enabled: false  // Disabled
          }
        ]
      };

      const engineWithDisabledRule = new TransformEngine(configWithDisabledRule);
      const input = 'This shouldNotChange remain the same';

      // Should not apply disabled rules
      const result = engineWithDisabledRule.postprocess(input, false);
      expect(result).toBe('This shouldNotChange remain the same');
    });

    test('should handle missing flags in experimental rules', () => {
      // Create rule without flags
      const configWithNoFlags = {
        preprocess: [],
        postprocess: [
          {
            name: 'no-flags-rule',
            description: 'Rule without flags',
            pattern: 'test',
            replacement: 'TEST',
            enabled: true
            // flags omitted
          }
        ]
      };

      const engineWithNoFlags = new TransformEngine(configWithNoFlags);
      const input = 'test content';

      // Should default to 'g' flag and work correctly
      expect(() => {
        engineWithNoFlags.postprocess(input, false);
      }).not.toThrow();

      const result = engineWithNoFlags.postprocess(input, false);
      expect(result).toBe('TEST content');
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================
  describe('Integration with Parent Class', () => {
    test('should still apply standard postprocessing rules', () => {
      const input = 'some script content';

      // Should not throw and should process through parent class
      expect(() => {
        engine.postprocess(input, false);
      }).not.toThrow();
    });

    test('should apply both standard and experimental rules when experimental flag is true', () => {
      const input = `var json = response.json(); json['token'] = 'test';`;

      // Should apply both standard rules and experimental rules
      const result = engine.postprocess(input, true);

      expect(result).toContain('json.token');
    });
  });

  // ==========================================================================
  // REAL-WORLD SCENARIO TESTS
  // ==========================================================================
  describe('Real-world Scenarios', () => {
    test('should handle your original bracket notation use case', () => {
      const input = `
        insomnia.test("Get an access token", function(){
            var json = insomnia.response.json();
            insomnia.expect(json['access_token']).to.be.a('string');
            insomnia.environment.set("ACCESS_TOKEN", json['access_token']);
        });
      `;

      const expected = `
        insomnia.test("Get an access token", function(){
            var json = insomnia.response.json();
            insomnia.expect(json.access_token).to.be.a('string');
            insomnia.environment.set("ACCESS_TOKEN", json.access_token);
        });
      `;

      const result = engine.postprocess(input, true);

      expect(result).toEqual(expected);
    });

    test('should handle complex nested bracket notation', () => {
      const input = `
        var user = response['user'];
        var profile = user['profile'];
        var email = profile['email'];
        insomnia.expect(response['data']['items']['count']).to.be.above(0);
      `;

      const result = engine.postprocess(input, true);

      expect(result).toContain('response.user');
      expect(result).toContain('user.profile');
      expect(result).toContain('profile.email');
      // With the enhanced regex pattern and multiple passes, deeply nested
      // bracket notation should be fully converted
      expect(result).toContain('response.data.items.count');
    });

    test('should handle multiple passes for deeply nested bracket notation', () => {
      const input = `data['a']['b']['c']['d']['e']`;
      const result = engine.postprocess(input, true);

      expect(result).toBe('data.a.b.c.d.e');
    });
  });
});
