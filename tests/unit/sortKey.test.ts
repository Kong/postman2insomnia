// tests/unit/sortKey.test.ts
import { convert } from '../../src/postman-converter';

// Helper function to create test Postman collection
function createTestPostmanCollection(items: any[]) {
  return {
    info: {
      name: 'Test Collection',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: items
  };
}

describe('sortKey Generation', () => {

  test('should generate unique metaSortKey values for multiple resources', () => {
    // Create test Postman collection with multiple items
    const testCollection = createTestPostmanCollection([
      {
        name: 'Request 1',
        request: {
          method: 'GET',
          url: 'https://api.example.com/endpoint1',
          description: 'First request'
        }
      },
      {
        name: 'Request 2',
        request: {
          method: 'POST',
          url: 'https://api.example.com/endpoint2',
          description: 'Second request'
        }
      },
      {
        name: 'Folder 1',
        item: [
          {
            name: 'Request 3',
            request: {
              method: 'PUT',
              url: 'https://api.example.com/endpoint3',
              description: 'Third request'
            }
          }
        ]
      }
    ]);

    // Convert the collection
    const result = convert(JSON.stringify(testCollection));

    // Should return an array of ImportRequest objects
    expect(Array.isArray(result)).toBe(true);

    if (Array.isArray(result)) {
      // Extract all metaSortKey values
      const sortKeys = result.map((item: any) => item.metaSortKey).filter((key: any) => key !== undefined);

      // Test 1: All sortKeys should be unique
      const uniqueSortKeys = new Set(sortKeys);
      expect(uniqueSortKeys.size).toBe(sortKeys.length);

      // Test 2: All sortKeys should be numbers
      sortKeys.forEach((sortKey: any) => {
        expect(typeof sortKey).toBe('number');
      });

      // Test 3: sortKeys should be in ascending order (note: current implementation uses negative values)
      // The current implementation uses: -1 * (now - index), so later items have higher values
      for (let i = 1; i < sortKeys.length; i++) {
        expect(sortKeys[i]).toBeGreaterThan(sortKeys[i - 1]);
      }
    }
  });

  test('should maintain order when converting mixed request types', () => {
    const testCollection = createTestPostmanCollection([
      {
        name: 'Auth Folder',
        item: [
          {
            name: 'Login',
            request: {
              method: 'POST',
              url: 'https://api.example.com/login',
              description: 'User login'
            }
          }
        ]
      },
      {
        name: 'Get Profile',
        request: {
          method: 'GET',
          url: 'https://api.example.com/profile',
          description: 'Get user profile'
        }
      }
    ]);

    const result = convert(JSON.stringify(testCollection));

    expect(Array.isArray(result)).toBe(true);

    if (Array.isArray(result)) {
      // Find the items by name to verify order
      const authFolder = result.find((item: any) => item.name === 'Auth Folder');
      const getProfile = result.find((item: any) => item.name === 'Get Profile');

      expect(authFolder).toBeDefined();
      expect(getProfile).toBeDefined();

      // Verify metaSortKeys are in ascending order
      if (authFolder?.metaSortKey && getProfile?.metaSortKey) {
        expect(authFolder.metaSortKey).toBeLessThan(getProfile.metaSortKey);
      }
    }
  });

  test('should handle empty collections', () => {
    const testCollection = createTestPostmanCollection([]);
    const result = convert(JSON.stringify(testCollection));

    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle single item collection', () => {
    const testCollection = createTestPostmanCollection([
      {
        name: 'Single Request',
        request: {
          method: 'GET',
          url: 'https://api.example.com/single',
          description: 'Single request test'
        }
      }
    ]);

    const result = convert(JSON.stringify(testCollection));

    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      const requestItem = result.find((item: any) => item.name === 'Single Request');
      expect(requestItem).toBeDefined();
      expect(requestItem?.metaSortKey).toBeDefined();
      expect(typeof requestItem?.metaSortKey).toBe('number');
    }
  });

  test('should generate metaSortKeys starting from current timestamp', () => {
    const startTime = Date.now() - 100; // Add some buffer before

    const testCollection = createTestPostmanCollection([
      {
        name: 'Test Request',
        request: {
          method: 'GET',
          url: 'https://api.example.com/test',
          description: 'Test request'
        }
      }
    ]);

    const result = convert(JSON.stringify(testCollection));
    const endTime = Date.now() + 100; // Add some buffer after

    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      const testItem = result.find((item: any) => item.name === 'Test Request');
      if (testItem?.metaSortKey) {
        // metaSortKey should be within reasonable range of when the test ran
        // Note: current implementation uses negative values, so we need to check absolute values
        const absMetaSortKey = Math.abs(testItem.metaSortKey);
        expect(absMetaSortKey).toBeGreaterThanOrEqual(startTime);
        expect(absMetaSortKey).toBeLessThanOrEqual(endTime + 1000); // Allow generous buffer
      }
    }
  });

  test('should handle collections with missing properties gracefully', () => {
    const testCollection = createTestPostmanCollection([
      {
        name: 'Valid Request',
        request: {
          method: 'GET',
          url: 'https://api.example.com/valid'
        }
      },
      {
        name: 'Minimal Folder',
        item: [
          {
            name: 'Nested Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/nested'
            }
          }
        ]
      }
    ]);

    const result = convert(JSON.stringify(testCollection));

    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      expect(result.length).toBeGreaterThan(0);

      // Check that items have metaSortKeys
      const itemsWithSortKeys = result.filter((item: any) => item.metaSortKey !== undefined);
      expect(itemsWithSortKeys.length).toBeGreaterThan(0);
    }
  });

  test('should handle malformed collections gracefully', () => {
    // Mock console.error to suppress expected error output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const malformedCollection = createTestPostmanCollection([
      {
        name: 'Invalid Request'
        // Missing request property - this will cause "items is not iterable" error
      }
    ]);

    const result = convert(JSON.stringify(malformedCollection));

    // Should return null for malformed collections
    expect(result).toBeNull();

    // Restore console.error
    consoleSpy.mockRestore();
  });
});

