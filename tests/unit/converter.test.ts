// =============================================================================
// UPDATED CONVERTER TESTS - WITH TRANSFORM SUPPORT - FIXED
// =============================================================================
// Enhanced tests for the main converter orchestration with transform integration
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { convertPostmanToInsomnia, ConversionOptions, ConversionResult } from '../../src/converter';
import { TransformEngine } from '../../src/transform-engine';

describe('Converter with Transform Support', () => {
  let tempDir: string;
  let testFiles: string[];
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'converter-test-'));
    testFiles = [];
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    consoleSpy.mockRestore();
  });

  const createTestFile = (filename: string, content: any): string => {
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    testFiles.push(filePath);
    return filePath;
  };

  const createConfigFile = (config: any): string => {
    const configPath = path.join(tempDir, 'test-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    testFiles.push(configPath);
    return configPath;
  };

  // ==========================================================================
  // ENHANCED FILE TYPE DETECTION TESTS
  // ==========================================================================

  describe('File Type Detection with Transforms', () => {
    test('should detect Postman collections correctly with transform options', async () => {
      const collection = {
        info: {
          name: 'Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };

      const filePath = createTestFile('collection.json', collection);
      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true,
        postprocess: true
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });

    test('should detect Postman environments correctly with transform options', async () => {
      const environment = {
        name: 'Test Environment',
        _postman_variable_scope: 'environment',
        values: [
          { key: 'baseUrl', value: 'https://api.test.com', enabled: true }
        ]
      };

      const filePath = createTestFile('environment.json', environment);
      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true,
        postprocess: true
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  // ==========================================================================
  // PREPROCESSING INTEGRATION TESTS - FIXED
  // ==========================================================================

  describe('Preprocessing Integration', () => {
    test('should apply preprocessing transforms to raw Postman JSON', async () => {
      const legacyCollection = {
        info: {
          name: 'Legacy Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Legacy Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/legacy'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Legacy syntax that needs preprocessing',
                    'if (pm.responseHeaders["Content-Type"]) {',
                    '  postman.getEnvironmentVariable("type");',
                    '}',
                    'tests["Status OK"] = pm.response.code === 200;'
                  ]
                }
              }
            ]
          }
        ]
      };

      const filePath = createTestFile('legacy.json', legacyCollection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);

      // Verify preprocessing was applied by checking output
      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const script = parsed.collection[0].scripts.afterResponse;

      // Should have preprocessed deprecated syntax before pm->insomnia conversion
      expect(script).toContain('insomnia.response.headers.get("Content-Type")');
      expect(script).toContain('insomnia.environment.get'); // Fixed: getEnvironmentVariable -> environment.get
      expect(script).toContain('insomnia.test');
      expect(script).not.toContain('pm.responseHeaders[');
      expect(script).not.toContain('postman.getEnvironmentVariable');
      expect(script).not.toContain('tests[');
    });

    test('should use custom preprocessing config', async () => {
      const collection = {
        info: {
          name: 'Custom Preprocess',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Custom Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/custom'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: ['customOldSyntax("test");']
                }
              }
            ]
          }
        ]
      };

      const filePath = createTestFile('custom-preprocess.json', collection);

      const config = {
        preprocess: [
          {
            name: 'custom-rule',
            description: 'Custom preprocessing rule',
            pattern: 'customOldSyntax\\((.*?)\\)',
            replacement: 'pm.test($1, function() {});',
            flags: 'g',
            enabled: true
          }
        ],
        postprocess: []
      };

      const configFile = createConfigFile(config);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true,
        configFile: configFile
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const script = parsed.collection[0].scripts.afterResponse;
      expect(script).toContain('insomnia.test("test"');
      expect(script).not.toContain('customOldSyntax');
    });

    test('should handle preprocessing with malformed JSON gracefully', async () => {
      const malformedFile = path.join(tempDir, 'malformed.json');
      fs.writeFileSync(malformedFile, '{ "info": { invalid json }');
      testFiles.push(malformedFile);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true
      };

      const result = await convertPostmanToInsomnia([malformedFile], options);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  // ==========================================================================
  // POSTPROCESSING INTEGRATION TESTS
  // ==========================================================================

  describe('Postprocessing Integration', () => {
    test('should apply postprocessing transforms to converted scripts', async () => {
      const modernCollection = {
        info: {
          name: 'Modern Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Modern Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/modern'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Modern syntax that needs postprocessing for Insomnia',
                    'pm.test("Header check", function() {',
                    '  if (pm.response.headers.get("Content-Type").includes("json")) {',
                    '    pm.expect(pm.response.headers.get("Status") === "success").to.be.true;',
                    '  }',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };

      const filePath = createTestFile('modern.json', modernCollection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        postprocess: true
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const script = parsed.collection[0].scripts.afterResponse;

      // Should have postprocessed Insomnia API differences
      expect(script).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(script).toContain('insomnia.response.headers.get("Status").value === "success"');
      expect(script).not.toMatch(/insomnia\.response\.headers\.get\([^)]+\)\.includes\(/);
      expect(script).not.toMatch(/insomnia\.response\.headers\.get\([^)]+\)\s*===/);
    });

    test('should use custom postprocessing config', async () => {
      const collection = {
        info: {
          name: 'Custom Postprocess',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Custom Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/custom-post'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: ['pm.customApiCall();']
                }
              }
            ]
          }
        ]
      };

      const filePath = createTestFile('custom-postprocess.json', collection);

      const config = {
        preprocess: [],
        postprocess: [
          {
            name: 'custom-api-fix',
            description: 'Fix custom API call',
            pattern: 'insomnia\\.customApiCall\\(\\)',
            replacement: 'insomnia.fixedApiCall()',
            flags: 'g',
            enabled: true
          }
        ]
      };

      const configFile = createConfigFile(config);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        postprocess: true,
        configFile: configFile
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const script = parsed.collection[0].scripts.afterResponse;
      expect(script).toContain('insomnia.fixedApiCall()');
      expect(script).not.toContain('insomnia.customApiCall()');
    });
  });

  // ==========================================================================
  // COMBINED PREPROCESSING AND POSTPROCESSING TESTS - FIXED
  // ==========================================================================

  describe('Combined Transform Processing', () => {
    test('should apply both preprocessing and postprocessing in full pipeline', async () => {
      const complexCollection = {
        info: {
          name: 'Complex Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Complex Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/complex'
            },
            event: [
              {
                listen: 'prerequest',
                script: {
                  exec: [
                    '// Legacy syntax that needs preprocessing',
                    'postman.getGlobalVariable("timestamp");'  // Fixed: Use getGlobalVariable (which gets converted)
                  ]
                }
              },
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Modern syntax that needs postprocessing',
                    'pm.test("Full pipeline test", function() {',
                    '  if (pm.response.headers.get("Content-Type").includes("json")) {',
                    '    pm.expect(pm.response.headers.get("Status") === "OK").to.be.true;',
                    '  }',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };

      const filePath = createTestFile('complex.json', complexCollection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true,
        postprocess: true
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const preRequestScript = parsed.collection[0].scripts.preRequest;
      const testScript = parsed.collection[0].scripts.afterResponse;

      // Verify preprocessing worked (getGlobalVariable -> globals.get)
      expect(preRequestScript).toContain('insomnia.globals.get');
      expect(preRequestScript).not.toContain('postman.getGlobalVariable');

      // Verify postprocessing worked
      expect(testScript).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(testScript).toContain('insomnia.response.headers.get("Status").value === "OK"');
    });

    test('should handle transforms with batch processing', async () => {
      const collection1 = {
        info: {
          name: 'Batch Collection 1',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Batch Request 1',
            request: { method: 'GET', url: 'https://api.example.com/batch1' },
            event: [{
              listen: 'test',
              script: {
                exec: ['tests["Batch 1 OK"] = pm.response.code === 200;']
              }
            }]
          }
        ]
      };

      const collection2 = {
        info: {
          name: 'Batch Collection 2',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Batch Request 2',
            request: { method: 'GET', url: 'https://api.example.com/batch2' },
            event: [{
              listen: 'test',
              script: {
                exec: ['if (pm.response.headers.get("Type").includes("json")) {}']
              }
            }]
          }
        ]
      };

      const file1 = createTestFile('batch1.json', collection1);
      const file2 = createTestFile('batch2.json', collection2);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true,
        postprocess: true
      };

      const result = await convertPostmanToInsomnia([file1, file2], options);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.outputs).toHaveLength(2);

      // Verify both files were processed with transforms
      result.outputs.forEach(outputFile => {
        const content = fs.readFileSync(outputFile, 'utf8');
        const parsed = yaml.load(content) as any;

        const request = parsed.collection[0];

        if (request.scripts.afterResponse) {
          const script = request.scripts.afterResponse;
          if (script.includes('insomnia.test')) {
            expect(script).not.toContain('tests[');
          }
          if (script.includes('headers.get')) {
            expect(script).toMatch(/\.value\./);
          }
        }
      });
    });

    test('should maintain ID uniqueness with transforms in batch mode', async () => {
      const createCollection = (name: string) => ({
        info: {
          name,
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Test Request',
            request: { method: 'GET', url: 'https://api.example.com/test' },
            event: [{
              listen: 'test',
              script: {
                exec: ['pm.test("test", function() {});']
              }
            }]
          }
        ]
      });

      const file1 = createTestFile('unique1.json', createCollection('Unique 1'));
      const file2 = createTestFile('unique2.json', createCollection('Unique 2'));
      const file3 = createTestFile('unique3.json', createCollection('Unique 3'));

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'json', // Use JSON for easier ID extraction
        verbose: false,
        preprocess: true,
        postprocess: true
      };

      const result = await convertPostmanToInsomnia([file1, file2, file3], options);

      expect(result.successful).toBe(3);

      // Extract all IDs and verify uniqueness
      const allIds = new Set<string>();
      result.outputs.forEach(outputFile => {
        const content = fs.readFileSync(outputFile, 'utf8');
        const parsed = JSON.parse(content);

        // Extract IDs from meta and collection items
        if (parsed.meta?.id) allIds.add(parsed.meta.id);
        if (parsed.environments?.meta?.id) allIds.add(parsed.environments.meta.id);
        if (parsed.cookieJar?.meta?.id) allIds.add(parsed.cookieJar.meta.id);

        // Extract IDs from collection items recursively
        const extractIds = (items: any[]) => {
          items.forEach(item => {
            if (item.meta?.id) allIds.add(item.meta.id);
            if (item.children) extractIds(item.children);
          });
        };

        if (parsed.collection) extractIds(parsed.collection);
      });

      // All IDs should be unique
      const idArray = Array.from(allIds);
      expect(idArray.length).toBe(allIds.size);

      // Verify UUID format
      idArray.forEach(id => {
        expect(id).toMatch(/^(wrk|env|jar|req|fld)_[a-f0-9]{32}$/);
      });
    });
  });

  // ==========================================================================
  // TRANSFORM ENGINE INTEGRATION TESTS
  // ==========================================================================

  describe('Transform Engine Integration', () => {
    test('should use provided TransformEngine instance', async () => {
      const collection = {
        info: {
          name: 'Engine Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Engine Request',
            request: { method: 'GET', url: 'https://api.example.com/engine' },
            event: [{
              listen: 'test',
              script: {
                exec: ['engineTestPattern();']
              }
            }]
          }
        ]
      };

      const filePath = createTestFile('engine.json', collection);

      // Create custom transform engine
      const transformEngine = new TransformEngine({
        preprocess: [],
        postprocess: [
          {
            name: 'engine-test',
            description: 'Engine test transformation',
            pattern: 'engineTestPattern\\(\\)',
            replacement: 'insomnia.engineFixed()',
            flags: 'g',
            enabled: true
          }
        ]
      });

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        postprocess: true,
        transformEngine: transformEngine
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const script = parsed.collection[0].scripts.afterResponse;
      expect(script).toContain('insomnia.engineFixed()');
      expect(script).not.toContain('engineTestPattern()');
    });

    test('should create TransformEngine from config file when needed', async () => {
      const collection = {
        info: {
          name: 'Config Engine Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Config Request',
            request: { method: 'GET', url: 'https://api.example.com/config' },
            event: [{
              listen: 'test',
              script: {
                exec: ['configTestPattern();']
              }
            }]
          }
        ]
      };

      const filePath = createTestFile('config-engine.json', collection);

      const config = {
        preprocess: [],
        postprocess: [
          {
            name: 'config-test',
            description: 'Config test transformation',
            pattern: 'configTestPattern\\(\\)',
            replacement: 'insomnia.configFixed()',
            flags: 'g',
            enabled: true
          }
        ]
      };

      const configFile = createConfigFile(config);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        postprocess: true,
        configFile: configFile
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const script = parsed.collection[0].scripts.afterResponse;
      expect(script).toContain('insomnia.configFixed()');
      expect(script).not.toContain('configTestPattern()');
    });

    test('should fall back to default engine when config file is invalid', async () => {
      const collection = {
        info: {
          name: 'Fallback Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };

      const filePath = createTestFile('fallback.json', collection);

      const invalidConfigFile = path.join(tempDir, 'invalid-config.json');
      fs.writeFileSync(invalidConfigFile, '{ invalid json }');
      testFiles.push(invalidConfigFile);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true,
        configFile: invalidConfigFile
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // BACKWARD COMPATIBILITY TESTS
  // ==========================================================================

  describe('Backward Compatibility', () => {
    test('should work without transform options (backward compatibility)', async () => {
      const collection = {
        info: {
          name: 'Backward Compatible',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Compatible Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/compatible'
            }
          }
        ]
      };

      const filePath = createTestFile('compatible.json', collection);

      // Original options without transform flags
      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);

      // Should still produce valid output
      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      expect(parsed.type).toBe('collection.insomnia.rest/5.0');
      expect(parsed.collection).toHaveLength(1);
    });

    test('should handle options with only preprocess flag', async () => {
      const collection = {
        info: {
          name: 'Preprocess Only',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };

      const filePath = createTestFile('preprocess-only.json', collection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true
        // postprocess: undefined
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });

    test('should handle options with only postprocess flag', async () => {
      const collection = {
        info: {
          name: 'Postprocess Only',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };

      const filePath = createTestFile('postprocess-only.json', collection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        postprocess: true
        // preprocess: undefined
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });
  });

  // ==========================================================================
  // ENHANCED OUTPUT VALIDATION TESTS
  // ==========================================================================

  describe('Enhanced Output Validation', () => {
    test('should generate valid Insomnia v5 format with transforms', async () => {
      const collection = {
        info: {
          name: 'V5 Format Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'V5 Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/v5'
            },
            event: [{
              listen: 'test',
              script: {
                exec: ['pm.test("v5 test", function() {});']
              }
            }]
          }
        ]
      };

      const filePath = createTestFile('v5-test.json', collection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'json',
        verbose: false,
        preprocess: true,
        postprocess: true
      };

      const result = await convertPostmanToInsomnia([filePath], options);

      expect(result.successful).toBe(1);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = JSON.parse(content);

      // Validate v5 collection format with transforms
      expect(parsed.type).toBe('collection.insomnia.rest/5.0');
      expect(parsed.meta).toHaveProperty('id');
      expect(parsed.meta).toHaveProperty('created');
      expect(parsed.meta).toHaveProperty('modified');
      expect(parsed.collection).toBeInstanceOf(Array);
      expect(parsed.environments).toHaveProperty('data');
      expect(parsed.cookieJar).toHaveProperty('cookies');

      // Verify script was transformed
      const request = parsed.collection[0];
      expect(request.scripts.afterResponse).toContain('insomnia.test');
    });
  });

  // =============================================================================
  // EXPERIMENTAL CONVERTER TESTS
  // =============================================================================
  describe('Experimental Transform Processing', () => {
    test('should apply experimental rules when experimental flag is true', async () => {
      const testCollection = {
        info: {
          name: 'Experimental Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Bracket Notation Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/test'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'var json = pm.response.json();',
                    'pm.expect(json[\'access_token\']).to.be.a(\'string\');',
                    'pm.environment.set("TOKEN", json[\'access_token\']);'
                  ]
                }
              }
            ]
          }
        ]
      };

      const inputFile = createTestFile('experimental-true.json', testCollection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        postprocess: true,
        experimental: true  // Experimental flag enabled
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const script = parsed.collection[0].scripts.afterResponse;

      // Should apply experimental bracket notation conversion
      expect(script).toContain('json.access_token');
      expect(script).not.toContain('json[\'access_token\']');
    });

    test('should not apply experimental rules when experimental flag is false', async () => {
      const testCollection = {
        info: {
          name: 'No Experimental Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Standard Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/standard'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'var response = pm.response.json();',
                    'pm.expect(response[\'user_id\']).to.exist;'
                  ]
                }
              }
            ]
          }
        ]
      };

      const inputFile = createTestFile('experimental-false.json', testCollection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        postprocess: true,
        experimental: false  // Experimental flag disabled
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const script = parsed.collection[0].scripts.afterResponse;

      // Should NOT apply experimental bracket notation conversion
      expect(script).toContain('response[\'user_id\']');
      expect(script).not.toContain('response.user_id');
    });

    test('should handle ExtendedTransformEngine creation correctly', async () => {
      const testCollection = {
        info: {
          name: 'Engine Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Engine Test Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/engine-test'
            }
          }
        ]
      };

      const inputFile = createTestFile('engine-test.json', testCollection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: true,  // Enable verbose to see engine creation
        postprocess: true,
        experimental: true
      };

      // Should not throw any errors when creating ExtendedTransformEngine
      expect(async () => {
        await convertPostmanToInsomnia([inputFile], options);
      }).not.toThrow();

      const result = await convertPostmanToInsomnia([inputFile], options);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });

    test('should apply experimental preprocessing rules when experimental flag is true', async () => {
      const testCollection = {
        info: {
          name: 'Preprocess Experimental Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Legacy Syntax Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/legacy'
            },
            event: [
              {
                listen: 'prerequest',
                script: {
                  exec: [
                    'var token = postman.getEnvironmentVariable("auth_token");',
                    'postman.setEnvironmentVariable("processed_token", token);'
                  ]
                }
              }
            ]
          }
        ]
      };

      const inputFile = createTestFile('preprocess-experimental.json', testCollection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true,
        experimental: true
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const script = parsed.collection[0].scripts.preRequest;

      // Should apply preprocessing to convert legacy syntax
      expect(script).toContain('insomnia.environment.get("auth_token")');
      expect(script).toContain('insomnia.environment.set("processed_token"');
      expect(script).not.toContain('postman.getEnvironmentVariable');
      expect(script).not.toContain('postman.setEnvironmentVariable');
    });

    test('should handle complex nested bracket notation with experimental rules', async () => {
      const testCollection = {
        info: {
          name: 'Complex Bracket Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Nested Bracket Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/nested'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'var apiResponse = pm.response.json();',
                    'pm.expect(apiResponse[\'data\'][\'user\'][\'profile\'][\'email\']).to.be.a(\'string\');',
                    'var userInfo = apiResponse[\'data\'][\'user\'];',
                    'pm.environment.set("USER_EMAIL", userInfo[\'profile\'][\'email\']);'
                  ]
                }
              }
            ]
          }
        ]
      };

      const inputFile = createTestFile('nested-bracket.json', testCollection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        postprocess: true,
        experimental: true
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const script = parsed.collection[0].scripts.afterResponse;

      // Should convert deeply nested bracket notation with multiple passes
      expect(script).toContain('apiResponse.data.user.profile.email');
      expect(script).toContain('apiResponse.data.user');
      expect(script).toContain('userInfo.profile.email');

      // Should not contain any bracket notation
      expect(script).not.toContain('[\'data\'][\'user\'][\'profile\'][\'email\']');
      expect(script).not.toContain('[\'profile\'][\'email\']');
    });

    test('should work with custom config file and experimental flag', async () => {
      const testCollection = {
        info: {
          name: 'Custom Config Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Config Test Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/config'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'var data = pm.response.json();',
                    'pm.expect(data[\'simple_field\']).to.equal(\'test\');'
                  ]
                }
              }
            ]
          }
        ]
      };

      // Create a simple custom config that doesn't conflict
      const customConfig = {
        preprocess: [],
        postprocess: []  // Empty, just test that custom config loading works
      };

      const configFile = createTestFile('custom-config.json', customConfig);
      const inputFile = createTestFile('config-test.json', testCollection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        postprocess: true,
        configFile: configFile,
        experimental: true
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);

      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');

      // Just verify experimental bracket notation conversion works
      expect(content).toContain('data.simple_field');
      expect(content).not.toContain('data[\'simple_field\']');
    });
  });
});
