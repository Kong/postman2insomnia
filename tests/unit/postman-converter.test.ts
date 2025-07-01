// =============================================================================
// POSTMAN CONVERTER TESTS - CLEAN VERSION
// =============================================================================

import {
  convert,
  transformPostmanToNunjucksString,
  translateHandlersInScript,
  normaliseJsonPath,
  ImportPostman
} from '../../src/postman-converter';
import type { ImportRequest } from '../../src/types/entities';

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
      const result = convert('{ invalid json }');
      expect(result).toBeNull();
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