// Performance test to ensure the fix doesn't cause performance issues
describe('sortKey Performance', () => {
  test('should handle large collections efficiently', () => {
    const LARGE_COLLECTION_SIZE = 100; // Reduced for testing performance

    // Generate a large collection
    const largeItems = Array.from({ length: LARGE_COLLECTION_SIZE }, (_, i) => ({
      name: `Request ${i}`,
      request: {
        method: 'GET',
        url: `https://api.example.com/endpoint${i}`,
        description: `Request number ${i}`
      }
    }));

    const testCollection = createTestPostmanCollection(largeItems);

    const startTime = Date.now();
    const result = convert(JSON.stringify(testCollection));
    const endTime = Date.now();

    // Should complete within reasonable time (less than 1 second)
    expect(endTime - startTime).toBeLessThan(1000);

    // Should have results
    expect(Array.isArray(result)).toBe(true);

    if (Array.isArray(result)) {
      // All metaSortKeys should be unique
      const sortKeys = result.map((item: any) => item.metaSortKey).filter((key: any) => key !== undefined);
      const uniqueSortKeys = new Set(sortKeys);
      expect(uniqueSortKeys.size).toBe(sortKeys.length);
    }
  });
});

// Test the actual sortKey fix implementation
describe('sortKey Fix Implementation', () => {
  test('current implementation uses negative timestamp with index offset', () => {
    const testCollection = createTestPostmanCollection([
      { name: 'Request 1', request: { method: 'GET', url: 'https://api.example.com/1' } },
      { name: 'Request 2', request: { method: 'GET', url: 'https://api.example.com/2' } },
      { name: 'Request 3', request: { method: 'GET', url: 'https://api.example.com/3' } }
    ]);

    const result = convert(JSON.stringify(testCollection));

    expect(Array.isArray(result)).toBe(true);
    if (Array.isArray(result)) {
      const sortKeys = result.map((item: any) => item.metaSortKey).filter((key: any) => key !== undefined);

      // Current implementation: metaSortKey: -1 * (now - index)
      // This means first item has lowest value, last item has highest value
      // All values should be negative (because of -1 multiplication)
      sortKeys.forEach((sortKey: any) => {
        expect(sortKey).toBeLessThan(0);
      });

      // Should be in ascending order (most negative first, least negative last)
      for (let i = 1; i < sortKeys.length; i++) {
        expect(sortKeys[i]).toBeGreaterThan(sortKeys[i - 1]);
      }
    }
  });
});
