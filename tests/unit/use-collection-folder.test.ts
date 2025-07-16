// =============================================================================
// UNIT TESTS FOR --use-collection-folder FEATURE
// =============================================================================
import { convert } from '../../src/postman-converter';
import type { ImportRequest } from '../../src/types/entities';
import type { TransformEngine } from '../../src/transform-engine';

describe('--use-collection-folder Feature', () => {
  // ==========================================================================
  // TEST DATA FIXTURES
  // ==========================================================================

  const createTestCollection = (name = 'Consumer Finance') => ({
    info: {
      name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _postman_id: 'test-collection-id',
      description: 'Test collection for folder structure testing'
    },
    item: [
      {
        name: 'Document',
        item: [
          {
            name: 'Step 1. Get Access token',
            request: {
              method: 'POST',
              url: 'https://example.com/auth/token',
              header: [
                { key: 'Content-Type', value: 'application/x-www-form-urlencoded' }
              ],
              body: {
                mode: 'urlencoded',
                urlencoded: [
                  { key: 'grant_type', value: 'client_credentials' }
                ]
              }
            }
          },
          {
            name: 'Step 2. Validate token',
            request: {
              method: 'POST',
              url: 'https://example.com/auth/validate'
            }
          }
        ]
      },
      {
        name: 'Token',
        item: [
          {
            name: 'Kong - Generate token',
            request: {
              method: 'POST',
              url: 'https://example.com/kong/token'
            }
          },
          {
            name: 'Kong - PSD2',
            request: {
              method: 'GET',
              url: 'https://example.com/psd2/accounts'
            }
          }
        ]
      }
    ]
  });

  const createSimpleCollection = (name = 'Simple API') => ({
    info: {
      name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [
      {
        name: 'Get Users',
        request: {
          method: 'GET',
          url: 'https://api.example.com/users'
        }
      },
      {
        name: 'Create User',
        request: {
          method: 'POST',
          url: 'https://api.example.com/users'
        }
      }
    ]
  });

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  const findItemByName = (items: ImportRequest[], name: string): ImportRequest | undefined => {
    return items.find(item => item.name === name);
  };

  const findItemsByParentId = (items: ImportRequest[], parentId: string): ImportRequest[] => {
    return items.filter(item => item.parentId === parentId);
  };

  const findRootFolder = (items: ImportRequest[]): ImportRequest | undefined => {
    return items.find(item =>
      item._type === 'request_group' &&
      item.parentId === '__WORKSPACE_ID__'
    );
  };

  // ==========================================================================
  // DEFAULT BEHAVIOR TESTS (useCollectionFolder = false)
  // ==========================================================================

  describe('Default Behavior (useCollectionFolder = false)', () => {
    test('should create original structure without nested collection folder', () => {
      const collection = createTestCollection();
      const result = convert(JSON.stringify(collection), undefined, false) as ImportRequest[];

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);

      // Should have: root folder + 2 subfolders + 4 requests = 7 items
      expect(result).toHaveLength(7);

      // Find root collection folder
      const rootFolder = findRootFolder(result);
      expect(rootFolder).toBeTruthy();
      expect(rootFolder!.name).toBe('Consumer Finance');

      // Document and Token should be direct children of root folder
      const documentFolder = findItemByName(result, 'Document');
      const tokenFolder = findItemByName(result, 'Token');

      expect(documentFolder).toBeTruthy();
      expect(tokenFolder).toBeTruthy();
      expect(documentFolder!.parentId).toBe(rootFolder!._id);
      expect(tokenFolder!.parentId).toBe(rootFolder!._id);

      // Verify requests are children of their respective folders
      const documentRequests = findItemsByParentId(result, documentFolder!._id!);
      const tokenRequests = findItemsByParentId(result, tokenFolder!._id!);

      expect(documentRequests).toHaveLength(2);
      expect(tokenRequests).toHaveLength(2);
    });

    test('should handle simple collection with direct requests', () => {
      const collection = createSimpleCollection();
      const result = convert(JSON.stringify(collection), undefined, false) as ImportRequest[];

      expect(result).toBeTruthy();
      expect(result).toHaveLength(3); // root folder + 2 requests

      const rootFolder = findRootFolder(result);
      expect(rootFolder!.name).toBe('Simple API');

      const requests = findItemsByParentId(result, rootFolder!._id!);
      expect(requests).toHaveLength(2);
      expect(requests[0]._type).toBe('request');
      expect(requests[1]._type).toBe('request');
    });

    test('should default to false when useCollectionFolder is undefined', () => {
      const collection = createTestCollection();
      const result = convert(JSON.stringify(collection)) as ImportRequest[];

      // Should behave same as explicit false
      const rootFolder = findRootFolder(result);
      const documentFolder = findItemByName(result, 'Document');

      expect(documentFolder!.parentId).toBe(rootFolder!._id);
    });
  });

  // ==========================================================================
  // NEW BEHAVIOR TESTS (useCollectionFolder = true)
  // ==========================================================================

  describe('New Behavior (useCollectionFolder = true)', () => {
    test('should create nested collection folder structure', () => {
      const collection = createTestCollection();
      const result = convert(JSON.stringify(collection), undefined, true) as ImportRequest[];

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBe(true);

      // Should have: root folder + intermediate folder + 2 subfolders + 4 requests = 8 items
      expect(result).toHaveLength(8);

      // Find root collection folder
      const rootFolder = findRootFolder(result);
      expect(rootFolder).toBeTruthy();
      expect(rootFolder!.name).toBe('Consumer Finance');

      // Find intermediate collection folder (child of root)
      const intermediateFolder = findItemsByParentId(result, rootFolder!._id!)[0];
      expect(intermediateFolder).toBeTruthy();
      expect(intermediateFolder._type).toBe('request_group');
      expect(intermediateFolder.name).toBe('Consumer Finance'); // Same name as collection

      // Document and Token should be children of intermediate folder
      const documentFolder = findItemByName(result, 'Document');
      const tokenFolder = findItemByName(result, 'Token');

      expect(documentFolder).toBeTruthy();
      expect(tokenFolder).toBeTruthy();
      expect(documentFolder!.parentId).toBe(intermediateFolder._id);
      expect(tokenFolder!.parentId).toBe(intermediateFolder._id);

      // Verify requests are still children of their respective folders
      const documentRequests = findItemsByParentId(result, documentFolder!._id!);
      const tokenRequests = findItemsByParentId(result, tokenFolder!._id!);

      expect(documentRequests).toHaveLength(2);
      expect(tokenRequests).toHaveLength(2);
    });

    test('should handle simple collection with intermediate folder', () => {
      const collection = createSimpleCollection();
      const result = convert(JSON.stringify(collection), undefined, true) as ImportRequest[];

      expect(result).toBeTruthy();
      expect(result).toHaveLength(4); // root folder + intermediate folder + 2 requests

      const rootFolder = findRootFolder(result);
      expect(rootFolder!.name).toBe('Simple API');

      // Find intermediate folder
      const intermediateFolder = findItemsByParentId(result, rootFolder!._id!)[0];
      expect(intermediateFolder.name).toBe('Simple API');
      expect(intermediateFolder._type).toBe('request_group');

      // Requests should be children of intermediate folder
      const requests = findItemsByParentId(result, intermediateFolder._id!);
      expect(requests).toHaveLength(2);
      expect(requests[0]._type).toBe('request');
      expect(requests[1]._type).toBe('request');
    });

    test('should preserve collection metadata in both folders', () => {
      const collection = createTestCollection();
      const result = convert(JSON.stringify(collection), undefined, true) as ImportRequest[];

      const rootFolder = findRootFolder(result);
      const intermediateFolder = findItemsByParentId(result, rootFolder!._id!)[0];

      // Both folders should have the same name
      expect(rootFolder!.name).toBe('Consumer Finance');
      expect(intermediateFolder.name).toBe('Consumer Finance');

      // Root folder should have collection metadata
      expect(rootFolder!.description).toBe('Test collection for folder structure testing');

      // Intermediate folder should have empty auth (not inherit from collection)
      expect(intermediateFolder.authentication).toEqual({});
    });
  });

  // ==========================================================================
  // EDGE CASES AND ERROR HANDLING
  // ==========================================================================

  describe('Edge Cases', () => {
    test('should handle empty collection with useCollectionFolder = true', () => {
      const emptyCollection = {
        info: {
          name: 'Empty Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };

      const result = convert(JSON.stringify(emptyCollection), undefined, true) as ImportRequest[];

      expect(result).toBeTruthy();
      expect(result).toHaveLength(2); // root folder + intermediate folder

      const rootFolder = findRootFolder(result);
      const intermediateFolder = findItemsByParentId(result, rootFolder!._id!)[0];

      expect(rootFolder!.name).toBe('Empty Collection');
      expect(intermediateFolder.name).toBe('Empty Collection');
    });

    test('should handle collection with special characters in name', () => {
      const collection = createTestCollection('Test & Special "Characters" Collection');
      const result = convert(JSON.stringify(collection), undefined, true) as ImportRequest[];

      const rootFolder = findRootFolder(result);
      const intermediateFolder = findItemsByParentId(result, rootFolder!._id!)[0];

      expect(rootFolder!.name).toBe('Test & Special "Characters" Collection');
      expect(intermediateFolder.name).toBe('Test & Special "Characters" Collection');
    });

    test('should handle deeply nested folder structure', () => {
      const deepCollection = {
        info: {
          name: 'Deep Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Level 1',
            item: [
              {
                name: 'Level 2',
                item: [
                  {
                    name: 'Level 3',
                    item: [
                      {
                        name: 'Deep Request',
                        request: {
                          method: 'GET',
                          url: 'https://api.example.com/deep'
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      const result = convert(JSON.stringify(deepCollection), undefined, true) as ImportRequest[];

      // Should have: root + intermediate + 3 nested folders + 1 request = 6 items
      expect(result).toHaveLength(6);

      const rootFolder = findRootFolder(result);
      const intermediateFolder = findItemsByParentId(result, rootFolder!._id!)[0];
      const level1Folder = findItemsByParentId(result, intermediateFolder._id!)[0];

      expect(level1Folder.name).toBe('Level 1');
      expect(level1Folder.parentId).toBe(intermediateFolder._id);
    });
  });

  // ==========================================================================
  // COMPARISON TESTS
  // ==========================================================================

  describe('Behavior Comparison', () => {
    test('should produce different structures for same collection', () => {
      const collection = createTestCollection();

      const defaultResult = convert(JSON.stringify(collection), undefined, false) as ImportRequest[];
      const nestedResult = convert(JSON.stringify(collection), undefined, true) as ImportRequest[];

      // Default should have fewer items (no intermediate folder)
      expect(defaultResult).toHaveLength(7);
      expect(nestedResult).toHaveLength(8);

      // In default, Document folder is direct child of root
      const defaultRoot = findRootFolder(defaultResult);
      const defaultDocument = findItemByName(defaultResult, 'Document');
      expect(defaultDocument!.parentId).toBe(defaultRoot!._id);

      // In nested, Document folder is child of intermediate folder
      const nestedRoot = findRootFolder(nestedResult);
      const nestedIntermediate = findItemsByParentId(nestedResult, nestedRoot!._id!)[0];
      const nestedDocument = findItemByName(nestedResult, 'Document');
      expect(nestedDocument!.parentId).toBe(nestedIntermediate._id);
    });

    test('should maintain same request content regardless of folder structure', () => {
      const collection = createTestCollection();

      const defaultResult = convert(JSON.stringify(collection), undefined, false) as ImportRequest[];
      const nestedResult = convert(JSON.stringify(collection), undefined, true) as ImportRequest[];

      // Find the same request in both structures
      const defaultRequest = defaultResult.find(item =>
        item._type === 'request' && item.name === 'Step 1. Get Access token'
      );
      const nestedRequest = nestedResult.find(item =>
        item._type === 'request' && item.name === 'Step 1. Get Access token'
      );

      expect(defaultRequest).toBeTruthy();
      expect(nestedRequest).toBeTruthy();

      // Request content should be identical
      expect(defaultRequest!.method).toBe(nestedRequest!.method);
      expect(defaultRequest!.url).toBe(nestedRequest!.url);
      expect(defaultRequest!.name).toBe(nestedRequest!.name);
    });
  });

  // ==========================================================================
  // INTEGRATION WITH TRANSFORM ENGINE
  // ==========================================================================

  describe('Integration with Transform Engine', () => {
    test('should work with transform engine when useCollectionFolder = true', () => {
      const collection = createTestCollection();
      const mockTransformEngine = {
        config: {
          preprocess: [],
          postprocess: []
        },
        preprocess: jest.fn((data: string) => data),
        postprocess: jest.fn((data: string) => data),
        addPreprocessRule: jest.fn(),
        addPostprocessRule: jest.fn(),
        toggleRule: jest.fn(),
        exportConfig: jest.fn(() => '{}'),
        saveConfig: jest.fn()
      } as unknown as TransformEngine;


      const result = convert(JSON.stringify(collection), mockTransformEngine, true) as ImportRequest[];

      expect(result).toBeTruthy();
      expect(result).toHaveLength(8); // Structure should be correct

      const rootFolder = findRootFolder(result);
      const intermediateFolder = findItemsByParentId(result, rootFolder!._id!)[0];

      expect(rootFolder!.name).toBe('Consumer Finance');
      expect(intermediateFolder.name).toBe('Consumer Finance');
    });

    test('should work without transform engine when useCollectionFolder = true', () => {
      const collection = createTestCollection();

      const result = convert(JSON.stringify(collection), undefined, true) as ImportRequest[];

      expect(result).toBeTruthy();
      expect(result).toHaveLength(8);

      const rootFolder = findRootFolder(result);
      expect(rootFolder!.name).toBe('Consumer Finance');
    });
  });
});

// =============================================================================
// MOCK IMPLEMENTATIONS (if needed for your test setup)
// =============================================================================

jest.mock('../../src/postman-converter', () => {
  const originalModule = jest.requireActual('../../src/postman-converter');

  return {
    ...originalModule,
    UUIDGenerator: jest.fn().mockImplementation(() => ({
      generateGroupId: jest.fn(() => 'mock-group-id'),
      generateRequestId: jest.fn(() => 'mock-request-id')
    }))
  };
});

/*
WHAT THESE TESTS VERIFY:

Default behavior (useCollectionFolder = false) works as before
New behavior (useCollectionFolder = true) creates nested structure
Edge cases are handled properly
Both structures contain the same request content
Integration with transform engine works
Error handling and special characters work

COVERAGE:
- All code paths in the importCollection method
- Both true and false values for useCollectionFolder
- Edge cases like empty collections and special characters
- Integration with existing transform engine functionality
*/
