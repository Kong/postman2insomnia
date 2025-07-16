// =============================================================================
// TRANSFORM INTEGRATION TESTS
// =============================================================================
// End-to-end tests for the complete transform system integration
// Tests the full pipeline from Postman JSON to Insomnia YAML with transforms
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { convertPostmanToInsomnia, ConversionOptions } from '../../src/converter';
import { TransformEngine, TransformRule } from '../../src/transform-engine';

describe('Transform Integration Tests', () => {
  let tempDir: string;
  let testFiles: string[];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'transform-integration-'));
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
  // END-TO-END PREPROCESSING TESTS
  // ==========================================================================

  describe('End-to-End Preprocessing', () => {
    test('should preprocess deprecated Postman syntax before conversion', async () => {
      // Create collection with deprecated syntax
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
              url: 'https://api.example.com/test'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Old syntax that needs preprocessing',
                    'if (pm.responseHeaders["Content-Type"].includes("json")) {',
                    '  console.log("JSON response");',
                    '}',
                    'postman.setEnvironmentVariable("token", responseJson.token);'
                  ]
                }
              }
            ]
          }
        ]
      };

      const inputFile = createTestFile('legacy-collection.json', legacyCollection);

      // Create config with preprocessing rules
      const config = {
        preprocess: [
          {
            name: 'fix-responseHeaders',
            description: 'Fix deprecated responseHeaders syntax',
            pattern: 'pm\\.responseHeaders\\[(.*?)\\]',
            replacement: 'pm.response.headers.get($1)',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-setEnvironmentVariable',
            description: 'Fix deprecated setEnvironmentVariable',
            pattern: 'postman\\.setEnvironmentVariable\\((.*?)\\)',
            replacement: 'pm.environment.set($1)',
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

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);

      // Read the output file and verify preprocessing worked
      const outputFile = result.outputs[0];
      const outputContent = fs.readFileSync(outputFile, 'utf8');
      const parsedOutput = yaml.load(outputContent) as any;

      // Find the test script in the collection
      const request = parsedOutput.collection[0];
      const testScript = request.scripts.afterResponse;

      // Should have preprocessed the deprecated syntax
      expect(testScript).toContain('insomnia.response.headers.get("Content-Type")');
      expect(testScript).toContain('insomnia.environment.set');
      expect(testScript).not.toContain('pm.responseHeaders[');
      expect(testScript).not.toContain('postman.setEnvironmentVariable');
    });

    test('should handle complex preprocessing with multiple collections', async () => {
      // Create multiple collections with different legacy patterns
      const collection1 = {
        info: {
          name: 'Collection 1',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Request 1',
            request: { method: 'GET', url: 'https://api.example.com/1' },
            event: [{
              listen: 'test',
              script: {
                exec: ['tests["Status code is 200"] = responseCode.code === 200;']
              }
            }]
          }
        ]
      };

      const collection2 = {
        info: {
          name: 'Collection 2',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Request 2',
            request: { method: 'POST', url: 'https://api.example.com/2' },
            event: [{
              listen: 'prerequest',
              script: {
                exec: ['postman.getGlobalVariable("apiKey");']
              }
            }]
          }
        ]
      };

      const file1 = createTestFile('collection1.json', collection1);
      const file2 = createTestFile('collection2.json', collection2);

      const config = {
        preprocess: [
          {
            name: 'fix-tests-syntax',
            description: 'Fix old tests[] syntax',
            pattern: 'tests\\[(.*?)\\]\\s*=\\s*(.*?);',
            replacement: 'pm.test($1, function() { pm.expect($2).to.be.true; });',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-getGlobalVariable',
            description: 'Fix deprecated getGlobalVariable',
            pattern: 'postman\\.getGlobalVariable\\((.*?)\\)',
            replacement: 'pm.globals.get($1)',
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

      const result = await convertPostmanToInsomnia([file1, file2], options);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);

      // Verify both files were processed correctly
      result.outputs.forEach(outputFile => {
        const content = fs.readFileSync(outputFile, 'utf8');
        const parsed = yaml.load(content) as any;

        const request = parsed.collection[0];

        if (request.scripts.afterResponse) {
          expect(request.scripts.afterResponse).toContain('insomnia.test');
          expect(request.scripts.afterResponse).not.toContain('tests[');
        }

        if (request.scripts.preRequest) {
          expect(request.scripts.preRequest).toContain('insomnia.globals.get');
          expect(request.scripts.preRequest).not.toContain('postman.getGlobalVariable');
        }
      });
    });
  });

  // ==========================================================================
  // END-TO-END POSTPROCESSING TESTS
  // ==========================================================================

  describe('End-to-End Postprocessing', () => {
    test('should postprocess Insomnia API differences after conversion', async () => {
      const collection = {
        info: {
          name: 'API Differences Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Header Test Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/headers'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Script that will cause issues in Insomnia without postprocessing',
                    'if (pm.response.headers.get("Content-Type") && pm.response.headers.get("Content-Type").includes("json")) {',
                    '  const contentLength = pm.response.headers.get("Content-Length").toLowerCase();',
                    '  pm.test("Content type check", function() {',
                    '    pm.expect(pm.response.headers.get("Accept") === "application/json").to.be.true;',
                    '  });',
                    '}'
                  ]
                }
              }
            ]
          }
        ]
      };

      const inputFile = createTestFile('api-differences.json', collection);

      const config = {
        preprocess: [],
        postprocess: [
          {
            name: 'fix-header-includes',
            description: 'Fix header.includes() method',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
            replacement: 'insomnia.response.headers.get($1).value.includes(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-methods',
            description: 'Fix header string methods',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.(toLowerCase|toUpperCase|trim)\\(',
            replacement: 'insomnia.response.headers.get($1).value.$2(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-comparisons',
            description: 'Fix header string comparisons',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==|==|!=)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
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

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);

      // Verify postprocessing fixed the API differences
      const outputFile = result.outputs[0];
      const content = fs.readFileSync(outputFile, 'utf8');
      const parsed = yaml.load(content) as any;

      const testScript = parsed.collection[0].scripts.afterResponse;

      // Should have fixed all the header access patterns
      expect(testScript).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(testScript).toContain('insomnia.response.headers.get("Content-Length").value.toLowerCase()');
      expect(testScript).toContain('insomnia.response.headers.get("Accept").value === "application/json"');

      // Should not contain the problematic patterns
      expect(testScript).not.toMatch(/insomnia\.response\.headers\.get\([^)]+\)\.includes\(/);
      expect(testScript).not.toMatch(/insomnia\.response\.headers\.get\([^)]+\)\.toLowerCase\(/);
      expect(testScript).not.toMatch(/insomnia\.response\.headers\.get\([^)]+\)\s*===/);
    });

    test('should handle complex conditional header access patterns', async () => {
      const collection = {
        info: {
          name: 'Complex Conditionals',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Complex Conditional Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/complex'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Complex conditional that needs careful postprocessing',
                    'if (pm.response.headers.get("Content-Type") && pm.response.headers.get("Content-Type").includes("application/json")) {',
                    '  const hasAuth = pm.response.headers.get("Authorization") && pm.response.headers.get("Authorization").startsWith("Bearer");',
                    '  if (hasAuth && pm.response.headers.get("Cache-Control").match(/no-cache/)) {',
                    '    console.log("Complex condition met");',
                    '  }',
                    '}'
                  ]
                }
              }
            ]
          }
        ]
      };

      const inputFile = createTestFile('complex-conditionals.json', collection);

      const config = {
        preprocess: [],
        postprocess: [
          {
            name: 'fix-header-conditional-access',
            description: 'Fix header access in conditionals',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*&&\\s*insomnia\\.response\\.headers\\.get\\(\\1\\)\\.(?!value\\b)(\\w+)',
            replacement: 'insomnia.response.headers.get($1) && insomnia.response.headers.get($1).value.$2',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-single-methods',
            description: 'Fix single header method calls',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.(?!value\\b)(includes|startsWith|match)\\(',
            replacement: 'insomnia.response.headers.get($1).value.$2(',
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

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);

      const outputContent = fs.readFileSync(result.outputs[0], 'utf8');
      const parsed = yaml.load(outputContent) as any;
      const testScript = parsed.collection[0].scripts.afterResponse;

      // Should fix conditional patterns correctly
      expect(testScript).toContain('insomnia.response.headers.get("Content-Type") && insomnia.response.headers.get("Content-Type").value.includes("application/json")');
      expect(testScript).toContain('insomnia.response.headers.get("Authorization") && insomnia.response.headers.get("Authorization").value.startsWith("Bearer")');
      expect(testScript).toContain('insomnia.response.headers.get("Cache-Control").value.match(/no-cache/)');
    });
  });

  // ==========================================================================
  // COMBINED PREPROCESSING AND POSTPROCESSING TESTS
  // ==========================================================================

  describe('Combined Pre and Post Processing', () => {
    test('should apply both preprocessing and postprocessing in full pipeline', async () => {
      const collection = {
        info: {
          name: 'Full Pipeline Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Full Pipeline Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/full'
            },
            event: [
              {
                listen: 'prerequest',
                script: {
                  exec: [
                    '// Old syntax that needs preprocessing',
                    'postman.setGlobalVariable("timestamp", Date.now());',
                    'if (pm.responseHeaders["X-Rate-Limit"]) {',
                    '  console.log("Rate limit header found");',
                    '}'
                  ]
                }
              },
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Script that will need postprocessing after pm->insomnia conversion',
                    'pm.test("Full pipeline test", function() {',
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

      const inputFile = createTestFile('full-pipeline.json', collection);

      const config = {
        preprocess: [
          {
            name: 'fix-setGlobalVariable',
            description: 'Fix deprecated setGlobalVariable',
            pattern: 'postman\\.setGlobalVariable\\((.*?)\\)',
            replacement: 'pm.globals.set($1)',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-responseHeaders-array',
            description: 'Fix responseHeaders array access',
            pattern: 'pm\\.responseHeaders\\[(.*?)\\]',
            replacement: 'pm.response.headers.get($1)',
            flags: 'g',
            enabled: true
          }
        ],
        postprocess: [
          {
            name: 'fix-header-includes',
            description: 'Fix header includes method',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
            replacement: 'insomnia.response.headers.get($1).value.includes(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-comparisons',
            description: 'Fix header comparisons',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
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
        preprocess: true,
        postprocess: true,
        configFile: configFile
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);

      const outputContent = fs.readFileSync(result.outputs[0], 'utf8');
      const parsed = yaml.load(outputContent) as any;

      const preRequestScript = parsed.collection[0].scripts.preRequest;
      const testScript = parsed.collection[0].scripts.afterResponse;

      // Verify preprocessing worked (postman syntax -> pm syntax)
      expect(preRequestScript).toContain('insomnia.globals.set'); // pm.globals -> insomnia.globals
      expect(preRequestScript).toContain('insomnia.response.headers.get("X-Rate-Limit")');
      expect(preRequestScript).not.toContain('postman.setGlobalVariable');
      expect(preRequestScript).not.toContain('pm.responseHeaders[');

      // Verify postprocessing worked (insomnia API fixes)
      expect(testScript).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(testScript).toContain('insomnia.response.headers.get("Status").value === "success"');
      expect(testScript).not.toMatch(/insomnia\.response\.headers\.get\([^)]+\)\.includes\(/);
    });

    test('should handle mixed legacy and modern syntax in same collection', async () => {
      const collection = {
        info: {
          name: 'Mixed Syntax Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Legacy Request',
            request: { method: 'GET', url: 'https://api.example.com/legacy' },
            event: [{
              listen: 'test',
              script: {
                exec: [
                  '// Mix of old and new syntax',
                  'tests["Response time OK"] = pm.response.responseTime < 1000;',
                  'if (pm.response.headers.get("Content-Type").includes("json")) {',
                  '  postman.setEnvironmentVariable("lastResponse", responseBody);',
                  '}'
                ]
              }
            }]
          },
          {
            name: 'Modern Request',
            request: { method: 'POST', url: 'https://api.example.com/modern' },
            event: [{
              listen: 'test',
              script: {
                exec: [
                  '// Modern syntax that still needs postprocessing',
                  'pm.test("Modern test", function() {',
                  '  pm.expect(pm.response.headers.get("Status") === "OK").to.be.true;',
                  '  pm.expect(pm.response.headers.get("Version").startsWith("v2")).to.be.true;',
                  '});'
                ]
              }
            }]
          }
        ]
      };

      const inputFile = createTestFile('mixed-syntax.json', collection);

      const config = {
        preprocess: [
          {
            name: 'fix-old-tests',
            description: 'Fix old tests[] syntax',
            pattern: 'tests\\[(.*?)\\]\\s*=\\s*(.*?);',
            replacement: 'pm.test($1, function() { pm.expect($2).to.be.true; });',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-setEnvironmentVariable',
            description: 'Fix setEnvironmentVariable',
            pattern: 'postman\\.setEnvironmentVariable\\((.*?)\\)',
            replacement: 'pm.environment.set($1)',
            flags: 'g',
            enabled: true
          }
        ],
        postprocess: [
          {
            name: 'fix-all-header-methods',
            description: 'Fix all header method calls',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.(?!value\\b)(includes|startsWith|===|!==)',
            replacement: 'insomnia.response.headers.get($1).value.$2',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-comparisons-alt',
            description: 'Fix header comparisons alternative pattern',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
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
        preprocess: true,
        postprocess: true,
        configFile: configFile
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);

      const outputContent = fs.readFileSync(result.outputs[0], 'utf8');
      const parsed = yaml.load(outputContent) as any;

      // Both requests should be properly transformed
      const requests = parsed.collection;
      expect(requests).toHaveLength(2);

      requests.forEach((request: any) => {
        const script = request.scripts.afterResponse;

        // Should not contain old syntax
        expect(script).not.toContain('tests[');
        expect(script).not.toContain('postman.setEnvironmentVariable');

        // Should contain proper insomnia syntax
        expect(script).toContain('insomnia.test');
        if (script.includes('headers.get')) {
          expect(script).toMatch(/insomnia\.response\.headers\.get\([^)]+\)\.value\./);
        }
      });
    });
  });

  // ==========================================================================
  // ERROR HANDLING AND EDGE CASES IN INTEGRATION
  // ==========================================================================

  describe('Integration Error Handling', () => {
    test('should gracefully handle invalid transform config during conversion', async () => {
      const collection = {
        info: {
          name: 'Error Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Simple Request',
            request: { method: 'GET', url: 'https://api.example.com/simple' }
          }
        ]
      };

      const inputFile = createTestFile('error-test.json', collection);

      // Create config with invalid regex
      const config = {
        preprocess: [
          {
            name: 'invalid-regex',
            description: 'Invalid regex pattern',
            pattern: '[invalid-regex(',
            replacement: 'replacement',
            flags: 'g',
            enabled: true
          }
        ],
        postprocess: []
      };

      const configFile = createConfigFile(config);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true,
        configFile: configFile
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      // Should still succeed despite invalid regex
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    test('should handle missing config file gracefully', async () => {
      const collection = {
        info: {
          name: 'Missing Config Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Simple Request',
            request: { method: 'GET', url: 'https://api.example.com/missing-config' }
          }
        ]
      };

      const inputFile = createTestFile('missing-config.json', collection);
      const nonExistentConfig = path.join(tempDir, 'non-existent-config.json');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true,
        configFile: nonExistentConfig
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      // Should fall back to defaults and succeed
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);

      consoleSpy.mockRestore();
    });

    test('should handle collections with no scripts gracefully', async () => {
      const collection = {
        info: {
          name: 'No Scripts Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'No Script Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/no-scripts',
              header: [
                { key: 'Accept', value: 'application/json' }
              ]
            }
            // No event scripts
          }
        ]
      };

      const inputFile = createTestFile('no-scripts.json', collection);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true,
        postprocess: true
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);

      // Should still create valid output
      const outputContent = fs.readFileSync(result.outputs[0], 'utf8');
      const parsed = yaml.load(outputContent) as any;

      expect(parsed.type).toBe('collection.insomnia.rest/5.0');
      expect(parsed.collection).toHaveLength(1);
    });
  });

  // ==========================================================================
  // PERFORMANCE AND SCALE INTEGRATION TESTS
  // ==========================================================================

  describe('Performance and Scale Integration', () => {
    test('should handle large collections with many scripts efficiently', async () => {
      // Create a large collection with many scripts
      const largeCollection = {
        info: {
          name: 'Large Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [] as any[]
      };

      // Generate 50 requests with scripts (reduced for test performance)
      for (let i = 0; i < 50; i++) {
        largeCollection.item.push({
          name: `Request ${i}`,
          request: {
            method: 'GET',
            url: `https://api.example.com/endpoint-${i}`
          },
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  `// Test script for request ${i}`,
                  'if (pm.response.headers.get("Content-Type").includes("json")) {',
                  '  pm.test("JSON response", function() {',
                  '    pm.expect(pm.response.headers.get("Status") === "success").to.be.true;',
                  '  });',
                  '}',
                  `console.log("Request ${i} completed");`
                ]
              }
            }
          ]
        });
      }

      const inputFile = createTestFile('large-collection.json', largeCollection);

      const config = {
        preprocess: [],
        postprocess: [
          {
            name: 'fix-header-includes',
            description: 'Fix header includes',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
            replacement: 'insomnia.response.headers.get($1).value.includes(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-comparisons',
            description: 'Fix header comparisons',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
            flags: 'g',
            enabled: true
          }
        ]
      };

      const configFile = createConfigFile(config);

      const startTime = Date.now();

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        postprocess: true,
        configFile: configFile
      };

      const result = await convertPostmanToInsomnia([inputFile], options);
      const endTime = Date.now();

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all scripts were processed correctly
      const outputContent = fs.readFileSync(result.outputs[0], 'utf8');
      const parsed = yaml.load(outputContent) as any;

      expect(parsed.collection).toHaveLength(50);

      // Sample a few requests to verify transformation
      const sampleRequests = parsed.collection.slice(0, 5);
      sampleRequests.forEach((request: any) => {
        const script = request.scripts.afterResponse;
        expect(script).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
        expect(script).toContain('insomnia.response.headers.get("Status").value === "success"');
      });
    });

    test('should handle batch processing with transforms efficiently', async () => {
      // Create multiple collections for batch processing
      const collections = [];
      const inputFiles = [];

      for (let i = 0; i < 5; i++) {
        const collection = {
          info: {
            name: `Batch Collection ${i}`,
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
          },
          item: [
            {
              name: `Batch Request ${i}`,
              request: {
                method: 'GET',
                url: `https://api.example.com/batch-${i}`
              },
              event: [
                {
                  listen: 'test',
                  script: {
                    exec: [
                      `// Batch test ${i}`,
                      'postman.setEnvironmentVariable("batchId", "' + i + '");',
                      'if (pm.response.headers.get("X-Batch-Status").includes("success")) {',
                      '  pm.test("Batch success", function() {',
                      '    pm.expect(pm.response.headers.get("X-Batch-Id") === "' + i + '").to.be.true;',
                      '  });',
                      '}'
                    ]
                  }
                }
              ]
            }
          ]
        };

        collections.push(collection);
        inputFiles.push(createTestFile(`batch-${i}.json`, collection));
      }

      const config = {
        preprocess: [
          {
            name: 'fix-setEnvironmentVariable',
            description: 'Fix setEnvironmentVariable',
            pattern: 'postman\\.setEnvironmentVariable\\((.*?)\\)',
            replacement: 'pm.environment.set($1)',
            flags: 'g',
            enabled: true
          }
        ],
        postprocess: [
          {
            name: 'fix-header-includes',
            description: 'Fix header includes',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
            replacement: 'insomnia.response.headers.get($1).value.includes(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-comparisons',
            description: 'Fix header comparisons',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
            flags: 'g',
            enabled: true
          }
        ]
      };

      const configFile = createConfigFile(config);

      const startTime = Date.now();

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: false,
        preprocess: true,
        postprocess: true,
        configFile: configFile
      };

      const result = await convertPostmanToInsomnia(inputFiles, options);
      const endTime = Date.now();

      expect(result.successful).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.outputs).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds

      // Verify all files were processed correctly
      result.outputs.forEach((outputFile, index) => {
        const content = fs.readFileSync(outputFile, 'utf8');
        const parsed = yaml.load(content) as any;

        const script = parsed.collection[0].scripts.afterResponse;

        // Should have applied preprocessing
        expect(script).toContain('insomnia.environment.set');
        expect(script).not.toContain('postman.setEnvironmentVariable');

        // Should have applied postprocessing
        expect(script).toContain('insomnia.response.headers.get("X-Batch-Status").value.includes("success")');
        expect(script).toContain(`insomnia.response.headers.get("X-Batch-Id").value === "${index}"`);
      });
    });
  });

  // ==========================================================================
  // REAL-WORLD SCENARIO INTEGRATION TESTS
  // ==========================================================================

  describe('Real-World Scenario Integration', () => {
    test('should handle enterprise API collection with complex authentication and scripts', async () => {
      const enterpriseCollection = {
        info: {
          name: 'Enterprise API Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        auth: {
          type: 'bearer',
          bearer: [
            { key: 'token', value: '{{bearerToken}}' }
          ]
        },
        item: [
          {
            name: 'Authentication',
            item: [
              {
                name: 'Login',
                request: {
                  method: 'POST',
                  url: 'https://enterprise-api.example.com/auth/login',
                  body: {
                    mode: 'raw',
                    raw: JSON.stringify({
                      username: '{{username}}',
                      password: '{{password}}'
                    }),
                    options: {
                      raw: { language: 'json' }
                    }
                  }
                },
                event: [
                  {
                    listen: 'test',
                    script: {
                      exec: [
                        '// Enterprise authentication script with legacy syntax',
                        'if (pm.responseHeaders["Content-Type"] && pm.responseHeaders["Content-Type"].includes("json")) {',
                        '  const jsonData = pm.response.json();',
                        '  if (jsonData.token) {',
                        '    postman.setEnvironmentVariable("bearerToken", jsonData.token);',
                        '    postman.setGlobalVariable("lastLoginTime", Date.now());',
                        '  }',
                        '}',
                        'tests["Login successful"] = pm.response.code === 200;'
                      ]
                    }
                  }
                ]
              }
            ]
          },
          {
            name: 'User Management',
            item: [
              {
                name: 'Get User Profile',
                request: {
                  method: 'GET',
                  url: 'https://enterprise-api.example.com/users/profile',
                  header: [
                    { key: 'Authorization', value: 'Bearer {{bearerToken}}' }
                  ]
                },
                event: [
                  {
                    listen: 'test',
                    script: {
                      exec: [
                        '// Modern script that needs postprocessing',
                        'pm.test("Profile retrieval", function() {',
                        '  if (pm.response.headers.get("Content-Type") && pm.response.headers.get("Content-Type").includes("json")) {',
                        '    const profile = pm.response.json();',
                        '    pm.expect(profile.id).to.exist;',
                        '    pm.expect(pm.response.headers.get("X-User-Role") === "admin").to.be.true;',
                        '  }',
                        '});'
                      ]
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      const inputFile = createTestFile('enterprise-api.json', enterpriseCollection);

      const config = {
        preprocess: [
          {
            name: 'fix-responseHeaders-legacy',
            description: 'Fix legacy responseHeaders access',
            pattern: 'pm\\.responseHeaders\\[(.*?)\\]',
            replacement: 'pm.response.headers.get($1)',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-setEnvironmentVariable',
            description: 'Fix setEnvironmentVariable calls',
            pattern: 'postman\\.setEnvironmentVariable\\((.*?)\\)',
            replacement: 'pm.environment.set($1)',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-setGlobalVariable',
            description: 'Fix setGlobalVariable calls',
            pattern: 'postman\\.setGlobalVariable\\((.*?)\\)',
            replacement: 'pm.globals.set($1)',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-tests-syntax',
            description: 'Fix legacy tests syntax',
            pattern: 'tests\\[(.*?)\\]\\s*=\\s*(.*?);',
            replacement: 'pm.test($1, function() { pm.expect($2).to.be.true; });',
            flags: 'g',
            enabled: true
          }
        ],
        postprocess: [
          {
            name: 'fix-header-conditionals',
            description: 'Fix header access in conditionals',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*&&\\s*insomnia\\.response\\.headers\\.get\\(\\1\\)\\.(?!value\\b)(\\w+)',
            replacement: 'insomnia.response.headers.get($1) && insomnia.response.headers.get($1).value.$2',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-comparisons',
            description: 'Fix header string comparisons',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
            flags: 'g',
            enabled: true
          }
        ]
      };

      const configFile = createConfigFile(config);

      const options: ConversionOptions = {
        outputDir: tempDir,
        format: 'yaml',
        verbose: true,
        preprocess: true,
        postprocess: true,
        configFile: configFile
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);

      const outputContent = fs.readFileSync(result.outputs[0], 'utf8');
      const parsed = yaml.load(outputContent) as any;

      // Verify structure is preserved
      expect(parsed.type).toBe('collection.insomnia.rest/5.0');
      expect(parsed.collection).toHaveLength(2); // Authentication and User Management folders

      // Find the login request and verify preprocessing
      const authFolder = parsed.collection.find((item: any) => item.name === 'Authentication');
      expect(authFolder).toBeTruthy();
      expect(authFolder.children).toHaveLength(1);

      const loginRequest = authFolder.children[0];
      const loginScript = loginRequest.scripts.afterResponse;

      // Should have preprocessed legacy syntax
      expect(loginScript).toContain('insomnia.response.headers.get("Content-Type")');
      expect(loginScript).toContain('insomnia.environment.set("bearerToken"');
      expect(loginScript).toContain('insomnia.globals.set("lastLoginTime"');
      expect(loginScript).toContain('insomnia.test("Login successful"');
      expect(loginScript).not.toContain('pm.responseHeaders[');
      expect(loginScript).not.toContain('postman.setEnvironmentVariable');
      expect(loginScript).not.toContain('tests[');

      // Find the profile request and verify postprocessing
      const userFolder = parsed.collection.find((item: any) => item.name === 'User Management');
      const profileRequest = userFolder.children[0];
      const profileScript = profileRequest.scripts.afterResponse;

      // Should have postprocessed API differences
      expect(profileScript).toContain('insomnia.response.headers.get("Content-Type") && insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(profileScript).toContain('insomnia.response.headers.get("X-User-Role").value === "admin"');
    });

    test('should handle microservices collection with different patterns per service', async () => {
      const microservicesCollection = {
        info: {
          name: 'Microservices Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'User Service (Legacy)',
            item: [
              {
                name: 'Get Users',
                request: { method: 'GET', url: 'https://user-service.example.com/users' },
                event: [{
                  listen: 'test',
                  script: {
                    exec: [
                      '// Legacy user service patterns',
                      'tests["Status OK"] = responseCode.code === 200;',
                      'if (pm.responseHeaders["X-Total-Count"]) {',
                      '  postman.setEnvironmentVariable("userCount", pm.responseHeaders["X-Total-Count"]);',
                      '}'
                    ]
                  }
                }]
              }
            ]
          },
          {
            name: 'Order Service (Modern)',
            item: [
              {
                name: 'Create Order',
                request: { method: 'POST', url: 'https://order-service.example.com/orders' },
                event: [{
                  listen: 'test',
                  script: {
                    exec: [
                      '// Modern order service patterns',
                      'pm.test("Order created", function() {',
                      '  if (pm.response.headers.get("Content-Type").includes("json")) {',
                      '    const order = pm.response.json();',
                      '    pm.expect(order.id).to.exist;',
                      '    pm.expect(pm.response.headers.get("Location").startsWith("/orders/")).to.be.true;',
                      '  }',
                      '});'
                    ]
                  }
                }]
              }
            ]
          },
          {
            name: 'Payment Service (Mixed)',
            item: [
              {
                name: 'Process Payment',
                request: { method: 'POST', url: 'https://payment-service.example.com/payments' },
                event: [{
                  listen: 'test',
                  script: {
                    exec: [
                      '// Mixed patterns in payment service',
                      'tests["Payment processed"] = pm.response.code === 201;',
                      'pm.test("Payment response", function() {',
                      '  if (pm.response.headers.get("X-Transaction-Status") === "completed") {',
                      '    pm.expect(pm.response.headers.get("X-Payment-Method").toLowerCase()).to.include("card");',
                      '  }',
                      '});'
                    ]
                  }
                }]
              }
            ]
          }
        ]
      };

      const inputFile = createTestFile('microservices.json', microservicesCollection);

      const config = {
        preprocess: [
          {
            name: 'fix-responseCode',
            description: 'Fix responseCode references',
            pattern: 'responseCode\\.code',
            replacement: 'pm.response.code',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-responseHeaders-array',
            description: 'Fix responseHeaders array access',
            pattern: 'pm\\.responseHeaders\\[(.*?)\\]',
            replacement: 'pm.response.headers.get($1)',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-setEnvironmentVariable',
            description: 'Fix setEnvironmentVariable',
            pattern: 'postman\\.setEnvironmentVariable\\((.*?)\\)',
            replacement: 'pm.environment.set($1)',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-tests-syntax',
            description: 'Fix tests[] syntax',
            pattern: 'tests\\[(.*?)\\]\\s*=\\s*(.*?);',
            replacement: 'pm.test($1, function() { pm.expect($2).to.be.true; });',
            flags: 'g',
            enabled: true
          }
        ],
        postprocess: [
          {
            name: 'fix-header-includes',
            description: 'Fix header includes',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
            replacement: 'insomnia.response.headers.get($1).value.includes(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-comparisons',
            description: 'Fix header comparisons',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-methods',
            description: 'Fix header string methods',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.(toLowerCase|startsWith|include)\\(',
            replacement: 'insomnia.response.headers.get($1).value.$2(',
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
        preprocess: true,
        postprocess: true,
        configFile: configFile
      };

      const result = await convertPostmanToInsomnia([inputFile], options);

      expect(result.successful).toBe(1);

      const outputContent = fs.readFileSync(result.outputs[0], 'utf8');
      const parsed = yaml.load(outputContent) as any;

      expect(parsed.collection).toHaveLength(3); // Three services

      // Verify each service was transformed correctly
      const services = parsed.collection;

      // User Service (Legacy) - should have all legacy patterns fixed
      const userService = services.find((s: any) => s.name === 'User Service (Legacy)');
      const userScript = userService.children[0].scripts.afterResponse;
      expect(userScript).toContain('insomnia.test("Status OK"');
      expect(userScript).toContain('insomnia.response.headers.get("X-Total-Count")');
      expect(userScript).toContain('insomnia.environment.set("userCount"');

      // Order Service (Modern) - should have API differences fixed
      const orderService = services.find((s: any) => s.name === 'Order Service (Modern)');
      const orderScript = orderService.children[0].scripts.afterResponse;
      expect(orderScript).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(orderScript).toContain('insomnia.response.headers.get("Location").value.startsWith("/orders/")');

      // Payment Service (Mixed) - should have both types of fixes
      const paymentService = services.find((s: any) => s.name === 'Payment Service (Mixed)');
      const paymentScript = paymentService.children[0].scripts.afterResponse;
      expect(paymentScript).toContain('insomnia.test("Payment processed"');
      expect(paymentScript).toContain('insomnia.response.headers.get("X-Transaction-Status").value === "completed"');
      expect(paymentScript).toContain('insomnia.response.headers.get("X-Payment-Method").value.toLowerCase()');
    });
  });
});
