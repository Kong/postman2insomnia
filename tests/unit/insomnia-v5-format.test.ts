// tests/integration/insomnia-v5-format.test.ts
/**
 * Integration tests for Insomnia v5 format conversion
 *
 * These tests validate that our types work correctly with actual
 * conversion functions and produce valid Insomnia v5 output.
 */

import { convertPostmanToInsomnia, ConversionOptions } from '../../src/converter';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Insomnia v5 Format Integration', () => {
  let tempDir: string;
  let outputDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'insomnia-test-'));
    outputDir = path.join(tempDir, 'output');
    fs.mkdirSync(outputDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Collection Export Format', () => {
    test('should produce valid collection export structure', async () => {
      // Create a temporary Postman collection file
      const postmanCollection = {
        info: {
          name: 'Test Collection',
          description: 'A test collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Get Users',
            request: {
              method: 'GET',
              header: [
                {
                  key: 'Accept',
                  value: 'application/json'
                }
              ],
              url: {
                raw: 'https://api.example.com/users?page=1',
                host: ['api', 'example', 'com'],
                path: ['users'],
                query: [
                  {
                    key: 'page',
                    value: '1'
                  }
                ]
              }
            }
          }
        ],
        variable: [
          {
            key: 'baseUrl',
            value: 'https://api.example.com'
          }
        ]
      };

      const collectionFile = path.join(tempDir, 'collection.json');
      fs.writeFileSync(collectionFile, JSON.stringify(postmanCollection, null, 2));

      const options: ConversionOptions = {
        outputDir,
        format: 'yaml',
        verbose: false
      };

      const result = await convertPostmanToInsomnia([collectionFile], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.outputs).toHaveLength(1);

      // Check that the output file exists
      const outputFile = result.outputs[0];
      expect(fs.existsSync(outputFile)).toBe(true);
      expect(path.extname(outputFile)).toBe('.yaml');
      expect(path.basename(outputFile)).toBe('collection.insomnia.yaml');
    });

    test('should handle complex collection with nested folders', async () => {
      const postmanCollection = {
        info: {
          name: 'Complex Collection',
          description: 'Collection with nested folders',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Authentication',
            item: [
              {
                name: 'Login',
                request: {
                  method: 'POST',
                  header: [
                    {
                      key: 'Content-Type',
                      value: 'application/json'
                    }
                  ],
                  body: {
                    mode: 'raw',
                    raw: '{"username": "user", "password": "pass"}'
                  },
                  url: {
                    raw: 'https://api.example.com/auth/login',
                    host: ['api', 'example', 'com'],
                    path: ['auth', 'login']
                  }
                }
              }
            ]
          },
          {
            name: 'Health Check',
            request: {
              method: 'GET',
              url: {
                raw: 'https://api.example.com/health',
                host: ['api', 'example', 'com'],
                path: ['health']
              }
            }
          }
        ]
      };

      const collectionFile = path.join(tempDir, 'complex-collection.json');
      fs.writeFileSync(collectionFile, JSON.stringify(postmanCollection, null, 2));

      const options: ConversionOptions = {
        outputDir,
        format: 'yaml',
        verbose: false
      };

      const result = await convertPostmanToInsomnia([collectionFile], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.outputs).toHaveLength(1);

      // Verify the output file
      const outputFile = result.outputs[0];
      expect(fs.existsSync(outputFile)).toBe(true);
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('type: collection.insomnia.rest/5.0');
      expect(content).toContain('name: Complex Collection');
      expect(content).toContain('Login');
      expect(content).toContain('Health Check');
    });
  });

  describe('Environment Export Format', () => {
    test('should produce valid environment export structure', async () => {
      const postmanEnvironment = {
        name: 'Test Environment',
        values: [
          {
            key: 'apiUrl',
            value: 'https://dev-api.example.com',
            enabled: true
          },
          {
            key: 'timeout',
            value: '5000',
            enabled: true
          },
          {
            key: 'debug',
            value: 'true',
            enabled: true
          },
          {
            key: 'disabled_var',
            value: 'should_not_appear',
            enabled: false
          }
        ]
      };

      const envFile = path.join(tempDir, 'environment.json');
      fs.writeFileSync(envFile, JSON.stringify(postmanEnvironment, null, 2));

      const options: ConversionOptions = {
        outputDir,
        format: 'yaml',
        verbose: false
      };

      const result = await convertPostmanToInsomnia([envFile], options);

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.outputs).toHaveLength(1);

      // Check that the output file exists and has correct content
      const outputFile = result.outputs[0];
      expect(fs.existsSync(outputFile)).toBe(true);
      expect(path.extname(outputFile)).toBe('.yaml');
      expect(path.basename(outputFile)).toBe('environment.insomnia.yaml');

      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('type: environment.insomnia.rest/5.0');
      expect(content).toContain('name: Test Environment');
      expect(content).toContain('apiUrl: https://dev-api.example.com');
      expect(content).toContain("timeout: '5000'");
      expect(content).toContain("debug: 'true'");
      expect(content).not.toContain('disabled_var');
      expect(content).not.toContain('should_not_appear');
    });
  });

  describe('Mixed File Processing', () => {
    test('should handle both collection and environment files', async () => {
      const postmanCollection = {
        info: {
          name: 'Mixed Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Simple Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/test'
            }
          }
        ]
      };

      const postmanEnvironment = {
        name: 'Mixed Test Environment',
        values: [
          {
            key: 'testVar',
            value: 'testValue',
            enabled: true
          }
        ]
      };

      const collectionFile = path.join(tempDir, 'collection.json');
      const envFile = path.join(tempDir, 'environment.json');

      fs.writeFileSync(collectionFile, JSON.stringify(postmanCollection, null, 2));
      fs.writeFileSync(envFile, JSON.stringify(postmanEnvironment, null, 2));

      const options: ConversionOptions = {
        outputDir,
        format: 'yaml',
        verbose: false
      };

      const result = await convertPostmanToInsomnia([collectionFile, envFile], options);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.outputs).toHaveLength(2);

      // Check both output files exist
      const outputFiles = result.outputs.sort();
      expect(outputFiles[0]).toContain('collection.insomnia.yaml');
      expect(outputFiles[1]).toContain('environment.insomnia.yaml');

      expect(fs.existsSync(outputFiles[0])).toBe(true);
      expect(fs.existsSync(outputFiles[1])).toBe(true);

      // Verify content types
      const collectionContent = fs.readFileSync(outputFiles[0], 'utf8');
      const envContent = fs.readFileSync(outputFiles[1], 'utf8');

      expect(collectionContent).toContain('type: collection.insomnia.rest/5.0');
      expect(envContent).toContain('type: environment.insomnia.rest/5.0');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JSON files gracefully', async () => {
      const invalidFile = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(invalidFile, '{ invalid json content');

      const options: ConversionOptions = {
        outputDir,
        format: 'yaml',
        verbose: false
      };

      // Suppress console.error for this test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const result = await convertPostmanToInsomnia([invalidFile], options);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.outputs).toHaveLength(0);

      // Restore console.error
      console.error = originalConsoleError;
    });

    test('should handle unrecognized file formats', async () => {
      const unknownFile = path.join(tempDir, 'unknown.json');
      fs.writeFileSync(unknownFile, JSON.stringify({ random: 'data' }));

      const options: ConversionOptions = {
        outputDir,
        format: 'yaml',
        verbose: false
      };

      // Suppress console.error for this test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      const result = await convertPostmanToInsomnia([unknownFile], options);

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.outputs).toHaveLength(0);

      // Restore console.error
      console.error = originalConsoleError;
    });
  });
});
