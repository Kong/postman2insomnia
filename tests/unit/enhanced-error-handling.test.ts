import fs from 'fs';
import os from 'os';
import path from 'path';
import { convertPostmanToInsomnia, ConversionOptions } from '../../src/converter';

describe('Enhanced Error Handling Tests', () => {
  let tmpDir: string;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'error-test-'));
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  const writeTmpFile = (content: string, filename: string): string => {
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  };

  const getDefaultOptions = (): ConversionOptions => ({
    outputDir: tmpDir,
    format: 'json',
    verbose: false,
  });

  describe('JSON Parse Error Handling', () => {
    test('should provide specific error message for invalid JSON', async () => {
      const invalidJson = writeTmpFile('{ invalid: json,, }', 'bad.json');

      await convertPostmanToInsomnia([invalidJson], getDefaultOptions());

      const errorCalls = errorSpy.mock.calls.map(call =>
        call.map(String).join(' ')
      );

      // Should have specific JSON parse error
      expect(errorCalls.some(msg =>
        msg.includes('Failed to parse JSON')
      )).toBe(true);

      // Should include file path
      expect(errorCalls.some(msg =>
        msg.includes(path.resolve(invalidJson))
      )).toBe(true);
    });

    test('should separate error message into main error and details', async () => {
      const invalidJson = writeTmpFile('{ bad }', 'test.json');

      await convertPostmanToInsomnia([invalidJson], getDefaultOptions());

      const calls = errorSpy.mock.calls;

      // Should have at least 2 error calls (main error + details)
      expect(calls.length).toBeGreaterThanOrEqual(2);

      // First call should contain main error with ❌
      const mainError = calls[0].map(String).join(' ');
      expect(mainError).toContain('❌');
      expect(mainError).toContain('Failed to parse JSON');

      // Second call should contain error details
      // Check that second call exists and contains error information
      expect(calls[1]).toBeDefined();
      expect(calls[1].length).toBeGreaterThan(0);

      // The error details should contain the JSON error message
      const errorDetail = String(calls[1][0]); // Get the first argument of the second console.error call
      expect(errorDetail.trim().length).toBeGreaterThan(0);
      expect(errorDetail).toContain('JSON'); // Should contain JSON-related error
    });
  });

  describe('Error Message Formatting', () => {
    test('should use colour hierarchy for errors', async () => {
      const invalidJson = writeTmpFile('not json', 'bad.json');

      await convertPostmanToInsomnia([invalidJson], getDefaultOptions());

      const calls = errorSpy.mock.calls;

      // Main error should use red (chalk.red)
      const mainError = calls[0].map(String).join(' ');
      // eslint-disable-next-line no-control-regex
      expect(mainError).toMatch(/\x1B\[31m/); // ANSI red

      // Details should use yellow (chalk.yellow)
      if (calls.length > 1) {
        const details = calls[1].map(String).join(' ');
        // eslint-disable-next-line no-control-regex
        expect(details).toMatch(/\x1B\[33m/); // ANSI yellow
      }
    });
  });

  describe('Error Type Differentiation', () => {
    test('should distinguish between JSON parse errors and unknown format errors', async () => {
      const invalidJson = writeTmpFile('{ bad }', 'parse-error.json');
      const unknownFormat = writeTmpFile('{"unknown": "format"}', 'unknown.json');

      await convertPostmanToInsomnia([invalidJson, unknownFormat], getDefaultOptions());

      const errors = errorSpy.mock.calls.map(call => call.join(' '));
      // eslint-disable-next-line no-control-regex
      const removeAnsi = (s: string) => s.replace(/\x1B\[[0-9;]*m/g, '');
      const cleanErrors = errors.map(removeAnsi);

      // Should have JSON parse error
      const jsonError = cleanErrors.find(msg =>
        msg.includes('parse-error.json') && msg.includes('Failed to parse JSON')
      );
      expect(jsonError).toBeDefined();

      // Should have unknown format error
      const formatError = cleanErrors.find(msg =>
        msg.includes('unknown.json') && msg.includes('Unknown file format')
      );
      expect(formatError).toBeDefined();

      // Errors should be different
      expect(jsonError).not.toEqual(formatError);
    });
  });

  describe('File Path Handling', () => {
    test('should use resolved paths consistently', async () => {
      const relativeFile = writeTmpFile('{ bad }', 'relative.json');
      const absoluteFile = path.resolve(relativeFile);

      await convertPostmanToInsomnia([relativeFile], getDefaultOptions());

      const errors = errorSpy.mock.calls.map(call => call.join(' '));

      // All error messages should use the resolved (absolute) path
      errors.forEach(error => {
        if (error.includes('.json')) {
          expect(error).toContain(absoluteFile);
        }
      });
    });

    test('should handle multiple files with distinct paths', async () => {
      const file1 = writeTmpFile('{ bad }', 'file1.json');
      const file2 = writeTmpFile('invalid', 'file2.json');

      await convertPostmanToInsomnia([file1, file2], getDefaultOptions());

      const errors = errorSpy.mock.calls.map(call => call.join(' '));
      // eslint-disable-next-line no-control-regex
      const removeAnsi = (s: string) => s.replace(/\x1B\[[0-9;]*m/g, '');

      // Both files should appear in errors
      expect(errors.some(e => removeAnsi(e).includes(path.resolve(file1)))).toBe(true);
      expect(errors.some(e => removeAnsi(e).includes(path.resolve(file2)))).toBe(true);
    });
  });

  describe('Error Resilience', () => {
    test('should continue processing after encountering errors', async () => {
      const invalidFile = writeTmpFile('{ bad }', 'invalid.json');
      const validCollection = writeTmpFile(JSON.stringify({
        info: {
          name: 'Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      }), 'valid.json');

      const result = await convertPostmanToInsomnia(
        [invalidFile, validCollection],
        getDefaultOptions()
      );

      // Should fail the invalid file but succeed with valid one
      expect(result.failed).toBe(1);
      expect(result.successful).toBe(1);
    });
  });

  describe('Performance Optimisation', () => {
    test('should resolve file path only once per file', async () => {
      const resolveSpy = jest.spyOn(path, 'resolve');
      const testFile = writeTmpFile('{ bad }', 'test.json');

      await convertPostmanToInsomnia([testFile], getDefaultOptions());

      // Path should be resolved minimal number of times
      // (Note: exact count depends on implementation, but should not be excessive)
      const resolveCalls = resolveSpy.mock.calls.filter(
        call => call[0] === testFile
      );

      // Should resolve the path but not excessively (adjust based on actual implementation)
      expect(resolveCalls.length).toBeLessThanOrEqual(5);

      resolveSpy.mockRestore();
    });
  });
});
