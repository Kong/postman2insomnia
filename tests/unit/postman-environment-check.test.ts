import { isPostmanEnvironment, convertPostmanEnvironment } from '../../src/converter';

// Define a simple type for the Insomnia resource for cleaner tests
interface InsomniaResource {
  _id: string;
  _type: string;
  data?: any;
  [key: string]: any;
}

describe('isPostmanEnvironment', () => {

  // Test case for a standard environment exported from the Postman UI
  it('should return true for a valid environment from UI export', () => {
    const uiExport = {
      id: 'd1b8f8f0-1b1d-4f6e-8a8a-1b1d1b1d1b1d',
      name: 'UI Environment',
      values: [
        { key: 'baseUrl', value: 'https://api.example.com', enabled: true },
        { key: 'token', value: 'secret', enabled: false },
      ],
      _postman_variable_scope: 'environment',
    };
    expect(isPostmanEnvironment(uiExport)).toBe(true);
  });

  // Test case for an environment from the Postman API, which lacks the scope property
  it('should return true for a valid environment from API export', () => {
    const apiExport = {
      id: 'e2c9g9g0-2c2e-5g7f-9b9b-2c2e2c2e2c2e',
      name: 'API Environment',
      values: [
        { key: 'apiKey', value: '12345', enabled: true },
      ],
    };
    expect(isPostmanEnvironment(apiExport)).toBe(true);
  });

  // Test case for an environment that has no variables
  it('should return true for an environment with an empty values array', () => {
    const emptyEnv = {
      id: 'f3d0h0h0-3d3f-6h8g-0c0c-3d3f3d3f3d3f',
      name: 'Empty Environment',
      values: [],
    };
    expect(isPostmanEnvironment(emptyEnv)).toBe(true);
  });

  // Test case to ensure it doesn't misidentify a collection
  it('should return false for a valid Postman collection', () => {
    const collection = {
      info: {
        _postman_id: 'g4e1i1i1-4e4g-7i9h-1d1d-4e4g4e4g4e4g',
        name: 'My Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [],
    };
    expect(isPostmanEnvironment(collection)).toBe(false);
  });

  // Test cases for various invalid or malformed inputs
  it('should return false for an object missing the "name" property', () => {
    const invalid = { values: [] };
    expect(isPostmanEnvironment(invalid)).toBe(false);
  });

  it('should return false for an object missing the "values" property', () => {
    const invalid = { name: 'Invalid Env' };
    expect(isPostmanEnvironment(invalid)).toBe(false);
  });

  it('should return false for a values array where items are not objects', () => {
    const invalid = { name: 'Invalid Env', values: ['not-an-object'] };
    expect(isPostmanEnvironment(invalid)).toBe(false);
  });

  it('should return false for a values array where items lack key/value pairs', () => {
    const invalid = { name: 'Invalid Env', values: [{ foo: 'bar' }] };
    expect(isPostmanEnvironment(invalid)).toBe(false);
  });

  it('should return false for null or non-object inputs', () => {
    expect(isPostmanEnvironment(null)).toBe(false);
    expect(isPostmanEnvironment(undefined)).toBe(false);
    expect(isPostmanEnvironment('not an object')).toBe(false);
    expect(isPostmanEnvironment(12345)).toBe(false);
  });
});

describe('convertPostmanEnvironment', () => {

  // Test case for a standard conversion
  it('should convert a standard environment and filter disabled variables', () => {
    const postmanEnv = {
      name: 'Test Project',
      values: [
        { key: 'host', value: 'https://api.test.com', enabled: true },
        { key: 'apiKey', value: 'super-secret', enabled: true },
        { key: 'debugMode', value: 'true', enabled: false }, // Should be skipped
      ],
    };

    const result = convertPostmanEnvironment(postmanEnv);
    const insomniaEnv = result.find((item: InsomniaResource) => item._type === 'environment');

    expect(insomniaEnv.data).toEqual({
      host: 'https://api.test.com',
      apiKey: 'super-secret',
    });
    // The 'debugMode' key should not be present
    expect(insomniaEnv.data).not.toHaveProperty('debugMode');
  });

  // Test case for when all variables are disabled
  it('should produce an empty data object if all variables are disabled', () => {
    const postmanEnv = {
      name: 'All Disabled',
      values: [
        { key: 'host', value: 'https://api.test.com', enabled: false },
        { key: 'apiKey', value: 'super-secret', enabled: false },
      ],
    };

    const result = convertPostmanEnvironment(postmanEnv);
    const insomniaEnv = result.find((item: InsomniaResource) => item._type === 'environment');

    expect(insomniaEnv.data).toEqual({});
  });

  // Test case for an empty environment
  it('should produce an empty data object for an environment with no variables', () => {
    const postmanEnv = {
      name: 'Empty Env',
      values: [],
    };

    const result = convertPostmanEnvironment(postmanEnv);
    const insomniaEnv = result.find((item: InsomniaResource) => item._type === 'environment');

    expect(insomniaEnv.data).toEqual({});
  });
});
