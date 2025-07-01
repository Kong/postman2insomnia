import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class TestDataManager {
  /**
   * Load a Postman collection fixture
   */
  static loadPostmanCollection(name: string): any {
    const filePath = path.join(__dirname, '../fixtures/collections', name);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  /**
   * Load a Postman environment fixture
   */
  static loadPostmanEnvironment(name: string): any {
    const filePath = path.join(__dirname, '../fixtures/environments', name);
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  /**
   * Create a temporary directory for test output
   */
  static createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'p2i-test-'));
  }

  /**
   * Clean up temporary directory
   */
  static cleanupTempDir(dir: string): void {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  /**
   * Create a simple test collection
   */
  static createSimpleCollection(name = 'Test Collection'): any {
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
}

/**
 * Assertion helpers for Insomnia format validation
 */
export class InsomniaAssertions {
  /**
   * Assert that data follows Insomnia v5 collection format
   */
  static expectValidInsomniaV5Collection(data: any): void {
    expect(data.type).toBe('collection.insomnia.rest/5.0');
    expect(data.meta).toHaveProperty('id');
    expect(data.meta).toHaveProperty('created');
    expect(data.meta).toHaveProperty('modified');
    expect(data.collection).toBeInstanceOf(Array);
  }

  /**
   * Assert that data follows Insomnia v5 environment format
   */
  static expectValidInsomniaV5Environment(data: any): void {
    expect(data.type).toBe('environment.insomnia.rest/5.0');
    expect(data.meta).toHaveProperty('id');
    expect(data.environments).toHaveProperty('data');
  }

  /**
   * Assert that all items have unique IDs
   */
  static expectUniqueIds(items: any[]): void {
    const ids = new Set();
    const duplicates: string[] = [];
    
    items.forEach(item => {
      if (item._id) {
        if (ids.has(item._id)) {
          duplicates.push(item._id);
        }
        ids.add(item._id);
      }
    });
    
    expect(duplicates).toHaveLength(0);
  }

  /**
   * Assert UUID format is correct
   */
  static expectValidUUID(id: string, prefix: string): void {
    const regex = new RegExp(`^${prefix}_[a-f0-9]{32}$`);
    expect(id).toMatch(regex);
  }
}
