/**
 * Unit tests for handling postman api output wrapped in `collection` or `environment` objects.
 * Tests both environment and collection variable processing
 * Add this to postman-api-wrapper-handling.test.ts
 */

import { convertPostmanEnvironment } from '../../src/converter';
import { ImportPostman } from '../../src/postman-converter';
import { PostmanEnvironment } from '../../src/types/postman-environment.types';
import type {
  HttpsSchemaGetpostmanComJsonCollectionV210 as PostmanCollection,
  Variable2 as PostmanVariable,
} from '../../src/types/postman-2.1.types';

describe('Postman API Wrapper Handling', () => {
  test('should handle collection wrapped in { collection: {} }', () => {
    const collection = createTestCollection([
      {
        key: 'api_base_url',
        value: 'https://example.com',
        type: 'string',
      } as unknown as PostmanVariable,
    ]);

    const wrapped = { collection };

    const importer = new ImportPostman(collection, JSON.stringify(wrapped));
    const result = importer.importCollection();

    const collectionItem = result.find(
      (item) => item._type === 'request_group' && item.variable,
    );

    expect(collectionItem?.variable).toEqual({
      api_base_url: 'https://example.com',
    });
  });

  test('should handle environment wrapped in { environment: {} }', () => {
    const wrapped = {
      environment: createTestEnvironment(),
    };

    const [workspace, environment] = convertPostmanEnvironment(
      wrapped.environment,
    );

    expect(environment.data).toEqual({
      X_Timestamp: '',
      access_Key: '',
      collectionSchemaUrl: '',
      collection_Id: '123',
      collection_Name: 'Test',
      token: '',
      workspaceId: '',
      });
  });
});

/**
 * Helper to create a typed PostmanCollection for tests.
 */
function createTestCollection(variables: PostmanVariable[]): PostmanCollection {
  return {
      "info": {
        "_postman_id": "a54e076c-73d7-43ba-9a82-ecf9db1bf773",
        "name": "httpbin.org Demo",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        "updatedAt": "2025-06-26T12:31:20.000Z",
        "createdAt": "2025-06-26T12:31:19.000Z",
        "lastUpdatedBy": "46053229",
        "uid": "46053229-a54e076c-73d7-43ba-9a82-ecf9db1bf773"
      },
      "item": [
        {
          "name": "/json",
          "id": "c1441866-d4b3-4efa-af90-ae307909f2dc",
          "protocolProfileBehavior": {
            "disableBodyPruning": true
          },
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "https://httpbin.org/json",
              "protocol": "https",
              "host": [
                "httpbin",
                "org"
              ],
              "path": [
                "json"
              ]
            }
          },
          "response": [],
          "uid": "46053229-c1441866-d4b3-4efa-af90-ae307909f2dc"
        },
        {
          "name": "/xml",
          "id": "102dfd27-7a89-4b32-82dc-c97bd598891e",
          "protocolProfileBehavior": {
            "disableBodyPruning": true
          },
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "https://httpbin.org/xml",
              "protocol": "https",
              "host": [
                "httpbin",
                "org"
              ],
              "path": [
                "xml"
              ]
            }
          },
          "response": [],
          "uid": "46053229-102dfd27-7a89-4b32-82dc-c97bd598891e"
        },
        {
          "name": "/get",
          "id": "44386252-b7ce-4d2f-9b70-db04c0c1a789",
          "protocolProfileBehavior": {
            "disableBodyPruning": true
          },
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "https://httpbin.org/get",
              "protocol": "https",
              "host": [
                "httpbin",
                "org"
              ],
              "path": [
                "get"
              ]
            }
          },
          "response": [],
          "uid": "46053229-44386252-b7ce-4d2f-9b70-db04c0c1a789"
        }
      ],
      "variable": variables,
  } as unknown as PostmanCollection;
}

/**
 * Helper to create a more realistic PostmanEnvironment with extra fields.
 */
function createTestEnvironment(): PostmanEnvironment {
  return {
    "id": "2bed809f-29a9-478c-bd48-dd3b1652490c",
    "name": "Beta",
    "owner": "46053229",
    "createdAt": "2025-06-23T09:42:44.000Z",
    "updatedAt": "2025-07-30T14:18:34.000Z",
    "values": [
        {
            "key": "token",
            "value": "",
            "enabled": true,
            "type": "default"
        },
        {
            "key": "collection_Name",
            "value": "Test",
            "enabled": true,
            "type": "default"
        },
        {
            "key": "collectionSchemaUrl",
            "value": "",
            "enabled": true,
            "type": "default"
        },
        {
            "key": "access_Key",
            "value": "",
            "enabled": true,
            "type": "default"
        },
        {
            "key": "workspaceId",
            "value": "",
            "enabled": true,
            "type": "default"
        },
        {
            "key": "collection_Id",
            "value": "123",
            "enabled": true,
            "type": "default"
        },
        {
            "key": "X_Timestamp",
            "value": "",
            "enabled": true,
            "type": "any"
        }
    ],
    "uid": "46053229-2bed809f-29a9-478c-bd48-dd3b1652490c",
    "isPublic": false,
    "_postman_variable_scope": "environment"
  } as unknown as PostmanEnvironment;
}