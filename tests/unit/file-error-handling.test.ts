import fs from 'fs';
import os from 'os';
import path from 'path';
import { convertPostmanToInsomnia, ConversionOptions } from '../../src/converter';

describe('Postman API Wrapper Handling - Error Cases', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'postman-wrapper-test-'));

  const writeTmpFile = (content: string, filename: string): string => {
    const filePath = path.join(tmpDir, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  };

  const defaultOptions: ConversionOptions = {
    outputDir: tmpDir,
    format: 'json',
    verbose: false,
  };

  test('should log distinct errors for invalid collection and environment', async () => {
    // 1️⃣ Invalid JSON (parse error) for collection
    const invalidCollection = writeTmpFile('{ invalidJson: true,, }', 'invalidCollection.json');

    // 2️⃣ Valid JSON but invalid schema for environment
    const invalidEnvironment = writeTmpFile(
      JSON.stringify({ environment: { name: 'Bad Env', vals: [] } }),
      'invalidEnvironment.json'
    );

    const errorMessages: string[] = [];
    const errorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      errorMessages.push(args.map(String).join(' '));
    });

    await convertPostmanToInsomnia([invalidCollection, invalidEnvironment], defaultOptions);

    errorSpy.mockRestore();

    const removeAnsiCodes = (str: string) => str.replace(/\x1B\[[0-9;]*m/g, '');
    const cleanedMessages = errorMessages.map(removeAnsiCodes);

    console.log('Captured error messages:', cleanedMessages);

    const collectionPath = path.resolve(invalidCollection);
    const envPath = path.resolve(invalidEnvironment);

    // ✅ Check that both paths appear in errors
    expect(cleanedMessages.some(msg => msg.includes(collectionPath))).toBe(true);
    expect(cleanedMessages.some(msg => msg.includes(envPath))).toBe(true);

    // ✅ Check that errors are different
    expect(cleanedMessages.find(msg => msg.includes(collectionPath)))
      .not.toEqual(cleanedMessages.find(msg => msg.includes(envPath)));
  });
});
