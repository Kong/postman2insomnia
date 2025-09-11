import fs from 'fs';
import os from 'os';
import path from 'path';
import { convertPostmanToInsomnia, convertPostmanEnvironment } from '../../src/converter';
import { ConversionOptions } from '../../src/converter';

describe('Postman API Wrapper Handling', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'postman-wrapper-test-'));

  const writeTmpFile = (content: object, filename: string): string => {
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
    return filePath;
  };

  const defaultOptions: ConversionOptions = {
    outputDir: tmpDir,
    format: 'json',
    verbose: true,
    preprocess: false,
    postprocess: false,
  };

  test('should handle collection wrapped in { collection: {} }', async () => {
    const wrappedCollection = {
      collection: {
        info: {
          name: 'Wrapped Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: [
          {
            name: 'My Folder',
            item: [
              {
                name: 'My Request',
                request: {
                  method: 'GET',
                  url: { raw: 'https://api.example.com', host: ['api', 'example', 'com'] },
                },
              },
            ],
          },
        ],
      },
    };

    const tmpFile = writeTmpFile(wrappedCollection, 'wrapped-collection.json');

    const result = await convertPostmanToInsomnia([tmpFile], defaultOptions);

    expect(result.successful).toBe(1);
    expect(result.outputs.length).toBe(1);

    const outputFile = result.outputs[0];
    const outputContent = JSON.parse(fs.readFileSync(outputFile, 'utf8'));

    expect(outputContent.collection.length).toBeGreaterThan(0);
    const firstItem = outputContent.collection[0];
    expect(firstItem).toHaveProperty('name');
  });

  test('should handle environment wrapped in { environment: {} }', () => {
    const wrappedEnv = {
      environment: {
        name: 'Wrapped Env',
        values: [
          { key: 'api_key', value: '12345', enabled: true },
          { key: 'disabled_key', value: 'xxxx', enabled: false },
        ],
      },
    };

    const [workspace, environment] = convertPostmanEnvironment(wrappedEnv);

    expect(workspace._type).toBe('workspace');
    expect(environment._type).toBe('environment');
    expect(environment.data).toHaveProperty('api_key', '12345');
    expect(environment.data).not.toHaveProperty('disabled_key'); // disabled should be excluded
  });
});
