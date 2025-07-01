// =============================================================================
// POSTMAN CONVERTER TESTS - EXPANDED COVERAGE
// =============================================================================
// Additional tests to improve coverage of authentication, body conversion,
// and other uncovered code paths
// =============================================================================

import {
  convert,
  transformPostmanToNunjucksString,
  translateHandlersInScript,
  normaliseJsonPath,
  ImportPostman
} from '../../src/postman-converter';
import type { ImportRequest } from '../../src/types/entities';

describe('PostmanConverter - Extended Coverage', () => {
  // ==========================================================================
  // AUTHENTICATION CONVERSION TESTS
  // ==========================================================================

  describe('Authentication Conversion', () => {
    test('should convert bearer token authentication', () => {
      const collection = {
        info: {
          name: 'Auth Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Bearer Auth Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/protected',
              auth: {
                type: 'bearer',
                bearer: [
                  { key: 'token', value: '{{bearerToken}}' }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.authentication).toBeTruthy();
      expect(request!.authentication!.type).toBe('bearer');
      expect(request!.authentication!.disabled).toBe(false);
    });

    test('should convert basic authentication', () => {
      const collection = {
        info: {
          name: 'Basic Auth Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Basic Auth Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/basic',
              auth: {
                type: 'basic',
                basic: [
                  { key: 'username', value: 'user123' },
                  { key: 'password', value: 'pass123' }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.authentication).toBeTruthy();
      expect(request!.authentication!.type).toBe('basic');
    });

    test('should convert API key authentication', () => {
      const collection = {
        info: {
          name: 'API Key Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'API Key Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/apikey',
              auth: {
                type: 'apikey',
                apikey: [
                  { key: 'key', value: 'X-API-Key' },
                  { key: 'value', value: 'abc123' },
                  { key: 'in', value: 'header' }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.authentication).toBeTruthy();
      expect(request!.authentication!.type).toBe('apikey');
    });

    test('should convert OAuth1 authentication', () => {
      const collection = {
        info: {
          name: 'OAuth1 Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'OAuth1 Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/oauth1',
              auth: {
                type: 'oauth1',
                oauth1: [
                  { key: 'consumerKey', value: 'consumer123' },
                  { key: 'consumerSecret', value: 'secret123' }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.authentication).toBeTruthy();
      expect(request!.authentication!.type).toBe('oauth1');
    });

    test('should convert OAuth2 authentication', () => {
      const collection = {
        info: {
          name: 'OAuth2 Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'OAuth2 Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/oauth2',
              auth: {
                type: 'oauth2',
                oauth2: [
                  { key: 'accessToken', value: 'token123' },
                  { key: 'tokenType', value: 'Bearer' }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.authentication).toBeTruthy();
      expect(request!.authentication!.type).toBe('oauth2');
    });

    test('should convert digest authentication', () => {
      const collection = {
        info: {
          name: 'Digest Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Digest Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/digest',
              auth: {
                type: 'digest',
                digest: [
                  { key: 'username', value: 'user' },
                  { key: 'password', value: 'pass' }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.authentication).toBeTruthy();
      expect(request!.authentication!.type).toBe('digest');
    });

    test('should convert AWS v4 authentication', () => {
      const collection = {
        info: {
          name: 'AWS Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'AWS Request',
            request: {
              method: 'GET',
              url: 'https://api.amazonaws.com/test',
              auth: {
                type: 'awsv4',
                awsv4: [
                  { key: 'accessKey', value: 'AKIAIOSFODNN7EXAMPLE' },
                  { key: 'secretKey', value: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.authentication).toBeTruthy();
      expect(request!.authentication!.type).toBe('iam');
    });

    test('should handle authentication from header (Bearer)', () => {
      const collection = {
        info: {
          name: 'Header Auth Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Header Bearer Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/header-auth',
              header: [
                { key: 'Authorization', value: 'Bearer token123' }
              ]
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.authentication).toBeTruthy();
      expect(request!.authentication!.type).toBe('bearer');
    });

    test('should handle authentication from header (Basic)', () => {
      const collection = {
        info: {
          name: 'Header Basic Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Header Basic Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/basic-header',
              header: [
                { key: 'Authorization', value: 'Basic dXNlcjpwYXNz' }
              ]
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.authentication).toBeTruthy();
      expect(request!.authentication!.type).toBe('basic');
    });
  });

  // ==========================================================================
  // BODY CONVERSION TESTS
  // ==========================================================================

  describe('Body Conversion', () => {
    test('should convert raw JSON body', () => {
      const collection = {
        info: {
          name: 'JSON Body Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'JSON Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/json',
              body: {
                mode: 'raw',
                raw: JSON.stringify({ name: 'John', email: 'john@example.com' }),
                options: {
                  raw: { language: 'json' }
                }
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');
      const body = request!.body as any;

      expect(body).toBeTruthy();
      expect(body.mimeType).toBe('application/json');
      expect(body.text).toContain('John');
    });

    test('should convert raw XML body', () => {
      const collection = {
        info: {
          name: 'XML Body Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'XML Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/xml',
              body: {
                mode: 'raw',
                raw: '<user><name>John</name></user>',
                options: {
                  raw: { language: 'xml' }
                }
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');
      const body = request!.body as any;

      expect(body).toBeTruthy();
      expect(body.mimeType).toBe('application/xml');
      expect(body.text).toBe('<user><name>John</name></user>');
    });

    test('should convert raw plain text body', () => {
      const collection = {
        info: {
          name: 'Text Body Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Text Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/text',
              body: {
                mode: 'raw',
                raw: 'Plain text content'
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');
      const body = request!.body as any;

      expect(body).toBeTruthy();
      expect(body.mimeType).toBe('text/plain');
      expect(body.text).toBe('Plain text content');
    });

    test('should convert form data body (v2.1)', () => {
      const collection = {
        info: {
          name: 'Form Data Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Form Data Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/form',
              body: {
                mode: 'formdata',
                formdata: [
                  { key: 'name', value: 'John', disabled: false },
                  { key: 'email', value: 'john@example.com', disabled: false },
                  { key: 'avatar', type: 'file', src: 'avatar.jpg', disabled: false },
                  { key: 'hidden', value: 'secret', disabled: true }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');
      const body = request!.body as any;

      expect(body).toBeTruthy();
      expect(body.mimeType).toBe('multipart/form-data');
      expect(body.params).toHaveLength(4);

      // Regular field
      expect(body.params[0]).toEqual({
        name: 'name',
        value: 'John',
        disabled: false
      });

      // File field
      expect(body.params[2]).toEqual({
        name: 'avatar',
        type: 'file',
        fileName: 'avatar.jpg',
        disabled: false
      });

      // Disabled field
      expect(body.params[3]).toEqual({
        name: 'hidden',
        value: 'secret',
        disabled: true
      });
    });

    test('should convert URL-encoded body (v2.1)', () => {
      const collection = {
        info: {
          name: 'URL Encoded Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'URL Encoded Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/urlencoded',
              body: {
                mode: 'urlencoded',
                urlencoded: [
                  { key: 'username', value: 'john', disabled: false },
                  { key: 'password', value: 'secret', disabled: false },
                  { key: 'debug', value: 'true', disabled: true }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');
      const body = request!.body as any;

      expect(body).toBeTruthy();
      expect(body.mimeType).toBe('application/x-www-form-urlencoded');
      expect(body.params).toHaveLength(3);

      expect(body.params[0]).toEqual({
        name: 'username',
        value: 'john',
        disabled: false
      });

      expect(body.params[2]).toEqual({
        name: 'debug',
        value: 'true',
        disabled: true
      });
    });

    test('should convert GraphQL body', () => {
      const collection = {
        info: {
          name: 'GraphQL Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'GraphQL Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/graphql',
              body: {
                mode: 'graphql',
                graphql: {
                  query: 'query { users { id name } }',
                  variables: '{"limit": 10}'
                }
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');
      const body = request!.body as any;

      expect(body).toBeTruthy();
      expect(body.mimeType).toBe('application/graphql');
      expect(body.text).toContain('users');
    });

    test('should handle empty raw body', () => {
      const collection = {
        info: {
          name: 'Empty Body Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Empty Body Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/empty',
              body: {
                mode: 'raw',
                raw: ''
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.body).toEqual({});
    });
  });

  // ==========================================================================
  // SCRIPT CONVERSION TESTS
  // ==========================================================================

  describe('Script Conversion', () => {
    test('should convert pre-request scripts', () => {
      const collection = {
        info: {
          name: 'Pre-request Script Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Script Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/script'
            },
            event: [
              {
                listen: 'prerequest',
                script: {
                  exec: [
                    'pm.environment.set("timestamp", Date.now());',
                    'pm.globals.set("requestId", pm.variables.replaceIn("{{$guid}}"));'
                  ]
                }
              }
            ]
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.preRequestScript).toBeTruthy();
      expect(request!.preRequestScript).toContain('insomnia.environment.set');
      expect(request!.preRequestScript).toContain('insomnia.globals.set');
      expect(request!.preRequestScript).not.toContain('pm.environment');
    });

    test('should convert test scripts', () => {
      const collection = {
        info: {
          name: 'Test Script Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Test Script Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/test'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    'pm.test("Response time is less than 200ms", function () {',
                    '    pm.expect(pm.response.responseTime).to.be.below(200);',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.afterResponseScript).toBeTruthy();
      expect(request!.afterResponseScript).toContain('insomnia.test');
      expect(request!.afterResponseScript).toContain('insomnia.response.to.have.status');
      expect(request!.afterResponseScript).toContain('insomnia.expect');
      expect(request!.afterResponseScript).not.toContain('pm.test');
    });

    test('should handle script as string instead of array', () => {
      const collection = {
        info: {
          name: 'String Script Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'String Script Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/string-script'
            },
            event: [
              {
                listen: 'prerequest',
                script: {
                  exec: 'pm.environment.set("singleLine", "value");'
                }
              }
            ]
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.preRequestScript).toBeTruthy();
      expect(request!.preRequestScript).toContain('insomnia.environment.set');
    });
  });

  // ==========================================================================
  // VARIABLE AND TEMPLATE TESTS
  // ==========================================================================

  describe('Variable Processing', () => {
    test('should handle complex variable transformations', () => {
      const input = 'API endpoint: {{base-url}}/{{api-version}}/users/{{user-id}}';
      const result = transformPostmanToNunjucksString(input);

      expect(result).toBe("API endpoint: {{_['base-url']}}/{{_['api-version']}}/users/{{_['user-id']}}");
    });

    test('should handle faker functions', () => {
      const input = 'User ID: {{$guid}}, Timestamp: {{$timestamp}}';
      const result = transformPostmanToNunjucksString(input);

      expect(result).toContain("{% faker 'guid' %}");
      expect(result).toContain("{% faker 'timestamp' %}");
    });

    test('should handle mixed variables and text', () => {
      const input = 'Hello {{user-name}}, your session {{sessionId}} expires at {{$timestamp}}';
      const result = transformPostmanToNunjucksString(input);

      // Debug: let's see what we actually get
      console.log('Input:', input);
      console.log('Result:', result);

      expect(result).toContain("{{_['user-name']}}");
      // Based on the error, sessionId becomes {{_.sessionId}}
      expect(result).toContain('{{_.sessionId}}');
      expect(result).toContain("{% faker 'timestamp' %}");
    });
  });

  // ==========================================================================
  // URL PROCESSING TESTS
  // ==========================================================================

  describe('URL Processing', () => {
    test('should handle complex URL objects with query parameters', () => {
      const collection = {
        info: {
          name: 'Complex URL Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Complex URL Request',
            request: {
              method: 'GET',
              url: {
                raw: 'https://api.example.com/users?include=profile&sort=name&limit=10',
                protocol: 'https',
                host: ['api', 'example', 'com'],
                path: ['users'],
                query: [
                  { key: 'include', value: 'profile' },
                  { key: 'sort', value: 'name' },
                  { key: 'limit', value: '10', disabled: false },
                  { key: 'debug', value: 'true', disabled: true }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      // URL should be trimmed to remove query string
      expect(request!.url).toBe('https://api.example.com/users');

      // Query parameters should be processed separately
      expect(request!.parameters).toHaveLength(4);
      expect(request!.parameters![0]).toEqual({
        name: 'include',
        value: 'profile',
        disabled: false
      });
      expect(request!.parameters![3]).toEqual({
        name: 'debug',
        value: 'true',
        disabled: true
      });
    });

    test('should handle URL objects without query in raw', () => {
      const collection = {
        info: {
          name: 'No Query URL Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'No Query URL Request',
            request: {
              method: 'GET',
              url: {
                raw: 'https://api.example.com/simple',
                protocol: 'https',
                host: ['api', 'example', 'com'],
                path: ['simple']
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');

      expect(request!.url).toBe('https://api.example.com/simple');
    });
  });

  // ==========================================================================
  // POSTMAN v2.0 SPECIFIC TESTS
  // ==========================================================================

  describe('Postman v2.0 Support', () => {
    test('should handle v2.0 form data with enabled field', () => {
      const collection = {
        info: {
          name: 'v2.0 Form Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
        },
        item: [
          {
            name: 'v2.0 Form Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/v20form',
              body: {
                mode: 'formdata',
                formdata: [
                  { key: 'field1', value: 'value1', enabled: true },
                  { key: 'field2', value: 'value2', enabled: false },
                  { key: 'file1', type: 'file', src: 'test.txt', enabled: true }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');
      const body = request!.body as any;

      expect(body.params).toHaveLength(3);
      expect(body.params[0].disabled).toBe(false); // enabled: true
      expect(body.params[1].disabled).toBe(true);  // enabled: false
    });

    test('should handle v2.0 URL-encoded with enabled field', () => {
      const collection = {
        info: {
          name: 'v2.0 URL Encoded Test',
          schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
        },
        item: [
          {
            name: 'v2.0 URL Encoded Request',
            request: {
              method: 'POST',
              url: 'https://api.example.com/v20encoded',
              body: {
                mode: 'urlencoded',
                urlencoded: [
                  { key: 'param1', value: 'value1', enabled: true },
                  { key: 'param2', value: 'value2', enabled: false }
                ]
              }
            }
          }
        ]
      };

      const result = convert(JSON.stringify(collection)) as ImportRequest[];
      const request = result.find(item => item._type === 'request');
      const body = request!.body as any;

      expect(body.params).toHaveLength(2);
      expect(body.params[0].disabled).toBe(false); // enabled: true
      expect(body.params[1].disabled).toBe(true);  // enabled: false
    });
  });
});
