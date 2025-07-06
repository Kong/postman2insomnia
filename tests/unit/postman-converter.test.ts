// =============================================================================
// POSTMAN CONVERTER TESTS
// =============================================================================

import {
  convert,
  transformPostmanToNunjucksString,
  translateHandlersInScript,
  normaliseJsonPath,
  ImportPostman
} from '../../src/postman-converter';
import type { ImportRequest } from '../../src/types/entities';
import { TransformEngine } from '../../src/transform-engine';

describe('PostmanConverter', () => {
  // ==========================================================================
  // TEST DATA FIXTURES
  // ==========================================================================

  const createSimpleV21Collection = (name = 'Test Collection') => ({
    info: {
      name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _postman_id: 'test-collection-id'
    },
    item: [
      {
        name: 'Simple GET Request',
        request: {
          method: 'GET',
          url: 'https://api.example.com/users',
          header: [
            { key: 'Accept', value: 'application/json' }
          ]
        }
      }
    ]
  });

  const createComplexV21Collection = () => ({
    info: {
      name: 'Complex Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      {
        name: 'Users Folder',
        item: [
          {
            name: 'Get User',
            request: {
              method: 'GET',
              url: {
                raw: 'https://api.example.com/users/{{userId}}',
                host: ['api', 'example', 'com'],
                path: ['users', '{{userId}}'],
                query: [
                  { key: 'include', value: 'profile' },
                  { key: 'debug', value: 'true', disabled: true }
                ]
              },
              header: [
                { key: 'Authorization', value: 'Bearer {{token}}' }
              ],
              auth: {
                type: 'bearer',
                bearer: [
                  { key: 'token', value: '{{bearerToken}}' }
                ]
              }
            },
            event: [
              {
                listen: 'prerequest',
                script: {
                  exec: [
                    'pm.environment.set("timestamp", Date.now());',
                    'console.log("Pre-request script executed");'
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  });

  // ==========================================================================
  // UUID GENERATION TESTS (CRITICAL - RECENT FIX)
  // ==========================================================================

  describe('UUID Generation', () => {
    test('should generate unique IDs for requests across multiple conversions', () => {
      const collection1 = createSimpleV21Collection('Collection 1');
      const collection2 = createSimpleV21Collection('Collection 2');

      const rawData1 = JSON.stringify(collection1);
      const rawData2 = JSON.stringify(collection2);

      const result1 = convert(rawData1) as ImportRequest[];
      const result2 = convert(rawData2) as ImportRequest[];

      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();

      // Extract all IDs from both conversions
      const ids1 = result1.map(item => item._id).filter(Boolean);
      const ids2 = result2.map(item => item._id).filter(Boolean);

      // Verify no ID collisions between conversions
      const allIds = [...ids1, ...ids2];
      const uniqueIds = new Set(allIds);

      expect(uniqueIds.size).toBe(allIds.length);
    });

    test('should generate proper UUID format for requests', () => {
      const collection = createSimpleV21Collection();
      const result = convert(JSON.stringify(collection)) as ImportRequest[];

      const requestItems = result.filter(item => item._type === 'request');

      requestItems.forEach(item => {
        expect(item._id).toMatch(/^req_[a-f0-9]{32}$/);
      });
    });

    test('should generate proper UUID format for folders', () => {
      const collection = createComplexV21Collection();
      const result = convert(JSON.stringify(collection)) as ImportRequest[];

      const folderItems = result.filter(item => item._type === 'request_group');

      folderItems.forEach(item => {
        expect(item._id).toMatch(/^fld_[a-f0-9]{32}$/);
      });
    });
  });

  // ==========================================================================
  // SCHEMA VERSION SUPPORT
  // ==========================================================================

  describe('Schema Version Support', () => {
    test('should convert Postman v2.1 collections', () => {
      const collection = createSimpleV21Collection();
      const result = convert(JSON.stringify(collection));

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);
      expect((result as ImportRequest[]).length).toBeGreaterThan(0);
    });

    test('should reject unsupported schema versions', () => {
      const invalidCollection = {
        info: {
          name: 'Invalid Collection',
          schema: 'https://schema.getpostman.com/json/collection/v1.0.0/collection.json'
        },
        item: []
      };

      const result = convert(JSON.stringify(invalidCollection));
      expect(result).toBeNull();
    });

    test('should handle malformed JSON gracefully', () => {
      // Mock console.error to suppress expected error output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = convert('{ invalid json }');
      expect(result).toBeNull();

      // Restore console.error
      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // COLLECTION STRUCTURE CONVERSION
  // ==========================================================================

  describe('Collection Structure', () => {
    test('should create collection folder as root request group', () => {
      const collection = createSimpleV21Collection('My API');
      const result = convert(JSON.stringify(collection)) as ImportRequest[];

      const rootFolder = result.find(item =>
        item._type === 'request_group' &&
        item.parentId === '__WORKSPACE_ID__'
      );

      expect(rootFolder).toBeTruthy();
      expect(rootFolder!.name).toBe('My API');
    });

    test('should preserve nested folder hierarchy', () => {
      const collection = createComplexV21Collection();
      const result = convert(JSON.stringify(collection)) as ImportRequest[];

      // Find root collection folder
      const rootFolder = result.find(item =>
        item._type === 'request_group' &&
        item.parentId === '__WORKSPACE_ID__'
      );

      // Find Users folder (should be child of root)
      const usersFolder = result.find(item =>
        item._type === 'request_group' &&
        item.name === 'Users Folder'
      );

      expect(rootFolder).toBeTruthy();
      expect(usersFolder).toBeTruthy();
      expect(usersFolder!.parentId).toBe(rootFolder!._id);
    });
  });

  // ==========================================================================
  // REQUEST CONVERSION
  // ==========================================================================

  describe('Request Conversion', () => {
    test('should convert basic request properties', () => {
      const collection = createSimpleV21Collection();
      const result = convert(JSON.stringify(collection)) as ImportRequest[];

      const request = result.find(item => item._type === 'request');

      expect(request).toBeTruthy();
      expect(request!.name).toBe('Simple GET Request');
      expect(request!.method).toBe('GET');
      expect(request!.url).toBe('https://api.example.com/users');
    });

    test('should convert headers correctly', () => {
      const collection = createSimpleV21Collection();
      const result = convert(JSON.stringify(collection)) as ImportRequest[];

      const request = result.find(item => item._type === 'request');

      expect(request!.headers).toBeTruthy();
      expect(request!.headers).toHaveLength(1);
      expect(request!.headers![0]).toEqual({
        name: 'Accept',
        value: 'application/json'
      });
    });

    test('should handle string URLs correctly', () => {
      const collection = {
        info: {
          name: 'String URL Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'String URL Request',
            request: 'https://api.example.com/simple'
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request).toBeTruthy();
      expect(request!.method).toBe('GET');
      expect(request!.url).toBe('https://api.example.com/simple');
    });
  });

  // ==========================================================================
  // UTILITY FUNCTION TESTS
  // ==========================================================================

  describe('Utility Functions', () => {
    describe('transformPostmanToNunjucksString', () => {
      test('should convert Postman variables to Nunjucks format', () => {
        const input = 'Hello {{username}}, your ID is {{userId}}';
        const result = transformPostmanToNunjucksString(input);

        expect(result).toBe('Hello {{username}}, your ID is {{userId}}');
      });

      test('should handle variables with hyphens', () => {
        const input = '{{api-key}}';
        const result = transformPostmanToNunjucksString(input);

        expect(result).toBe("{{_['api-key']}}");
      });

      test('should handle null/undefined input', () => {
        expect(transformPostmanToNunjucksString(null)).toBe('');
        expect(transformPostmanToNunjucksString(undefined)).toBe('');
        expect(transformPostmanToNunjucksString('')).toBe('');
      });
    });

    describe('normaliseJsonPath', () => {
      test('should handle paths with hyphens correctly', () => {
        const input = '{{user-name}}';
        const result = normaliseJsonPath(input);
        expect(result).toBe("{{_['user-name']}}");
      });

      test('should leave normal paths unchanged', () => {
        const input = '{{userName}}';
        const result = normaliseJsonPath(input);
        expect(result).toBe('{{userName}}');
      });

      test('should handle empty input', () => {
        expect(normaliseJsonPath('')).toBe('');
        expect(normaliseJsonPath(undefined)).toBe('');
      });
    });

    describe('translateHandlersInScript', () => {
      test('should convert pm.* to insomnia.*', () => {
        const script = `
          pm.environment.set("token", response.token);
          pm.test("Status code is 200", function () {
            pm.response.to.have.status(200);
          });
        `;

        const result = translateHandlersInScript(script);

        expect(result).toContain('insomnia.environment.set');
        expect(result).toContain('insomnia.test');
        expect(result).toContain('insomnia.response.to.have.status');
        expect(result).not.toContain('pm.environment');
        expect(result).not.toContain('pm.test');
        expect(result).not.toContain('pm.response');
      });

      test('should handle empty scripts', () => {
        expect(translateHandlersInScript('')).toBe('');
      });
    });
  });

  // ==========================================================================
  // IMPORTPOSTMAN CLASS TESTS
  // ==========================================================================

  describe('ImportPostman Class', () => {
    test('should create ImportPostman instance', () => {
      const collection = createSimpleV21Collection();
      const rawData = JSON.stringify(collection);
      const importer = new ImportPostman(collection, rawData);

      expect(importer).toBeInstanceOf(ImportPostman);
      expect(importer.collection).toEqual(collection);
    });

    test('should have importCollection method', () => {
      const collection = createSimpleV21Collection();
      const rawData = JSON.stringify(collection);
      const importer = new ImportPostman(collection, rawData);

      expect(typeof importer.importCollection).toBe('function');

      const result = importer.importCollection();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // ERROR HANDLING AND EDGE CASES
  // ==========================================================================

  describe('Error Handling', () => {
    test('should handle collections with no items', () => {
      const collection = {
        info: {
          name: 'Empty Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];

      expect(result).toBeTruthy();
      expect(result.length).toBe(1); // Should still create root folder

      const rootFolder = result.find(item =>
        item._type === 'request_group' &&
        item.parentId === '__WORKSPACE_ID__'
      );

      expect(rootFolder).toBeTruthy();
    });

    test('should handle requests with minimal data', () => {
      const collection = {
        info: {
          name: 'Minimal Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Minimal Request',
            request: {}
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request).toBeTruthy();
      expect(request!.method).toBe('GET'); // Default method
      expect(request!.url).toBe(''); // Default URL
    });
  });
});

describe('Transform Engine Integration in PostmanConverter', () => {
  // ==========================================================================
  // ENHANCED SCRIPT TRANSFORMATION TESTS
  // ==========================================================================

  describe('Enhanced Script Transformation', () => {
    test('should use transform engine for script processing when provided', () => {
      const collection = {
        info: {
          name: 'Transform Engine Script Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Transform Script Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/transform-script'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Test script that should be postprocessed',
                    'if (pm.response.headers.get("Content-Type").includes("json")) {',
                    '  pm.expect(pm.response.headers.get("Status") === "success").to.be.true;',
                    '}'
                  ]
                }
              }
            ]
          }
        ]
      };

      // Create transform engine with postprocessing rules
      const transformEngine = new TransformEngine({
        preprocess: [],
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
      });

      const rawData = JSON.stringify(collection);

      // Test the enhanced convert function that accepts transform engine
      const result = convert(rawData, transformEngine) as ImportRequest[];

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);

      const request = result.find(item => item._type === 'request');
      expect(request).toBeTruthy();
      expect(request!.afterResponseScript).toBeTruthy();

      // Should have applied transform engine postprocessing
      expect(request!.afterResponseScript).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(request!.afterResponseScript).toContain('insomnia.response.headers.get("Status").value === "success"');
      expect(request!.afterResponseScript).not.toMatch(/insomnia\.response\.headers\.get\([^)]+\)\.includes\(/);
    });

    test('should work without transform engine (backward compatibility)', () => {
      const collection = {
        info: {
          name: 'Backward Compatibility Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Backward Compatibility Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/backward-compat'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Backward compatibility", function() {',
                    '  pm.expect(pm.response.responseTime).to.be.below(1000);',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };

      const rawData = JSON.stringify(collection);

      // Test without transform engine (existing behavior)
      const result = convert(rawData) as ImportRequest[];

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);

      const request = result.find(item => item._type === 'request');
      expect(request).toBeTruthy();
      expect(request!.afterResponseScript).toBeTruthy();

      // Should have basic pm. -> insomnia. conversion
      expect(request!.afterResponseScript).toContain('insomnia.test');
      expect(request!.afterResponseScript).toContain('insomnia.expect');
      expect(request!.afterResponseScript).toContain('insomnia.response.responseTime');
    });

    test('should handle both pre-request and test scripts with transforms', () => {
      const collection = {
        info: {
          name: 'Both Scripts Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Both Scripts Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/both-scripts'
            },
            event: [
              {
                listen: 'prerequest',
                script: {
                  exec: [
                    '// Pre-request script',
                    'pm.environment.set("timestamp", Date.now());',
                    'if (pm.response.headers.get("X-Pre-Check").includes("required")) {',
                    '  console.log("Pre-check passed");',
                    '}'
                  ]
                }
              },
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Test script',
                    'pm.test("Both scripts test", function() {',
                    '  if (pm.response.headers.get("Content-Type").includes("json")) {',
                    '    pm.expect(pm.response.headers.get("Result") === "success").to.be.true;',
                    '  }',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({
        preprocess: [],
        postprocess: [
          {
            name: 'fix-header-includes-both',
            description: 'Fix header includes in both scripts',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
            replacement: 'insomnia.response.headers.get($1).value.includes(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-comparisons-both',
            description: 'Fix header comparisons in both scripts',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
            flags: 'g',
            enabled: true
          }
        ]
      });

      const rawData = JSON.stringify(collection);
      const result = convert(rawData, transformEngine) as ImportRequest[];

      const request = result.find(item => item._type === 'request');
      expect(request).toBeTruthy();

      // Both scripts should be transformed
      expect(request!.preRequestScript).toContain('insomnia.response.headers.get("X-Pre-Check").value.includes("required")');
      expect(request!.afterResponseScript).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(request!.afterResponseScript).toContain('insomnia.response.headers.get("Result").value === "success"');
    });
  });

  // ==========================================================================
  // IMPORTPOSTMAN CLASS TRANSFORM ENGINE TESTS
  // ==========================================================================

  describe('ImportPostman Class with Transform Engine', () => {
    test('should accept transform engine in constructor', () => {
      const collection = createSimpleV21Collection();
      const rawData = JSON.stringify(collection);

      const transformEngine = new TransformEngine();
      const importer = new ImportPostman(collection, rawData, transformEngine);

      expect(importer).toBeInstanceOf(ImportPostman);
      expect(importer.collection).toEqual(collection);
      expect(importer.transformEngine).toBe(transformEngine);
    });

    test('should use transform engine in script import methods', () => {
      const collection = {
        info: {
          name: 'Script Import Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Script Import Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/script-import'
            },
            event: [
              {
                listen: 'prerequest',
                script: {
                  exec: [
                    'pm.environment.set("testVar", "value");',
                    'pm.response.headers.get("X-Test").includes("test");'
                  ]
                }
              },
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Import test", function() {',
                    '  pm.expect(pm.response.headers.get("Status") === "ok").to.be.true;',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({
        preprocess: [],
        postprocess: [
          {
            name: 'fix-header-method-calls',
            description: 'Fix header method calls',
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
      });

      const rawData = JSON.stringify(collection);
      const importer = new ImportPostman(collection, rawData, transformEngine);

      const result = importer.importCollection();
      const request = result.find(item => item._type === 'request');

      expect(request).toBeTruthy();
      // Use regex to handle potential spacing differences in transform output
      expect(request!.preRequestScript).toMatch(/insomnia\.response\.headers\.get\("X-Test"\)\.value\.includes\s*\(\s*"test"\s*\)/);
      expect(request!.afterResponseScript).toMatch(/insomnia\.response\.headers\.get\("Status"\)\.value\s*===\s*"ok"/);
    });

    test('should handle transform engine errors gracefully', () => {
      const collection = createSimpleV21Collection();
      const rawData = JSON.stringify(collection);

      // Mock transform engine that throws errors
      const mockTransformEngine = {
        postprocess: jest.fn().mockImplementation(() => {
          throw new Error('Transform error');
        })
      };

      const importer = new ImportPostman(collection, rawData, mockTransformEngine as any);

      // Should not throw error even if transform engine fails
      expect(() => {
        importer.importCollection();
      }).not.toThrow();
    });
  });

  // ==========================================================================
  // UUID GENERATION WITH TRANSFORM ENGINE
  // ==========================================================================

  describe('UUID Generation with Transform Engine', () => {
    test('should maintain unique IDs when using transform engine', () => {
      const collection1 = createSimpleV21Collection('Collection 1');
      const collection2 = createSimpleV21Collection('Collection 2');

      const transformEngine = new TransformEngine();

      const rawData1 = JSON.stringify(collection1);
      const rawData2 = JSON.stringify(collection2);

      const result1 = convert(rawData1, transformEngine) as ImportRequest[];
      const result2 = convert(rawData2, transformEngine) as ImportRequest[];

      expect(result1).toBeTruthy();
      expect(result2).toBeTruthy();

      // Extract all IDs from both conversions
      const ids1 = result1.map(item => item._id).filter(Boolean);
      const ids2 = result2.map(item => item._id).filter(Boolean);

      // Verify no ID collisions between conversions
      const allIds = [...ids1, ...ids2];
      const uniqueIds = new Set(allIds);

      expect(uniqueIds.size).toBe(allIds.length);
    });

    test('should generate proper UUID format with transform engine', () => {
      const collection = createComplexV21Collection();
      const transformEngine = new TransformEngine();
      const rawData = JSON.stringify(collection);

      const result = convert(rawData, transformEngine) as ImportRequest[];

      const requestItems = result.filter(item => item._type === 'request');
      const folderItems = result.filter(item => item._type === 'request_group');

      requestItems.forEach(item => {
        expect(item._id).toMatch(/^req_[a-f0-9]{32}$/);
      });

      folderItems.forEach(item => {
        expect(item._id).toMatch(/^fld_[a-f0-9]{32}$/);
      });
    });
  });

  // ==========================================================================
  // TRANSLATE HANDLERS FUNCTION ENHANCEMENT TESTS
  // ==========================================================================

  describe('translateHandlersInScript Function Enhancement', () => {
    test('should accept optional transform engine parameter', () => {
      const script = `
        pm.test("Script with headers", function() {
          if (pm.response.headers.get("Content-Type").includes("json")) {
            pm.expect(pm.response.headers.get("Status") === "success").to.be.true;
          }
        });
      `;

      const transformEngine = new TransformEngine({
        preprocess: [],
        postprocess: [
          {
            name: 'test-header-fix',
            description: 'Test header fix',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
            replacement: 'insomnia.response.headers.get($1).value.includes(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'test-header-comparison',
            description: 'Test header comparison fix',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
            flags: 'g',
            enabled: true
          }
        ]
      });

      // Test with transform engine
      const resultWithEngine = translateHandlersInScript(script, transformEngine);

      expect(resultWithEngine).toContain('insomnia.test');
      expect(resultWithEngine).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(resultWithEngine).toContain('insomnia.response.headers.get("Status").value === "success"');

      const resultWithoutEngine = translateHandlersInScript(script);

      expect(resultWithoutEngine).toContain('insomnia.test');
      expect(resultWithoutEngine).toContain('insomnia.response.headers.get("Content-Type").includes("json")');
      expect(resultWithoutEngine).toContain('insomnia.response.headers.get("Status") === "success"');
    });

    test('should handle empty scripts with transform engine', () => {
      const transformEngine = new TransformEngine();

      expect(translateHandlersInScript('', transformEngine)).toBe('');
      expect(translateHandlersInScript('   ', transformEngine)).toBe('   ');
      expect(translateHandlersInScript('\n\t  \n', transformEngine)).toBe('\n\t  \n');
    });

    test('should handle complex scripts with transform engine', () => {
      const complexScript = `
        // Complex script with multiple patterns
        pm.test("Complex test", function() {
          const contentType = pm.response.headers.get("Content-Type").toLowerCase();
          const isJson = pm.response.headers.get("Content-Type").includes("json");
          const status = pm.response.headers.get("X-Status") === "completed";

          if (pm.response.headers.get("X-Auth") && pm.response.headers.get("X-Auth").startsWith("Bearer")) {
            pm.expect(isJson).to.be.true;
            pm.expect(status).to.be.true;
          }
        });
      `;

      const transformEngine = new TransformEngine({
        preprocess: [],
        postprocess: [
          {
            name: 'fix-all-header-methods',
            description: 'Fix all header method calls',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.(toLowerCase|includes|startsWith)\\(',
            replacement: 'insomnia.response.headers.get($1).value.$2(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-conditionals',
            description: 'Fix header conditionals',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*&&\\s*insomnia\\.response\\.headers\\.get\\(\\1\\)\\.(?!value\\b)(\\w+)',
            replacement: 'insomnia.response.headers.get($1) && insomnia.response.headers.get($1).value.$2',
            flags: 'g',
            enabled: true
          },
          {
            name: 'fix-header-comparisons-complex',
            description: 'Fix header comparisons',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
            flags: 'g',
            enabled: true
          }
        ]
      });

      const result = translateHandlersInScript(complexScript, transformEngine);

      // Should fix all the patterns
      expect(result).toContain('insomnia.response.headers.get("Content-Type").value.toLowerCase()');
      expect(result).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(result).toContain('insomnia.response.headers.get("X-Status").value === "completed"');
      expect(result).toContain('insomnia.response.headers.get("X-Auth") && insomnia.response.headers.get("X-Auth").value.startsWith("Bearer")');

      // Should not contain problematic patterns
      expect(result).not.toMatch(/insomnia\.response\.headers\.get\([^)]+\)\.toLowerCase\(/);
      expect(result).not.toMatch(/insomnia\.response\.headers\.get\([^)]+\)\.includes\(/);
      expect(result).not.toMatch(/insomnia\.response\.headers\.get\([^)]+\)\s*===/);
    });
  });

  // ==========================================================================
  // PERFORMANCE TESTS WITH TRANSFORM ENGINE
  // ==========================================================================

  describe('Performance with Transform Engine', () => {
    test('should maintain performance with transform engine', () => {
      // Create a large collection for performance testing
      const largeCollection = {
        info: {
          name: 'Performance Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [] as any[]
      };

      // Generate 100 requests with scripts (reduced for test performance)
      for (let i = 0; i < 100; i++) {
        largeCollection.item.push({
          name: `Performance Request ${i}`,
          request: {
            method: 'GET',
            url: `https://api.example.com/perf-${i}`
          },
          event: [
            {
              listen: 'test',
              script: {
                exec: [
                  `// Performance test script ${i}`,
                  'if (pm.response.headers.get("Content-Type").includes("json")) {',
                  '  pm.test("Performance test", function() {',
                  '    pm.expect(pm.response.headers.get("Status") === "success").to.be.true;',
                  '  });',
                  '}'
                ]
              }
            }
          ]
        });
      }

      const transformEngine = new TransformEngine({
        preprocess: [],
        postprocess: [
          {
            name: 'perf-header-includes',
            description: 'Performance header includes fix',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
            replacement: 'insomnia.response.headers.get($1).value.includes(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'perf-header-comparisons',
            description: 'Performance header comparisons fix',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
            flags: 'g',
            enabled: true
          }
        ]
      });

      const rawData = JSON.stringify(largeCollection);

      const startTime = Date.now();
      const result = convert(rawData, transformEngine) as ImportRequest[];
      const endTime = Date.now();

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(100); // 100 requests + folders
      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds

      // Verify transforms were applied
      const requests = result.filter(item => item._type === 'request');
      const sampleRequests = requests.slice(0, 5);

      sampleRequests.forEach(request => {
        if (request.afterResponseScript) {
          expect(request.afterResponseScript).toContain('.value.includes');
          expect(request.afterResponseScript).toContain('.value === ');
        }
      });
    });

    test('should handle concurrent conversions with transform engine', async () => {
      const createPerfCollection = (name: string) => ({
        info: {
          name,
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: `${name} Request`,
            request: {
              method: 'GET',
              url: `https://api.example.com/${name.toLowerCase()}`
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    `// ${name} test script`,
                    'if (pm.response.headers.get("Content-Type").includes("json")) {',
                    '  pm.expect(pm.response.headers.get("Result") === "ok").to.be.true;',
                    '}'
                  ]
                }
              }
            ]
          }
        ]
      });

      const transformEngine = new TransformEngine({
        preprocess: [],
        postprocess: [
          {
            name: 'concurrent-header-fix',
            description: 'Concurrent header fix',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
            replacement: 'insomnia.response.headers.get($1).value.includes(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'concurrent-header-comparison',
            description: 'Concurrent header comparison fix',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
            flags: 'g',
            enabled: true
          }
        ]
      });

      const conversions = [];
      for (let i = 0; i < 5; i++) {
        const collection = createPerfCollection(`Concurrent Collection ${i}`);
        const promise = new Promise(resolve => {
          setTimeout(() => {
            const result = convert(JSON.stringify(collection), transformEngine);
            resolve(result);
          }, Math.random() * 50);
        });
        conversions.push(promise);
      }

      const results = await Promise.all(conversions);

      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(Array.isArray(result)).toBe(true);
      });

      // Verify all results have unique IDs and proper transforms
      const allIds = new Set();
      results.forEach((result: any) => {
        result.forEach((item: any) => {
          if (item._id) {
            expect(allIds.has(item._id)).toBe(false);
            allIds.add(item._id);
          }
          if (item.afterResponseScript) {
            const hasValueIncludes = item.afterResponseScript.includes('.value.includes');
            const hasValueEquals = item.afterResponseScript.includes('.value === ');
            expect(hasValueIncludes || hasValueEquals).toBe(true);
          }
        });
      });
    });
  });

  // ==========================================================================
  // EDGE CASES WITH TRANSFORM ENGINE
  // ==========================================================================

  describe('Edge Cases with Transform Engine', () => {
    test('should handle scripts with no pm references and transform engine', () => {
      const collection = {
        info: {
          name: 'No PM References',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'No PM Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/no-pm'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Script with no pm references',
                    'console.log("This script has no pm calls");',
                    'const data = { test: "value" };',
                    'if (data.test === "value") {',
                    '  console.log("Simple condition");',
                    '}'
                  ]
                }
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine();
      const rawData = JSON.stringify(collection);

      const result = convert(rawData, transformEngine) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request).toBeTruthy();
      expect(request!.afterResponseScript).toBeTruthy();

      // Should preserve the script unchanged (no pm references to convert)
      expect(request!.afterResponseScript).toContain('console.log("This script has no pm calls")');
      expect(request!.afterResponseScript).toContain('const data = { test: "value" }');
      expect(request!.afterResponseScript).not.toContain('insomnia.');
    });

    test('should handle malformed scripts with transform engine', () => {
      const collection = {
        info: {
          name: 'Malformed Scripts',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Malformed Script Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/malformed'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Malformed script that might cause issues',
                    'pm.test("Malformed test", function() {',
                    '  if (pm.response.headers.get("Weird-Header").includes("incomplete")) {',
                    '    console.log("This works");',
                    '  }',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine();
      const rawData = JSON.stringify(collection);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw error even with malformed scripts
      expect(() => {
        const result = convert(rawData, transformEngine);
        expect(result).toBeTruthy();
      }).not.toThrow();

      // Restore console.error
      consoleSpy.mockRestore();
    });

    test('should handle unicode characters in scripts with transform engine', () => {
      const collection = {
        info: {
          name: 'Unicode Scripts',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Unicode Script Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/unicode'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    '// Script with unicode characters 测试',
                    'pm.test("Unicode test 🚀", function() {',
                    '  if (pm.response.headers.get("Content-Type").includes("json")) {',
                    '    pm.expect(pm.response.headers.get("Language") === "中文").to.be.true;',
                    '  }',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({
        preprocess: [],
        postprocess: [
          {
            name: 'unicode-header-fix',
            description: 'Unicode header fix',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\.includes\\(',
            replacement: 'insomnia.response.headers.get($1).value.includes(',
            flags: 'g',
            enabled: true
          },
          {
            name: 'unicode-header-comparison',
            description: 'Unicode header comparison fix',
            pattern: 'insomnia\\.response\\.headers\\.get\\(([^)]+)\\)\\s*(===|!==)\\s*',
            replacement: 'insomnia.response.headers.get($1).value $2 ',
            flags: 'g',
            enabled: true
          }
        ]
      });

      const rawData = JSON.stringify(collection);
      const result = convert(rawData, transformEngine) as ImportRequest[];

      const request = result.find(item => item._type === 'request');
      expect(request).toBeTruthy();
      expect(request!.afterResponseScript).toBeTruthy();

      // Should preserve unicode characters and apply transforms
      expect(request!.afterResponseScript).toContain('测试');
      expect(request!.afterResponseScript).toContain('🚀');
      expect(request!.afterResponseScript).toContain('中文');
      expect(request!.afterResponseScript).toContain('insomnia.response.headers.get("Content-Type").value.includes("json")');
      expect(request!.afterResponseScript).toContain('insomnia.response.headers.get("Language").value === "中文"');
    });
  });
});

// =============================================================================
// ADDITIONAL HELPER FUNCTIONS FOR TESTING
// =============================================================================

function createSimpleV21Collection(name = 'Test Collection') {
  return {
    info: {
      name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _postman_id: 'test-collection-id'
    },
    item: [
      {
        name: 'Simple GET Request',
        request: {
          method: 'GET',
          url: 'https://api.example.com/users',
          header: [
            { key: 'Accept', value: 'application/json' }
          ]
        }
      }
    ]
  };
}

function createComplexV21Collection() {
  return {
    info: {
      name: 'Complex Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      {
        name: 'Users Folder',
        item: [
          {
            name: 'Get User',
            request: {
              method: 'GET',
              url: {
                raw: 'https://api.example.com/users/{{userId}}',
                host: ['api', 'example', 'com'],
                path: ['users', '{{userId}}'],
                query: [
                  { key: 'include', value: 'profile' },
                  { key: 'debug', value: 'true', disabled: true }
                ]
              },
              header: [
                { key: 'Authorization', value: 'Bearer {{token}}' }
              ],
              auth: {
                type: 'bearer',
                bearer: [
                  { key: 'token', value: '{{bearerToken}}' }
                ]
              }
            },
            event: [
              {
                listen: 'prerequest',
                script: {
                  exec: [
                    'pm.environment.set("timestamp", Date.now());',
                    'console.log("Pre-request script executed");'
                  ]
                }
              }
            ]
          }
        ]
      }
    ]
  };
}
