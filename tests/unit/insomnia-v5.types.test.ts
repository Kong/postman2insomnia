// tests/unit/insomnia-v5.types.test.ts
/**
 * Type validation tests for Insomnia v5 types
 *
 * These tests validate that our types work correctly both at compile time
 * and runtime, ensuring type safety and proper structure validation.
 */

import type {
  InsomniaV5Export,
  InsomniaV5CollectionExport,
  InsomniaV5EnvironmentExport,
  InsomniaV5Request,
  InsomniaV5RequestGroup,
  InsomniaV5CollectionItem,
  InsomniaV5Body,
  EmptyBody,
  InsomniaV5Authentication,
} from '../../src/types/insomnia-v5.types';

describe('Insomnia v5 Types', () => {

  describe('InsomniaV5CollectionExport', () => {
    test('should create valid collection export structure', () => {
      const validCollection: InsomniaV5CollectionExport = {
        type: 'collection.insomnia.rest/5.0',
        name: 'Test Collection',
        meta: {
          id: 'test-id',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: 'Test description'
        },
        collection: [],
        environments: {
          name: 'Base Environment',
          meta: {
            id: 'env-id',
            created: Date.now(),
            modified: Date.now(),
            isPrivate: false
          },
          data: { key: 'value' }
        },
        cookieJar: {
          name: 'Cookie Jar',
          meta: {
            id: 'jar-id',
            created: Date.now(),
            modified: Date.now(),
            isPrivate: false
          },
          cookies: []
        }
      };

      // Type should compile correctly
      const _export: InsomniaV5Export = validCollection;

      // Runtime validation
      expect(validCollection.type).toBe('collection.insomnia.rest/5.0');
      expect(validCollection.name).toBe('Test Collection');
      expect(validCollection.meta.id).toBe('test-id');
      expect(Array.isArray(validCollection.collection)).toBe(true);
      expect(validCollection.environments.name).toBe('Base Environment');
      expect(validCollection.cookieJar.name).toBe('Cookie Jar');
    });

    test('should handle collection with items', () => {
      const mockRequest: InsomniaV5Request = {
        name: 'Test Request',
        url: 'https://api.example.com/test',
        method: 'GET',
        body: {},
        headers: [],
        parameters: [],
        pathParameters: [],
        authentication: {},
        scripts: { preRequest: '', afterResponse: '' },
        settings: {
          renderRequestBody: true,
          encodeUrl: true,
          rebuildPath: true,
          followRedirects: 'global',
          cookies: { send: true, store: true }
        },
        meta: {
          id: 'req-123',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: 'Test request',
          sortKey: 1000
        },
        children: undefined
      };

      const collection: InsomniaV5CollectionExport = {
        type: 'collection.insomnia.rest/5.0',
        name: 'Test Collection',
        meta: {
          id: 'col-123',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false
        },
        collection: [mockRequest],
        environments: {
          name: 'Base Environment',
          meta: {
            id: 'env-123',
            created: Date.now(),
            modified: Date.now(),
            isPrivate: false
          },
          data: {}
        },
        cookieJar: {
          name: 'Cookie Jar',
          meta: {
            id: 'jar-123',
            created: Date.now(),
            modified: Date.now(),
            isPrivate: false
          },
          cookies: []
        }
      };

      expect(collection.collection.length).toBe(1);
      expect(collection.collection[0].name).toBe('Test Request');
    });
  });

  describe('InsomniaV5EnvironmentExport', () => {
    test('should create valid environment export structure', () => {
      const validEnvironment: InsomniaV5EnvironmentExport = {
        type: 'environment.insomnia.rest/5.0',
        name: 'Test Environment',
        meta: {
          id: 'env-id',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: 'Test description'
        },
        environments: {
          name: 'Environment',
          meta: {
            id: 'env-meta-id',
            created: Date.now(),
            modified: Date.now(),
            isPrivate: false
          },
          data: {
            apiUrl: 'https://api.example.com',
            timeout: 5000,
            debug: true
          }
        }
      };

      // Type should compile correctly
      const _export: InsomniaV5Export = validEnvironment;

      // Runtime validation
      expect(validEnvironment.type).toBe('environment.insomnia.rest/5.0');
      expect(validEnvironment.name).toBe('Test Environment');
      expect(validEnvironment.environments.data.apiUrl).toBe('https://api.example.com');
      expect(validEnvironment.environments.data.timeout).toBe(5000);
      expect(validEnvironment.environments.data.debug).toBe(true);
    });
  });

  describe('InsomniaV5Request', () => {
    test('should create valid request structure', () => {
      const validRequest: InsomniaV5Request = {
        name: 'Test Request',
        description: 'A test request',
        url: 'https://api.example.com/users',
        method: 'GET',
        body: {
          mimeType: 'application/json',
          text: '{"key": "value"}'
        },
        headers: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Authorization', value: 'Bearer token' }
        ],
        parameters: [
          { name: 'page', value: '1', disabled: false },
          { name: 'limit', value: '10', disabled: false }
        ],
        pathParameters: [
          { name: 'id', value: '123' }
        ],
        authentication: {
          type: 'bearer',
          token: 'example-token'
        },
        scripts: {
          preRequest: 'console.log("Before request");',
          afterResponse: 'console.log("After response");'
        },
        settings: {
          renderRequestBody: true,
          encodeUrl: true,
          rebuildPath: true,
          followRedirects: 'global',
          cookies: {
            send: true,
            store: true
          }
        },
        meta: {
          id: 'req-123',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: 'Test request meta',
          sortKey: 1000
        },
        children: undefined
      };

      // Type should compile correctly
      const _item: InsomniaV5CollectionItem = validRequest;

      // Runtime validation
      expect(validRequest.name).toBe('Test Request');
      expect(validRequest.method).toBe('GET');
      expect(validRequest.url).toBe('https://api.example.com/users');
      expect(validRequest.children).toBeUndefined();
      expect(validRequest.headers).toHaveLength(2);
      expect(validRequest.parameters).toHaveLength(2);
      expect(validRequest.pathParameters).toHaveLength(1);
    });

    test('should handle request with empty body', () => {
      const requestWithEmptyBody: InsomniaV5Request = {
        name: 'GET Request',
        url: 'https://api.example.com/users',
        method: 'GET',
        body: {}, // EmptyBody
        headers: [],
        parameters: [],
        pathParameters: [],
        authentication: {},
        scripts: { preRequest: '', afterResponse: '' },
        settings: {
          renderRequestBody: true,
          encodeUrl: true,
          rebuildPath: true,
          followRedirects: 'global',
          cookies: { send: true, store: true }
        },
        meta: {
          id: 'req-456',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: 'GET request with empty body',
          sortKey: 2000
        },
        children: undefined
      };

      expect(requestWithEmptyBody.body).toEqual({});
      expect(Object.keys(requestWithEmptyBody.body)).toHaveLength(0);
    });
  });

  describe('InsomniaV5RequestGroup', () => {
    test('should create valid request group structure', () => {
      const validGroup: InsomniaV5RequestGroup = {
        name: 'Test Group',
        description: 'A test group',
        environment: { groupVar: 'value' },
        environmentPropertyOrder: { groupVar: 0 },
        scripts: {
          preRequest: '',
          afterResponse: ''
        },
        authentication: {},
        headers: [],
        meta: {
          id: 'grp-123',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: 'Test group meta',
          sortKey: 2000
        },
        children: [], // Can contain other requests/groups
        method: undefined,
        url: undefined,
        parameters: undefined,
        pathParameters: undefined
      };

      // Type should compile correctly
      const _item: InsomniaV5CollectionItem = validGroup;

      // Runtime validation
      expect(validGroup.name).toBe('Test Group');
      expect(validGroup.children).toEqual([]);
      expect(validGroup.method).toBeUndefined();
      expect(validGroup.url).toBeUndefined();
      expect(validGroup.parameters).toBeUndefined();
      expect(validGroup.pathParameters).toBeUndefined();
    });
  });

  describe('Body Types', () => {
    test('should handle different body types', () => {
      // Empty body
      const emptyBody: EmptyBody = {};

      // Full body
      const fullBody: InsomniaV5Body = {
        mimeType: 'application/json',
        text: '{"test": true}'
      };

      // Body with null mimeType
      const nullMimeBody: InsomniaV5Body = {
        mimeType: null,
        text: 'plain text'
      };

      // All should be valid body types
      const bodies: (InsomniaV5Body | EmptyBody)[] = [
        emptyBody,
        fullBody,
        nullMimeBody
      ];

      expect(bodies).toHaveLength(3);
      expect(emptyBody).toEqual({});
      expect(fullBody.mimeType).toBe('application/json');
      expect(nullMimeBody.mimeType).toBeNull();
    });
  });

  describe('Authentication Types', () => {
    test('should handle different authentication types', () => {
      const basicAuth: InsomniaV5Authentication = {
        type: 'basic',
        username: 'user',
        password: 'pass'
      };

      const bearerAuth: InsomniaV5Authentication = {
        type: 'bearer',
        token: 'jwt-token'
      };

      const customAuth: InsomniaV5Authentication = {
        type: 'custom',
        customField: 'custom-value',
        anotherField: 123
      };

      const emptyAuth: InsomniaV5Authentication = {};

      // All should be valid authentication types
      const auths: InsomniaV5Authentication[] = [
        basicAuth,
        bearerAuth,
        customAuth,
        emptyAuth
      ];

      expect(auths).toHaveLength(4);
      expect(basicAuth.type).toBe('basic');
      expect(bearerAuth.type).toBe('bearer');
      expect(customAuth.type).toBe('custom');
      expect(emptyAuth.type).toBeUndefined();
    });
  });

  describe('Type Discrimination', () => {
    test('should distinguish between export types using type field', () => {
      const collectionExport: InsomniaV5CollectionExport = {
        type: 'collection.insomnia.rest/5.0',
        name: 'Collection',
        meta: {
          id: 'col-123',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false
        },
        collection: [],
        environments: {
          name: 'Base Environment',
          meta: {
            id: 'env-123',
            created: Date.now(),
            modified: Date.now(),
            isPrivate: false
          },
          data: {}
        },
        cookieJar: {
          name: 'Cookie Jar',
          meta: {
            id: 'jar-123',
            created: Date.now(),
            modified: Date.now(),
            isPrivate: false
          },
          cookies: []
        }
      };

      const environmentExport: InsomniaV5EnvironmentExport = {
        type: 'environment.insomnia.rest/5.0',
        name: 'Environment',
        meta: {
          id: 'env-456',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false
        },
        environments: {
          name: 'Test Environment',
          meta: {
            id: 'env-data-456',
            created: Date.now(),
            modified: Date.now(),
            isPrivate: false
          },
          data: { key: 'value' }
        }
      };

      // Type discrimination should work
      function processExport(exportData: InsomniaV5Export): string {
        if (exportData.type === 'collection.insomnia.rest/5.0') {
          // TypeScript knows this is InsomniaV5CollectionExport
          return `Collection with ${exportData.collection.length} items`;
        } else {
          // TypeScript knows this is InsomniaV5EnvironmentExport
          return `Environment with ${Object.keys(exportData.environments.data).length} variables`;
        }
      }

      expect(processExport(collectionExport)).toBe('Collection with 0 items');
      expect(processExport(environmentExport)).toBe('Environment with 1 variables');
    });

    test('should distinguish between collection item types', () => {
      const request: InsomniaV5Request = {
        name: 'Test Request',
        url: 'https://api.example.com/test',
        method: 'GET',
        body: {},
        headers: [],
        parameters: [],
        pathParameters: [],
        authentication: {},
        scripts: { preRequest: '', afterResponse: '' },
        settings: {
          renderRequestBody: true,
          encodeUrl: true,
          rebuildPath: true,
          followRedirects: 'global',
          cookies: { send: true, store: true }
        },
        meta: {
          id: 'req-123',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: 'Test request',
          sortKey: 1000
        },
        children: undefined
      };

      const requestGroup: InsomniaV5RequestGroup = {
        name: 'Test Group',
        environment: {},
        environmentPropertyOrder: {},
        scripts: { preRequest: '', afterResponse: '' },
        authentication: {},
        headers: [],
        meta: {
          id: 'grp-123',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: 'Test group',
          sortKey: 2000
        },
        children: [],
        method: undefined,
        url: undefined,
        parameters: undefined,
        pathParameters: undefined
      };

      // Type discrimination should work
      function processItem(item: InsomniaV5CollectionItem): string {
        if (item.children === undefined) {
          // This is a request
          return `Request: ${item.method} ${item.url}`;
        } else {
          // This is a request group
          return `Group: ${item.name} (${item.children.length} children)`;
        }
      }

      expect(processItem(request)).toBe('Request: GET https://api.example.com/test');
      expect(processItem(requestGroup)).toBe('Group: Test Group (0 children)');
    });
  });
});
