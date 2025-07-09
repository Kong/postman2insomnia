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
  describe('legacy-postman-test', () => {
    test('✅ Should convert postman.test() to pm.test()', () => {
      const testCases = [
        [
          'postman.test("Status check", () => { pm.expect(pm.response.code).to.equal(200); });',
          'pm.test("Status check", () => { pm.expect(pm.response.code).to.equal(200); });'
        ],
        [
          'postman.test("Response time", function() { pm.expect(pm.response.responseTime).to.be.below(1000); });',
          'pm.test("Response time", function() { pm.expect(pm.response.responseTime).to.be.below(1000); });'
        ],
        [
          'postman.test(`Dynamic test ${testName}`, () => { /* test code */ });',
          'pm.test(`Dynamic test ${testName}`, () => { /* test code */ });'
        ],
        [
          "postman.test('JSON response', () => { postman.expect(jsonData.id).to.exist; });",
          "pm.test('JSON response', () => { pm.expect(jsonData.id).to.exist; });"
        ]
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  test('✅ Should handle various whitespace patterns', () => {
      const testCases = [
        ['postman.test (  "test", callback)', 'pm.test(  "test", callback)'],
        ['postman.test\t("test", callback)', 'pm.test("test", callback)'],
        ['postman.test\n("test", callback)', 'pm.test("test", callback)']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

  test('✅ Should not match partial function names', () => {
      const testCases = [
        ['mypostman.test("test", callback)', 'mypostman.test("test", callback)'], // Should NOT change
        ['customPostman.test("test", callback)', 'customPostman.test("test", callback)'], // Should NOT change
        ['postmanHelper.test("test", callback)', 'postmanHelper.test("test", callback)'] // Should NOT change
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

  test('✅ Should handle complex real-world example', () => {
      const input = `
postman.test("Application access token creation", () => {
  const responseJson = pm.response.json();
  postman.expect(responseJson.id_token).to.be.a('string');
  postman.expect(responseJson.access_token);
  console.log(responseJson.access_token);
  postman.environment.set("POD-AAT", responseJson.access_token);
});`;

      const expected = `
pm.test("Application access token creation", () => {
  const responseJson = pm.response.json();
  pm.expect(responseJson.id_token).to.be.a('string');
  pm.expect(responseJson.access_token);
  console.log(responseJson.access_token);
  pm.environment.set("POD-AAT", responseJson.access_token);
});`;

      const result = engine.preprocess(input);
      expect(result).toBe(expected);
  });
  describe('legacy-postman-expect', () => {
    test('✅ Should convert postman.expect() to pm.expect()', () => {
      const testCases = [
        [
          'postman.expect(response.status).to.equal(200);',
          'pm.expect(response.status).to.equal(200);'
        ],
        [
          'postman.expect(responseJson.data).to.be.an("array");',
          'pm.expect(responseJson.data).to.be.an("array");'
        ],
        [
          'postman.expect(responseJson.id_token).to.be.a("string");',
          'pm.expect(responseJson.id_token).to.be.a("string");'
        ],
        [
          'postman.expect(responseJson.access_token).to.exist;',
          'pm.expect(responseJson.access_token).to.exist;'
        ],
        [
          'postman.expect(pm.response.responseTime).to.be.below(1000);',
          'pm.expect(pm.response.responseTime).to.be.below(1000);'
        ]
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle nested expectations', () => {
      const testCases = [
        [
          'postman.expect(responseJson.data.length).to.be.greaterThan(0);',
          'pm.expect(responseJson.data.length).to.be.greaterThan(0);'
        ],
        [
          'postman.expect(responseJson.user.profile.email).to.include("@");',
          'pm.expect(responseJson.user.profile.email).to.include("@");'
        ]
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle various whitespace patterns', () => {
      const testCases = [
        ['postman.expect (value).to.equal(expected)', 'pm.expect(value).to.equal(expected)'],
        ['postman.expect\t(value).to.equal(expected)', 'pm.expect(value).to.equal(expected)'],
        ['postman.expect\n(value).to.equal(expected)', 'pm.expect(value).to.equal(expected)']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should not match partial function names', () => {
      const testCases = [
        ['mypostman.expect(value)', 'mypostman.expect(value)'], // Should NOT change
        ['customPostman.expect(value)', 'customPostman.expect(value)'], // Should NOT change
        ['postmanHelper.expect(value)', 'postmanHelper.expect(value)'] // Should NOT change
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });
    describe('legacy-postman-environment-set', () => {
    test('✅ Should convert postman.environment.set() to pm.environment.set()', () => {
      const testCases = [
        [
          'postman.environment.set("token", responseJson.access_token);',
          'pm.environment.set("token", responseJson.access_token);'
        ],
        [
          'postman.environment.set("POD-AAT", responseJson.access_token);',
          'pm.environment.set("POD-AAT", responseJson.access_token);'
        ],
        [
          "postman.environment.set('userId', userData.id);",
          "pm.environment.set('userId', userData.id);"
        ],
        [
          'postman.environment.set(`sessionId_${userId}`, sessionData);',
          'pm.environment.set(`sessionId_${userId}`, sessionData);'
        ]
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle complex expressions and concatenation', () => {
      const testCases = [
        [
          'postman.environment.set("key_" + userId, tokenData.access);',
          'pm.environment.set("key_" + userId, tokenData.access);'
        ],
        [
          'postman.environment.set(config.tokenKey, response.data.token);',
          'pm.environment.set(config.tokenKey, response.data.token);'
        ],
        [
          'postman.environment.set(getKeyName("auth"), getTokenValue());',
          'pm.environment.set(getKeyName("auth"), getTokenValue());'
        ]
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle various whitespace patterns', () => {
      const testCases = [
        ['postman.environment.set ("key", value)', 'pm.environment.set("key", value)'],
        ['postman.environment.set\t("key", value)', 'pm.environment.set("key", value)'],
        ['postman.environment.set\n("key", value)', 'pm.environment.set("key", value)']
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });
  describe('legacy-postman-environment-get', () => {
    test('✅ Should convert postman.environment.get() to pm.environment.get()', () => {
      const testCases = [
        [
          'const token = postman.environment.get("access_token");',
          'const token = pm.environment.get("access_token");'
        ],
        [
          'if (postman.environment.get("isAuthenticated")) { /* logic */ }',
          'if (pm.environment.get("isAuthenticated")) { /* logic */ }'
        ],
        [
          'const baseUrl = postman.environment.get("API_BASE_URL");',
          'const baseUrl = pm.environment.get("API_BASE_URL");'
        ],
        [
          'postman.environment.get(`key_${userId}`)',
          'pm.environment.get(`key_${userId}`)'
        ]
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle complex expressions', () => {
      const testCases = [
        [
          'const value = postman.environment.get(config.keyName);',
          'const value = pm.environment.get(config.keyName);'
        ],
        [
          'const token = postman.environment.get("prefix_" + env);',
          'const token = pm.environment.get("prefix_" + env);'
        ]
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('legacy-postman-globals-set', () => {
    test('✅ Should convert postman.globals.set() to pm.globals.set()', () => {
      const testCases = [
        [
          'postman.globals.set("globalToken", responseJson.token);',
          'pm.globals.set("globalToken", responseJson.token);'
        ],
        [
          'postman.globals.set("baseApiUrl", "https://api.example.com");',
          'pm.globals.set("baseApiUrl", "https://api.example.com");'
        ],
        [
          "postman.globals.set('sessionId', sessionData.id);",
          "pm.globals.set('sessionId', sessionData.id);"
        ]
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });

    test('✅ Should handle complex expressions', () => {
      const testCases = [
        [
          'postman.globals.set("session_" + userId, sessionToken);',
          'pm.globals.set("session_" + userId, sessionToken);'
        ],
        [
          'postman.globals.set(globalConfig.tokenKey, authResponse.token);',
          'pm.globals.set(globalConfig.tokenKey, authResponse.token);'
        ]
      ];

      testCases.forEach(([input, expected]) => {
        const result = engine.preprocess(input);
        expect(result).toBe(expected);
      });
    });
  });
  describe('Combined Legacy Rules Integration', () => {
    test('✅ Should handle multiple legacy patterns in one script', () => {
      const input = `
postman.test("Complex legacy test", () => {
  const responseJson = pm.response.json();
  const globalToken = postman.globals.get("authToken");
  const envUserId = postman.environment.get("userId");

  postman.expect(responseJson.status).to.equal("success");
  postman.expect(responseJson.data).to.be.an("object");

  if (responseJson.newToken) {
    postman.environment.set("currentToken", responseJson.newToken);
    postman.globals.set("lastTokenUpdate", Date.now());
  }
});`;

      const expected = `
pm.test("Complex legacy test", () => {
  const responseJson = pm.response.json();
  const globalToken = pm.globals.get("authToken");
  const envUserId = pm.environment.get("userId");

  pm.expect(responseJson.status).to.equal("success");
  pm.expect(responseJson.data).to.be.an("object");

  if (responseJson.newToken) {
    pm.environment.set("currentToken", responseJson.newToken);
    pm.globals.set("lastTokenUpdate", Date.now());
  }
});`;

      const result = engine.preprocess(input);
      expect(result).toBe(expected);
    });

    test('✅ Should work with your original real-world example', () => {
      const input = `postman.test("Application access token creation", () => {
  const responseJson = pm.response.json();
  postman.expect(responseJson.id_token).to.be.a('string');
  postman.expect(responseJson.access_token);
  console.log(responseJson.access_token);
  postman.environment.set("POD-AAT", responseJson.access_token);
});`;

      const expected = `pm.test("Application access token creation", () => {
  const responseJson = pm.response.json();
  pm.expect(responseJson.id_token).to.be.a('string');
  pm.expect(responseJson.access_token);
  console.log(responseJson.access_token);
  pm.environment.set("POD-AAT", responseJson.access_token);
});`;

      const result = engine.preprocess(input);
      expect(result).toBe(expected);
    });

    test('✅ Should not interfere with existing modern pm.* syntax', () => {
      const modernScript = `
pm.test("Modern test", () => {
  const responseJson = pm.response.json();
  pm.expect(responseJson.status).to.equal("success");
  pm.environment.set("token", responseJson.token);
  pm.globals.get("baseUrl");
});`;

      const result = engine.preprocess(modernScript);
      // Should remain unchanged since it's already modern syntax
      expect(result).toBe(modernScript);
    });
  });
    describe('Rule Configuration Validation', () => {
    test('✅ Should have all new legacy rules in default config', () => {
      const ruleNames = DEFAULT_PREPROCESS_RULES.map(rule => rule.name);

      expect(ruleNames).toContain('legacy-postman-test');
      expect(ruleNames).toContain('legacy-postman-expect');
      expect(ruleNames).toContain('legacy-postman-environment-set');
      expect(ruleNames).toContain('legacy-postman-environment-get');
      expect(ruleNames).toContain('legacy-postman-globals-set');
      expect(ruleNames).toContain('legacy-postman-globals-get');
    });

    test('✅ Should have all new rules enabled by default', () => {
      const newRules = DEFAULT_PREPROCESS_RULES.filter(rule =>
        [
          'legacy-postman-test',
          'legacy-postman-expect',
          'legacy-postman-environment-set',
          'legacy-postman-environment-get',
          'legacy-postman-globals-set',
          'legacy-postman-globals-get'
        ].includes(rule.name)
      );

      newRules.forEach(rule => {
        expect(rule.enabled).toBe(true);
      });
    });

    test('✅ Should have word boundaries in patterns to prevent partial matches', () => {
      const newRules = DEFAULT_PREPROCESS_RULES.filter(rule =>
        [
          'legacy-postman-test',
          'legacy-postman-expect',
          'legacy-postman-environment-set',
          'legacy-postman-environment-get',
          'legacy-postman-globals-set',
          'legacy-postman-globals-get'
        ].includes(rule.name)
      );

      newRules.forEach(rule => {
        expect(rule.pattern).toMatch(/^\\b/); // Should start with word boundary
      });
    });
  });
  describe('Edge Cases and Boundary Conditions', () => {
    test('✅ Should handle empty and whitespace-only strings', () => {
      const testCases = ['', ' ', '\t', '\n', '   \t\n   '];

      testCases.forEach(input => {
        const result = engine.preprocess(input);
        expect(result).toBe(input); // Should remain unchanged
      });
    });

    test('✅ Should handle strings without any legacy patterns', () => {
      const testCases = [
        'console.log("Hello world");',
        'const data = { key: "value" };',
        'if (condition) { doSomething(); }',
        'function myFunction() { return true; }'
      ];

      testCases.forEach(input => {
        const result = engine.preprocess(input);
        expect(result).toBe(input); // Should remain unchanged
      });
    });

    test('✅ Should handle malformed legacy syntax gracefully', () => {
      const testCases = [
        'postman.test(', // Incomplete
        'postman.expect)', // Missing opening paren
        'postman.environment.set("key")', // Missing second parameter
        'postman.globals.get()', // Missing parameter
      ];

      testCases.forEach(input => {
        // Should not throw errors, even if conversion is imperfect
        expect(() => engine.preprocess(input)).not.toThrow();
      });
    });
  });
  describe('Isolated Legacy Rule Testing', () => {
  test('✅ Should be able to test individual rules in isolation', () => {
    // Test just the legacy-postman-test rule by itself
    const isolatedEngine = new TransformEngine({
      preprocess: [DEFAULT_PREPROCESS_RULES.find(rule => rule.name === 'legacy-postman-test')!],
      postprocess: []
    });

    const input = 'postman.test("test", callback); postman.expect(value);';
    const result = isolatedEngine.preprocess(input);

    // Should only convert postman.test, not postman.expect
    expect(result).toBe('pm.test("test", callback); postman.expect(value);');
  });

  test('✅ Should be able to disable specific rules', () => {
    // Create engine with legacy-postman-test disabled
    const customRules = DEFAULT_PREPROCESS_RULES.map(rule =>
      rule.name === 'legacy-postman-test'
        ? { ...rule, enabled: false }
        : rule
    );

    const customEngine = new TransformEngine({
      preprocess: customRules,
      postprocess: []
    });

    const input = 'postman.test("test", callback); postman.expect(value);';
    const result = customEngine.preprocess(input);

    // Should only convert postman.expect, not postman.test (disabled)
    expect(result).toBe('postman.test("test", callback); pm.expect(value);');
  });
});

describe('legacy-set-next-request', () => {
  test('✅ Should convert postman.setNextRequest() to pm.execution.setNextRequest()', () => {
    const testCases = [
      // Basic string literals
      [
        'postman.setNextRequest("Step 1. Get Access token");',
        'pm.execution.setNextRequest("Step 1. Get Access token");'
      ],
      [
        "postman.setNextRequest('Next API Call');",
        "pm.execution.setNextRequest('Next API Call');"
      ],
      // Template literals
      [
        'postman.setNextRequest(`Dynamic Step ${stepNumber}`);',
        'pm.execution.setNextRequest(`Dynamic Step ${stepNumber}`);'
      ],
      // Variable references
      [
        'postman.setNextRequest(nextStepName);',
        'pm.execution.setNextRequest(nextStepName);'
      ],
      // Object property access
      [
        'postman.setNextRequest(config.nextStep);',
        'pm.execution.setNextRequest(config.nextStep);'
      ],
      // Function calls as parameters
      [
        'postman.setNextRequest(getNextRequestName());',
        'pm.execution.setNextRequest(getNextRequestName());'
      ],
      // Complex expressions
      [
        'postman.setNextRequest(shouldSkip ? null : "Next Step");',
        'pm.execution.setNextRequest(shouldSkip ? null : "Next Step");'
      ],
      // Setting to null (to stop execution)
      [
        'postman.setNextRequest(null);',
        'pm.execution.setNextRequest(null);'
      ]
    ];

    testCases.forEach(([input, expected]) => {
      const result = engine.preprocess(input);
      expect(result).toBe(expected);
    });
  });

  test('✅ Should handle various whitespace patterns', () => {
    const testCases = [
      // Extra spaces
      [
        'postman.setNextRequest(  "Step Name"  );',
        'pm.execution.setNextRequest("Step Name");'
      ],
      // Tabs
      [
        'postman.setNextRequest(\t"Step Name"\t);',
        'pm.execution.setNextRequest("Step Name");'
      ],
      // Multiple lines (though not common)
      [
        'postman.setNextRequest(\n  "Step Name"\n);',
        'pm.execution.setNextRequest("Step Name");'
      ]
    ];

    testCases.forEach(([input, expected]) => {
      const result = engine.preprocess(input);
      expect(result).toBe(expected);
    });
  });

  test('✅ Should handle conditional workflow patterns', () => {
    const testCases = [
      [
        `if (pm.response.code === 200) {
    postman.setNextRequest("Success Step");
} else {
    postman.setNextRequest("Error Handler");
}`,
        `if (pm.response.code === 200) {
    pm.execution.setNextRequest("Success Step");
} else {
    pm.execution.setNextRequest("Error Handler");
}`
      ],
      [
        `const nextStep = responseData.hasMore ? "Fetch More Data" : null;
postman.setNextRequest(nextStep);`,
        `const nextStep = responseData.hasMore ? "Fetch More Data" : null;
pm.execution.setNextRequest(nextStep);`
      ]
    ];

    testCases.forEach(([input, expected]) => {
      const result = engine.preprocess(input);
      expect(result).toBe(expected);
    });
  });

  test('✅ Should not affect other postman method calls', () => {
    const testCases = [
      // Should not change other postman calls that don't match
      [
        'postman.setEnvironmentVariable("key", "value");',
        'pm.environment.set("key", "value");' // This gets converted by a different rule
      ],
      [
        'customObject.setNextRequest("not postman");',
        'customObject.setNextRequest("not postman");' // Should not change
      ],
      [
        'postmanLike.setNextRequest("not exact match");',
        'postmanLike.setNextRequest("not exact match");' // Should not change
      ]
    ];

    testCases.forEach(([input, expected]) => {
      const result = engine.preprocess(input);
      expect(result).toBe(expected);
    });
  });

  test('✅ Should handle multiple setNextRequest calls in one script', () => {
    const input = `
// Workflow logic with multiple paths
if (authenticationNeeded) {
    postman.setNextRequest("Get Auth Token");
} else if (dataValidationFailed) {
    postman.setNextRequest("Validate Data");
} else {
    postman.setNextRequest("Process Main Request");
}

// Later in script
if (isLastStep) {
    postman.setNextRequest(null); // Stop execution
}`;

    const expected = `
// Workflow logic with multiple paths
if (authenticationNeeded) {
    pm.execution.setNextRequest("Get Auth Token");
} else if (dataValidationFailed) {
    pm.execution.setNextRequest("Validate Data");
} else {
    pm.execution.setNextRequest("Process Main Request");
}

// Later in script
if (isLastStep) {
    pm.execution.setNextRequest(null); // Stop execution
}`;

    const result = engine.preprocess(input);
    expect(result).toBe(expected);
  });

  test('✅ Should integrate with other legacy rule conversions', () => {
    const input = `
postman.test("Workflow control test", () => {
    const responseJson = pm.response.json();
    postman.expect(responseJson.status).to.equal("success");

    if (responseJson.continueWorkflow) {
        postman.setNextRequest("Step 2. Process Data");
        postman.environment.set("workflowState", "continuing");
    } else {
        postman.setNextRequest(null);
        postman.environment.set("workflowState", "completed");
    }
});`;

    const expected = `
pm.test("Workflow control test", () => {
    const responseJson = pm.response.json();
    pm.expect(responseJson.status).to.equal("success");

    if (responseJson.continueWorkflow) {
        pm.execution.setNextRequest("Step 2. Process Data");
        pm.environment.set("workflowState", "continuing");
    } else {
        pm.execution.setNextRequest(null);
        pm.environment.set("workflowState", "completed");
    }
});`;

    const result = engine.preprocess(input);
    expect(result).toBe(expected);
  });
});

});
