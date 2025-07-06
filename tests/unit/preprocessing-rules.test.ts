// =============================================================================
// IMPROVED UNIT TEST - USE ACTUAL DEFAULT RULES
// =============================================================================
// File: tests/unit/preprocessing-rules.test.ts
// =============================================================================

import { TransformEngine, DEFAULT_PREPROCESS_RULES } from '../../src/transform-engine';

describe('Default Preprocessing Rules', () => {
  let engine: TransformEngine;

  beforeEach(() => {
    engine = new TransformEngine(); // This uses DEFAULT_PREPROCESS_RULES automatically
  });

  // ==========================================================================
  // TEST SPECIFIC RULES BY NAME
  // ==========================================================================

  // ==========================================================================
  // EXISTING RULES TESTS
  // ==========================================================================

  describe('deprecated-pm-syntax', () => {
    test('✅ Should convert pm.responseHeaders[] to pm.response.headers.get()', () => {
      const testCases = [
        ['pm.responseHeaders["Content-Type"]', 'pm.response.headers.get("Content-Type")'],
        ["pm.responseHeaders['Accept']", "pm.response.headers.get('Accept')"],
        ['pm.responseHeaders[`Authorization`]', 'pm.response.headers.get(`Authorization`)'],
        ['pm.responseHeaders[headerName]', 'pm.response.headers.get(headerName)'],
        ['pm.responseHeaders[config.headerKey]', 'pm.response.headers.get(config.headerKey)']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle multiple headers in same script', () => {
      const input = 'const contentType = pm.responseHeaders["Content-Type"]; const accept = pm.responseHeaders["Accept"];';
      const expected = 'const contentType = pm.response.headers.get("Content-Type"); const accept = pm.response.headers.get("Accept");';
      const result = engine.preprocess(input);
      expect(result).toBe(expected);
    });

    test('✅ Should not match partial property names', () => {
      const testCases = [
        ['mypm.responseHeaders["test"]', 'mypm.responseHeaders["test"]'], // Should NOT change
        ['customPm.responseHeaders["test"]', 'customPm.responseHeaders["test"]'] // Should NOT change
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('old-postman-vars', () => {
    test('✅ Should convert postman.getEnvironmentVariable to pm.environment.get', () => {
      const testCases = [
        ['postman.getEnvironmentVariable("apiKey")', 'pm.environment.get("apiKey")'],
        ["postman.getEnvironmentVariable('token')", "pm.environment.get('token')"],
        ['postman.getEnvironmentVariable(`baseUrl`)', 'pm.environment.get(`baseUrl`)'],
        ['postman.getEnvironmentVariable(keyName)', 'pm.environment.get(keyName)'],
        ['postman.getEnvironmentVariable(config.apiKey)', 'pm.environment.get(config.apiKey)'],
        ['postman.getEnvironmentVariable("prefix_" + userId)', 'pm.environment.get("prefix_" + userId)']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle complex expressions as parameters', () => {
      const testCases = [
        ['postman.getEnvironmentVariable(settings.keys.auth)', 'pm.environment.get(settings.keys.auth)'],
        ['postman.getEnvironmentVariable(getKeyName("user"))', 'pm.environment.get(getKeyName("user"))'],
        ['postman.getEnvironmentVariable(`env_${environment}_key`)', 'pm.environment.get(`env_${environment}_key`)']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should not match partial function names', () => {
      const testCases = [
        ['mypostman.getEnvironmentVariable("test")', 'mypostman.getEnvironmentVariable("test")'],
        ['postmanUtils.getEnvironmentVariable("test")', 'postmanUtils.getEnvironmentVariable("test")']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('old-postman-global-vars', () => {
    test('✅ Should convert postman.getGlobalVariable to pm.globals.get', () => {
      const testCases = [
        ['postman.getGlobalVariable("baseUrl")', 'pm.globals.get("baseUrl")'],
        ["postman.getGlobalVariable('sessionId')", "pm.globals.get('sessionId')"],
        ['postman.getGlobalVariable(globalKeyName)', 'pm.globals.get(globalKeyName)'],
        ['postman.getGlobalVariable(config.globalKey)', 'pm.globals.get(config.globalKey)'],
        ['postman.getGlobalVariable("session_" + userId)', 'pm.globals.get("session_" + userId)']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle nested function calls', () => {
      const testCases = [
        ['postman.getGlobalVariable(getKeyName("global"))', 'pm.globals.get(getKeyName("global"))'],
        ['postman.getGlobalVariable(config.getKey("session"))', 'pm.globals.get(config.getKey("session"))']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should not match partial function names', () => {
      const testCases = [
        ['mypostman.getGlobalVariable("test")', 'mypostman.getGlobalVariable("test")'],
        ['postmanHelper.getGlobalVariable("test")', 'postmanHelper.getGlobalVariable("test")']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('legacy-test-syntax', () => {
    test('✅ Should convert tests[] = boolean to pm.test() format', () => {
      const testCases = [
        // Note: responseCode.code also gets converted to pm.response.code by another rule
        ['tests["Status check"] = responseCode.code === 200;', 'pm.test("Status check", function() { pm.expect(pm.response.code === 200).to.be.true; });'],
        ["tests['Content type'] = responseBody.includes('json');", "pm.test('Content type', function() { pm.expect(responseBody.includes('json')).to.be.true; });"],
        ['tests[`Response time`] = responseTime < 1000;', 'pm.test(`Response time`, function() { pm.expect(responseTime < 1000).to.be.true; });']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle variable test names', () => {
      const testCases = [
        ['tests[testName] = condition;', 'pm.test(testName, function() { pm.expect(condition).to.be.true; });'],
        ['tests[config.testName] = result;', 'pm.test(config.testName, function() { pm.expect(result).to.be.true; });']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle complex boolean expressions', () => {
      const testCases = [
        // Note: responseCode.code gets converted to pm.response.code by the responseCode-to-response rule
        ['tests["Complex test"] = responseCode.code === 200 && responseTime < 1000;', 'pm.test("Complex test", function() { pm.expect(pm.response.code === 200 && responseTime < 1000).to.be.true; });'],
        ['tests["Data validation"] = responseBody.data && responseBody.data.length > 0;', 'pm.test("Data validation", function() { pm.expect(responseBody.data && responseBody.data.length > 0).to.be.true; });']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle whitespace variations', () => {
      const testCases = [
        // Note: The legacy-test-syntax rule preserves the original capture groups including whitespace
        ['tests[ "test" ] = condition ;', 'pm.test( "test" , function() { pm.expect(condition ).to.be.true; });'],
        ['tests["test"]\t=\tresult;', 'pm.test("test", function() { pm.expect(result).to.be.true; });']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should not match partial array names', () => {
      const testCases = [
        ['myTests["test"] = condition;', 'myTests["test"] = condition;'], // Should NOT change
        ['customTests["test"] = result;', 'customTests["test"] = result;'] // Should NOT change
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should work with isolated rule to test specific behavior', () => {
      // Test the legacy-test-syntax rule in isolation
      const isolatedEngine = new TransformEngine({
        preprocess: [DEFAULT_PREPROCESS_RULES.find(rule => rule.name === 'legacy-test-syntax')!],
        postprocess: []
      });

      const testCases = [
        ['tests["Status check"] = responseCode.code === 200;', 'pm.test("Status check", function() { pm.expect(responseCode.code === 200).to.be.true; });'],
        ['tests["Simple test"] = condition;', 'pm.test("Simple test", function() { pm.expect(condition).to.be.true; });']
      ];

      testCases.forEach(([input, expected]) => {
        const result = isolatedEngine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  // ==========================================================================
  // NEW RULES TESTS
  // ==========================================================================

  describe('legacy-environment-set', () => {
    test('✅ Should handle quoted string keys', () => {
      const testCases = [
        ['postman.setEnvironmentVariable("apiKey", "value123");', 'pm.environment.set("apiKey", "value123");'],
        ["postman.setEnvironmentVariable('token', 'abc123');", "pm.environment.set('token', 'abc123');"],
        ['postman.setEnvironmentVariable(`baseUrl`, `https://api.com`);', 'pm.environment.set(`baseUrl`, `https://api.com`);']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle variable names as keys', () => {
      const testCases = [
        ['postman.setEnvironmentVariable(keyName, "value");', 'pm.environment.set(keyName, "value");'],
        ['postman.setEnvironmentVariable(tokenKey, response.token);', 'pm.environment.set(tokenKey, response.token);'],
        ['postman.setEnvironmentVariable(dynamicKey, data.value);', 'pm.environment.set(dynamicKey, data.value);']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle expressions as keys', () => {
      const testCases = [
        ['postman.setEnvironmentVariable(config.apiKey, token);', 'pm.environment.set(config.apiKey, token);'],
        ['postman.setEnvironmentVariable(settings.tokenName, response.data);', 'pm.environment.set(settings.tokenName, response.data);'],
        ['postman.setEnvironmentVariable(env.keys.auth, authValue);', 'pm.environment.set(env.keys.auth, authValue);']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle concatenation and complex expressions', () => {
      const testCases = [
        ['postman.setEnvironmentVariable("prefix_" + userId, userToken);', 'pm.environment.set("prefix_" + userId, userToken);'],
        ['postman.setEnvironmentVariable("key_" + env, response.value);', 'pm.environment.set("key_" + env, response.value);'],
        ['postman.setEnvironmentVariable(keyPrefix + keyName, data[fieldName]);', 'pm.environment.set(keyPrefix + keyName, data[fieldName]);']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('legacy-global-set', () => {
    test('✅ Should handle all parameter types for global variables', () => {
      const testCases = [
        ['postman.setGlobalVariable("baseUrl", "https://api.example.com");', 'pm.globals.set("baseUrl", "https://api.example.com");'],
        ['postman.setGlobalVariable(globalKeyName, globalValue);', 'pm.globals.set(globalKeyName, globalValue);'],
        ['postman.setGlobalVariable(config.globalKey, response.sessionId);', 'pm.globals.set(config.globalKey, response.sessionId);'],
        ['postman.setGlobalVariable("session_" + userId, sessionData);', 'pm.globals.set("session_" + userId, sessionData);'],
        ['postman.setGlobalVariable(`user_${userId}_session`, sessionToken);', 'pm.globals.set(`user_${userId}_session`, sessionToken);']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('legacy-clear-env', () => {
    test('✅ Should handle all parameter types for clearing environment variables', () => {
      const testCases = [
        ['postman.clearEnvironmentVariable("tempToken");', 'pm.environment.unset("tempToken");'],
        ["postman.clearEnvironmentVariable('sessionId');", "pm.environment.unset('sessionId');"],
        ['postman.clearEnvironmentVariable(tempKeyName);', 'pm.environment.unset(tempKeyName);'],
        ['postman.clearEnvironmentVariable(config.tempKey);', 'pm.environment.unset(config.tempKey);'],
        ['postman.clearEnvironmentVariable("temp_" + userId);', 'pm.environment.unset("temp_" + userId);'],
        ['postman.clearEnvironmentVariable(`cache_${requestId}`);', 'pm.environment.unset(`cache_${requestId}`);']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('legacy-clear-global', () => {
    test('✅ Should handle all parameter types for clearing global variables', () => {
      const testCases = [
        ['postman.clearGlobalVariable("tempGlobalData");', 'pm.globals.unset("tempGlobalData");'],
        ['postman.clearGlobalVariable(globalKeyToRemove);', 'pm.globals.unset(globalKeyToRemove);'],
        ['postman.clearGlobalVariable(settings.globalTempKey);', 'pm.globals.unset(settings.globalTempKey);'],
        ['postman.clearGlobalVariable("session_" + currentUserId);', 'pm.globals.unset("session_" + currentUserId);']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('responseCode-to-response', () => {
    test('✅ Should convert responseCode.code to pm.response.code', () => {
      const testCases = [
        ['if (responseCode.code === 200) { success(); }', 'if (pm.response.code === 200) { success(); }'],
        ['const status = responseCode.code;', 'const status = pm.response.code;'],
        ['console.log("Status:", responseCode.code);', 'console.log("Status:", pm.response.code);'],
        ['responseCode.code !== 404', 'pm.response.code !== 404'],
        ['switch (responseCode.code) { case 200: break; }', 'switch (pm.response.code) { case 200: break; }']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should not interfere with other responseCode properties', () => {
      const testCases = [
        ['responseCode.name', 'responseCode.name'], // Should NOT change
        ['responseCode.detail', 'responseCode.detail'], // Should NOT change
        ['myResponseCode.code', 'myResponseCode.code'] // Should NOT change
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  // ==========================================================================
  // WORD BOUNDARY TESTS - NOW USING REAL RULES
  // ==========================================================================

  describe('Word Boundary Protection', () => {
    test('✅ Should not match partial function names', () => {
      const testCases = [
        ['mypostman.setEnvironmentVariable("key", "value");', 'mypostman.setEnvironmentVariable("key", "value");'],
        ['postmanHelper.setEnvironmentVariable("key", "value");', 'postmanHelper.setEnvironmentVariable("key", "value");'],
        ['responseCodeHelper.code', 'responseCodeHelper.code']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should still match legitimate cases', () => {
      const testCases = [
        ['postman.setEnvironmentVariable("key", "value");', 'pm.environment.set("key", "value");'],
        ['  postman.setEnvironmentVariable("key", "value");', '  pm.environment.set("key", "value");'],
        ['if(postman.setEnvironmentVariable("key", "value"))', 'if(pm.environment.set("key", "value"))']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  // ==========================================================================
  // INTEGRATION TESTS
  // ==========================================================================

  describe('Integration Tests - All Rules Working Together', () => {
    test('✅ Should handle complete Postman script with all patterns', () => {
      const realWorldScript = `
        // Real-world Postman script
        const envKey = "authToken";
        const globalKey = config.sessionKey;
        const tempKey = "tempData_" + requestId;

        if (responseCode.code === 201) {
          postman.setEnvironmentVariable(envKey, response.token);
          postman.setGlobalVariable(globalKey, response.sessionId);
          postman.setEnvironmentVariable("lastRequestId", response.id);
          console.log("Status:", responseCode.code);
        }

        if (responseCode.code >= 400) {
          postman.clearEnvironmentVariable(tempKey);
          postman.clearGlobalVariable("errorSession");
        }

        postman.setGlobalVariable(\`request_\${Date.now()}\`, responseBody);
      `;

      const result = engine.preprocess(realWorldScript);

      // Verify transformations happened
      expect(result).toContain('pm.environment.set(envKey, response.token);');
      expect(result).toContain('pm.globals.set(globalKey, response.sessionId);');
      expect(result).toContain('pm.environment.set("lastRequestId", response.id);');
      expect(result).toContain('pm.response.code === 201');
      expect(result).toContain('pm.response.code >= 400');
      expect(result).toContain('pm.environment.unset(tempKey);');
      expect(result).toContain('pm.globals.unset("errorSession");');

      // Verify no old patterns remain
      expect(result).not.toContain('postman.set');
      expect(result).not.toContain('postman.clear');
      expect(result).not.toContain('responseCode.code');
    });
  });

  // ==========================================================================
  // RULE CONFIGURATION TESTS
  // ==========================================================================

  describe('Rule Configuration Validation', () => {
    test('✅ Should have all expected new rules in default config', () => {
      const ruleNames = DEFAULT_PREPROCESS_RULES.map(rule => rule.name);

      expect(ruleNames).toContain('legacy-environment-set');
      expect(ruleNames).toContain('legacy-global-set');
      expect(ruleNames).toContain('legacy-clear-env');
      expect(ruleNames).toContain('legacy-clear-global');
      expect(ruleNames).toContain('responseCode-to-response');
    });

    test('✅ Should have all rules enabled by default', () => {
      const newRules = DEFAULT_PREPROCESS_RULES.filter(rule =>
        ['legacy-environment-set', 'legacy-global-set', 'legacy-clear-env', 'legacy-clear-global', 'responseCode-to-response'].includes(rule.name)
      );

      newRules.forEach(rule => {
        expect(rule.enabled).toBe(true);
      });
    });

    test('✅ Should have word boundaries in patterns', () => {
      const newRules = DEFAULT_PREPROCESS_RULES.filter(rule =>
        ['legacy-environment-set', 'legacy-global-set', 'legacy-clear-env', 'legacy-clear-global', 'responseCode-to-response'].includes(rule.name)
      );

      newRules.forEach(rule => {
        expect(rule.pattern).toMatch(/^\\b/); // Should start with word boundary
      });
    });
  });
});
