/**
 * Unit tests for variable name transformation (dots to underscores)
 * Tests both environment and collection variable processing
 * Add this to variable-transformation.test.ts
 */

import { convertPostmanEnvironment, transformVariableName } from '../../src/converter';
import { ImportPostman } from '../../src/postman-converter';
import { PostmanEnvironment } from '../../src/types/postman-environment.types';
import type {
  HttpsSchemaGetpostmanComJsonCollectionV210 as PostmanCollection,
  Variable2 as PostmanVariable
} from '../../src/types/postman-2.1.types';

describe('Variable Name Transformation (Dots to Underscores)', () => {

  describe('transformVariableName helper function', () => {
    test('should replace single dot with underscore', () => {
      expect(transformVariableName('api.key')).toBe('api_key');
      expect(transformVariableName('user.id')).toBe('user_id');
      expect(transformVariableName('base.url')).toBe('base_url');
    });

    test('should replace multiple dots with underscores', () => {
      expect(transformVariableName('user.profile.name')).toBe('user_profile_name');
      expect(transformVariableName('config.database.connection.url')).toBe('config_database_connection_url');
      expect(transformVariableName('service.auth.token.bearer')).toBe('service_auth_token_bearer');
    });

    test('should leave variables without dots unchanged', () => {
      expect(transformVariableName('apiKey')).toBe('apiKey');
      expect(transformVariableName('base_url')).toBe('base_url');
      expect(transformVariableName('timeout')).toBe('timeout');
      expect(transformVariableName('CONSTANT_VALUE')).toBe('CONSTANT_VALUE');
    });

    test('should handle edge cases', () => {
      expect(transformVariableName('.starts.with.dot')).toBe('_starts_with_dot');
      expect(transformVariableName('ends.with.dot.')).toBe('ends_with_dot_');
      expect(transformVariableName('multiple...dots')).toBe('multiple___dots');
      expect(transformVariableName('.')).toBe('_');
      expect(transformVariableName('')).toBe('');
    });
  });

  describe('Environment Variable Transformation', () => {
    test('should transform environment variable names with dots', () => {
      const testEnv: PostmanEnvironment = {
        name: 'API Environment',
        values: [
          { key: 'api.base.url', value: 'https://api.example.com', enabled: true },
          { key: 'auth.token.bearer', value: 'eyJ0eXAi...', enabled: true },
          { key: 'database.connection.string', value: 'postgresql://...', enabled: true }
        ]
      };

      const [workspace, environment] = convertPostmanEnvironment(testEnv);

      // Transformed keys should exist
      expect(environment.data).toHaveProperty('api_base_url');
      expect(environment.data).toHaveProperty('auth_token_bearer');
      expect(environment.data).toHaveProperty('database_connection_string');

      // Values should be preserved
      expect(environment.data['api_base_url']).toBe('https://api.example.com');
      expect(environment.data['auth_token_bearer']).toBe('eyJ0eXAi...');
      expect(environment.data['database_connection_string']).toBe('postgresql://...');

      // Original dot keys should not exist
      expect(environment.data).not.toHaveProperty('api.base.url');
      expect(environment.data).not.toHaveProperty('auth.token.bearer');
      expect(environment.data).not.toHaveProperty('database.connection.string');
    });

    test('should handle mixed variables (some with dots, some without)', () => {
      const testEnv: PostmanEnvironment = {
        name: 'Mixed Environment',
        values: [
          { key: 'api.key', value: 'dotted-key', enabled: true },
          { key: 'simple_key', value: 'underscore-key', enabled: true },
          { key: 'camelCaseKey', value: 'camel-key', enabled: true },
          { key: 'config.nested.value', value: 'nested-value', enabled: true }
        ]
      };

      const [workspace, environment] = convertPostmanEnvironment(testEnv);

      expect(environment.data).toEqual({
        'api_key': 'dotted-key',
        'simple_key': 'underscore-key',
        'camelCaseKey': 'camel-key',
        'config_nested_value': 'nested-value'
      });
    });

    test('should still filter disabled variables with dots', () => {
      const testEnv: PostmanEnvironment = {
        name: 'Test Environment',
        values: [
          { key: 'api.enabled.var', value: 'should-appear', enabled: true },
          { key: 'api.disabled.var', value: 'should-not-appear', enabled: false },
          { key: 'normal.var', value: 'normal-value', enabled: true }
        ]
      };

      const [workspace, environment] = convertPostmanEnvironment(testEnv);

      expect(environment.data).toHaveProperty('api_enabled_var');
      expect(environment.data).toHaveProperty('normal_var');
      expect(environment.data).not.toHaveProperty('api_disabled_var');
      expect(Object.keys(environment.data)).toHaveLength(2);
    });
  });

  describe('Collection Variable Transformation', () => {
    const createTestCollection = (variables: PostmanVariable[]): PostmanCollection => ({
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [],
      variable: variables
    });

    test('should transform collection variable names with dots', () => {
      const variables = [
        { key: 'api.timeout.seconds', value: '30', type: 'string' },
        { key: 'service.retry.count', value: '3', type: 'string' },
        { key: 'config.debug.enabled', value: 'false', type: 'string' }
      ] as unknown as PostmanVariable[];

      const collection = createTestCollection(variables);
      const importer = new ImportPostman(collection, JSON.stringify(collection));
      const result = importer.importCollection();

      const collectionItem = result.find(item => item._type === 'request_group' && item.variable);
      expect(collectionItem).toBeDefined();

      if (collectionItem?.variable) {
        expect(collectionItem.variable).toEqual({
          'api_timeout_seconds': '30',
          'service_retry_count': '3',
          'config_debug_enabled': 'false'
        });
      }
    });

    test('should handle variables with key/id/name properties', () => {
      const variables = [
        { key: 'api.key.priority', value: 'from-key', type: 'string' },
        { id: 'api.id.only', value: 'from-id', type: 'string' },
        { name: 'api.name.only', value: 'from-name', type: 'string' },
        { key: 'api.multi', id: 'ignored.id', name: 'ignored.name', value: 'key-wins', type: 'string' }
      ] as unknown as PostmanVariable[];

      const collection = createTestCollection(variables);
      const importer = new ImportPostman(collection, JSON.stringify(collection));
      const result = importer.importCollection();

      const collectionItem = result.find(item => item._type === 'request_group' && item.variable);

      if (collectionItem?.variable) {
        expect(collectionItem.variable).toEqual({
          'api_key_priority': 'from-key',
          'api_id_only': 'from-id',
          'api_name_only': 'from-name',
          'api_multi': 'key-wins'
        });
      }
    });

    test('should handle disabled collection variables with dots', () => {
      const variables = [
        { key: 'api.enabled.var', value: 'should-appear', type: 'string', disabled: false },
        { key: 'api.disabled.var', value: 'should-not-appear', type: 'string', disabled: true },
        { key: 'api.default.var', value: 'default-enabled', type: 'string' }
      ] as unknown as PostmanVariable[];

      const collection = createTestCollection(variables);
      const importer = new ImportPostman(collection, JSON.stringify(collection));
      const result = importer.importCollection();

      const collectionItem = result.find(item => item._type === 'request_group' && item.variable);

      if (collectionItem?.variable) {
        expect(collectionItem.variable).toEqual({
          'api_enabled_var': 'should-appear',
          'api_default_var': 'default-enabled'
        });
        expect(collectionItem.variable).not.toHaveProperty('api_disabled_var');
      }
    });

    test('should handle complex value types with dotted names', () => {
      const variables = [
        { key: 'config.string.value', value: 'text-value', type: 'string' },
        { key: 'config.number.value', value: 42, type: 'number' },
        { key: 'config.boolean.value', value: true, type: 'boolean' },
        { key: 'config.object.value', value: { nested: 'data' }, type: 'any' }
      ] as unknown as PostmanVariable[];

      const collection = createTestCollection(variables);
      const importer = new ImportPostman(collection, JSON.stringify(collection));
      const result = importer.importCollection();

      const collectionItem = result.find(item => item._type === 'request_group' && item.variable);

      if (collectionItem?.variable) {
        expect(collectionItem.variable).toEqual({
          'config_string_value': 'text-value',
          'config_number_value': '42',
          'config_boolean_value': 'true',
          'config_object_value': '{"nested":"data"}'
        });
      }
    });

    test('should handle empty collection variables', () => {
      const collection = createTestCollection([]);
      const importer = new ImportPostman(collection, JSON.stringify(collection));
      const result = importer.importCollection();

      const collectionItem = result.find(item => item._type === 'request_group');
      expect(collectionItem?.variable).toBeFalsy();
    });
  });

  describe('Real-world Integration Tests', () => {
    test('should handle Slack API style variables', () => {
      // Environment variables (like you'd have in Slack workspace)
      const slackEnv: PostmanEnvironment = {
        name: 'Slack Environment',
        values: [
          { key: 'slack.bot.token', value: 'xoxb-slack-bot-token', enabled: true },
          { key: 'slack.user.token', value: 'xoxp-user-token', enabled: true },
          { key: 'slack.webhook.url', value: 'https://hooks.slack.com/...', enabled: true }
        ]
      };

      // Collection variables
      const slackVariables = [
        { key: 'slack.api.timeout', value: '30000', type: 'string' },
        { key: 'slack.retry.attempts', value: '3', type: 'string' },
        { key: 'slack.channel.default', value: 'general', type: 'string' }
      ] as unknown as PostmanVariable[];

      // Test environment conversion
      const [workspace, environment] = convertPostmanEnvironment(slackEnv);
      expect(environment.data).toEqual({
        'slack_bot_token': 'xoxb-slack-bot-token',
        'slack_user_token': 'xoxp-user-token',
        'slack_webhook_url': 'https://hooks.slack.com/...'
      });

      // Test collection conversion
      const collection = createTestCollection(slackVariables);
      const importer = new ImportPostman(collection, JSON.stringify(collection));
      const result = importer.importCollection();

      const collectionItem = result.find(item => item._type === 'request_group' && item.variable);
      if (collectionItem?.variable) {
        expect(collectionItem.variable).toEqual({
          'slack_api_timeout': '30000',
          'slack_retry_attempts': '3',
          'slack_channel_default': 'general'
        });
      }
    });

    test('should handle common API configuration patterns', () => {
      const apiEnv: PostmanEnvironment = {
        name: 'API Configuration',
        values: [
          { key: 'api.base.url', value: 'https://api.service.com/v1', enabled: true },
          { key: 'auth.client.id', value: 'client-123', enabled: true },
          { key: 'auth.client.secret', value: 'secret-456', enabled: true },
          { key: 'rate.limit.per.minute', value: '100', enabled: true }
        ]
      };

      const [workspace, environment] = convertPostmanEnvironment(apiEnv);
      expect(environment.data).toEqual({
        'api_base_url': 'https://api.service.com/v1',
        'auth_client_id': 'client-123',
        'auth_client_secret': 'secret-456',
        'rate_limit_per_minute': '100'
      });
    });
  });

  // Helper function for tests
  function createTestCollection(variables: PostmanVariable[]): PostmanCollection {
    return {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [],
      variable: variables
    };
  }
});
