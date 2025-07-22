import { convert } from '../../src/postman-converter';
import type { ImportRequest } from '../../src/types/entities';
import { TransformEngine } from '../../src/transform-engine';
import { DEFAULT_POSTPROCESS_RULES } from '../../src/transform-engine';

// =============================================================================
// UNIT TESTS FOR COLLECTION VARIABLE TRANSFORMATION
// =============================================================================

describe('Collection Variable Transformation', () => {

  // =============================================================================
  // BASIC COLLECTION VARIABLE TRANSFORMATION
  // =============================================================================

  describe('Basic Collection Variable Transformation', () => {
    test('should transform pm.collectionVariables.set in folder context', () => {
      const collection = {
        info: {
          name: 'Testing-Environment-Scope-Import',
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
                  url: 'https://api.example.com/login'
                },
                event: [
                  {
                    listen: 'test',
                    script: {
                      exec: [
                        'pm.collectionVariables.set("my-token", "set-from-collectionvariable");',
                        'console.log("Token set successfully");'
                      ]
                    }
                  }
                ]
              }
            ]
          }
        ]
      };
      const transformEngine = new TransformEngine({ preprocess: [], postprocess: DEFAULT_POSTPROCESS_RULES });
      const result = convert(JSON.stringify(collection), transformEngine) as ImportRequest[];
      const loginRequest = result.find(item => item.name === 'Login');

      expect(loginRequest).toBeDefined();
      expect(loginRequest!.afterResponseScript).toContain(
        "const thisFolder = insomnia.parentFolders.get('Authentication');"
      );
      expect(loginRequest!.afterResponseScript).toContain(
        'thisFolder.environment.set("my-token", "set-from-collectionvariable");'
      );
      expect(loginRequest!.afterResponseScript).not.toContain('pm.collectionVariables.set');
    });

    test('should transform pm.collectionVariables.get in folder context', () => {
      const collection = {
        info: {
          name: 'Testing-Environment-Scope-Import',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Users',
            item: [
              {
                name: 'Get Profile',
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/profile'
                },
                event: [
                  {
                    listen: 'prerequest',
                    script: {
                      exec: [
                        'const token = pm.collectionVariables.get("my-token");',
                        'pm.request.headers.add({key: "Authorization", value: `Bearer ${token}`});'
                      ]
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({ preprocess: [], postprocess: DEFAULT_POSTPROCESS_RULES });
      const result = convert(JSON.stringify(collection), transformEngine) as ImportRequest[];
      const profileRequest = result.find(item => item.name === 'Get Profile');

      expect(profileRequest).toBeDefined();
      expect(profileRequest!.preRequestScript).toContain(
        'insomnia.parentFolders.get(\'Users\').environment.get("my-token")'
      );
      expect(profileRequest!.preRequestScript).not.toContain('pm.collectionVariables.get');
    });

    test('should use collection name when no folder context', () => {
      const collection = {
        info: {
          name: 'Testing-Environment-Scope-Import',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Direct Request',
            request: {
              method: 'GET',
              url: 'https://api.example.com/direct'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: ['pm.collectionVariables.set("direct-token", "value");']
                }
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({ preprocess: [], postprocess: DEFAULT_POSTPROCESS_RULES });
      const result = convert(JSON.stringify(collection), transformEngine) as ImportRequest[];
      const directRequest = result.find(item => item.name === 'Direct Request');

      expect(directRequest).toBeDefined();
      expect(directRequest!.afterResponseScript).toContain(
        "const thisFolder = insomnia.parentFolders.get('Testing-Environment-Scope-Import');"
      );
      expect(directRequest!.afterResponseScript).toContain(
        'thisFolder.environment.set("direct-token", "value");'
      );
    });
  });

  // =============================================================================
  // NESTED FOLDER STRUCTURE TESTS
  // =============================================================================

  describe('Nested Folder Structure', () => {
    test('should handle nested folder structures correctly', () => {
      const collection = {
        info: {
          name: 'Testing-Environment-Scope-Import',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Level1',
            item: [
              {
                name: 'Level2',
                item: [
                  {
                    name: 'Deep Request',
                    request: {
                      method: 'GET',
                      url: 'https://api.example.com/deep'
                    },
                    event: [
                      {
                        listen: 'test',
                        script: {
                          exec: ['pm.collectionVariables.set("deep-token", "deep-value");']
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({ preprocess: [], postprocess: DEFAULT_POSTPROCESS_RULES });
      const result = convert(JSON.stringify(collection), transformEngine) as ImportRequest[];
      const deepRequest = result.find(item => item.name === 'Deep Request');

      expect(deepRequest).toBeDefined();
      expect(deepRequest!.afterResponseScript).toContain(
        "const thisFolder = insomnia.parentFolders.get('Level2');"
      );
      expect(deepRequest!.afterResponseScript).toContain(
        'thisFolder.environment.set("deep-token", "deep-value");'
      );
    });

    test('should handle multiple requests in same folder', () => {
      const collection = {
        info: {
          name: 'Testing-Environment-Scope-Import',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'SharedFolder',
            item: [
              {
                name: 'Request1',
                request: {
                  method: 'POST',
                  url: 'https://api.example.com/create'
                },
                event: [
                  {
                    listen: 'test',
                    script: {
                      exec: ['pm.collectionVariables.set("shared-token", "token1");']
                    }
                  }
                ]
              },
              {
                name: 'Request2',
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/get'
                },
                event: [
                  {
                    listen: 'prerequest',
                    script: {
                      exec: ['const token = pm.collectionVariables.get("shared-token");']
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({ preprocess: [], postprocess: DEFAULT_POSTPROCESS_RULES });
      const result = convert(JSON.stringify(collection), transformEngine) as ImportRequest[];
      const request1 = result.find(item => item.name === 'Request1');
      const request2 = result.find(item => item.name === 'Request2');

      expect(request1).toBeDefined();
      expect(request2).toBeDefined();

      // Both should use the same folder name
      expect(request1!.afterResponseScript).toContain(
        "const thisFolder = insomnia.parentFolders.get('SharedFolder');"
      );
      expect(request2!.preRequestScript).toContain(
        "insomnia.parentFolders.get('SharedFolder').environment.get(\"shared-token\")"
      );
    });
  });

  // =============================================================================
  // EDGE CASES AND ERROR HANDLING
  // =============================================================================

  describe('Edge Cases', () => {
    test('should handle empty scripts gracefully', () => {
      const collection = {
        info: {
          name: 'Testing-Environment-Scope-Import',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'EmptyScript',
            request: {
              method: 'GET',
              url: 'https://api.example.com/empty'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: []
                }
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({ preprocess: [], postprocess: DEFAULT_POSTPROCESS_RULES });
      const result = convert(JSON.stringify(collection), transformEngine) as ImportRequest[];
      const request = result.find(item => item.name === 'EmptyScript');

      expect(request).toBeDefined();
      expect(request!.afterResponseScript).toBe('');
    });

    test('should handle scripts without collection variables', () => {
      const collection = {
        info: {
          name: 'Testing-Environment-Scope-Import',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'NormalScript',
            request: {
              method: 'GET',
              url: 'https://api.example.com/normal'
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200", function () {',
                    '    pm.response.to.have.status(200);',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({ preprocess: [], postprocess: DEFAULT_POSTPROCESS_RULES });
      const result = convert(JSON.stringify(collection), transformEngine) as ImportRequest[];
      const request = result.find(item => item.name === 'NormalScript');

      expect(request).toBeDefined();
      expect(request!.afterResponseScript).toContain('insomnia.test');
      expect(request!.afterResponseScript).toContain('insomnia.response.to.have.status(200)');
      expect(request!.afterResponseScript).not.toContain('pm.test');
      expect(request!.afterResponseScript).not.toContain('collectionVariables');
    });

    test('should handle folder-level scripts', () => {
      const collection = {
        info: {
          name: 'Testing-Environment-Scope-Import',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'FolderWithScript',
            event: [
              {
                listen: 'prerequest',
                script: {
                  exec: ['pm.collectionVariables.set("folder-level-token", "folder-value");']
                }
              }
            ],
            item: [
              {
                name: 'ChildRequest',
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/child'
                }
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({ preprocess: [], postprocess: DEFAULT_POSTPROCESS_RULES });
      const result = convert(JSON.stringify(collection), transformEngine) as ImportRequest[];
      const folderWithScript = result.find(item => item.name === 'FolderWithScript');

      expect(folderWithScript).toBeDefined();
      expect(folderWithScript!.preRequestScript).toContain(
        "const thisFolder = insomnia.parentFolders.get('FolderWithScript');"
      );
      expect(folderWithScript!.preRequestScript).toContain(
        'thisFolder.environment.set("folder-level-token", "folder-value");'
      );
    });

    test('should handle mixed collection variable and regular code', () => {
      const collection = {
        info: {
          name: 'Testing-Environment-Scope-Import',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'MixedFolder',
            item: [
              {
                name: 'MixedScript',
                request: {
                  method: 'POST',
                  url: 'https://api.example.com/mixed'
                },
                event: [
                  {
                    listen: 'test',
                    script: {
                      exec: [
                        'pm.test("Response is OK", function () {',
                        '    pm.response.to.have.status(200);',
                        '});',
                        'const responseData = pm.response.json();',
                        'pm.collectionVariables.set("api-token", responseData.token);',
                        'pm.environment.set("lastResponse", Date.now());'
                      ]
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({ preprocess: [], postprocess: DEFAULT_POSTPROCESS_RULES });
      const result = convert(JSON.stringify(collection), transformEngine) as ImportRequest[];
      const mixedRequest = result.find(item => item.name === 'MixedScript');

      expect(mixedRequest).toBeDefined();

      const script = mixedRequest!.afterResponseScript;

      // Should transform collection variables
      expect(script).toContain(
        "const thisFolder = insomnia.parentFolders.get('MixedFolder');"
      );
      expect(script).toContain(
        'thisFolder.environment.set("api-token", responseData.token);'
      );

      // Should transform regular pm calls
      expect(script).toContain('insomnia.test');
      expect(script).toContain('insomnia.response.to.have.status(200)');
      expect(script).toContain('insomnia.environment.set("lastResponse", Date.now())');

      // Should not contain original pm calls
      expect(script).not.toContain('pm.test');
      expect(script).not.toContain('pm.collectionVariables.set');
    });
  });

  // =============================================================================
  // FOLDER CONTEXT TRACKING TESTS
  // =============================================================================

  describe('Folder Context Tracking', () => {
    test('should maintain separate context for sibling folders', () => {
      const collection = {
        info: {
          name: 'Testing-Environment-Scope-Import',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: [
          {
            name: 'Folder1',
            item: [
              {
                name: 'Request1',
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/folder1'
                },
                event: [
                  {
                    listen: 'test',
                    script: {
                      exec: ['pm.collectionVariables.set("token1", "value1");']
                    }
                  }
                ]
              }
            ]
          },
          {
            name: 'Folder2',
            item: [
              {
                name: 'Request2',
                request: {
                  method: 'GET',
                  url: 'https://api.example.com/folder2'
                },
                event: [
                  {
                    listen: 'test',
                    script: {
                      exec: ['pm.collectionVariables.set("token2", "value2");']
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      const transformEngine = new TransformEngine({ preprocess: [], postprocess: DEFAULT_POSTPROCESS_RULES });
      const result = convert(JSON.stringify(collection), transformEngine) as ImportRequest[];
      const request1 = result.find(item => item.name === 'Request1');
      const request2 = result.find(item => item.name === 'Request2');

      expect(request1).toBeDefined();
      expect(request2).toBeDefined();

      // Each should use their own folder name
      expect(request1!.afterResponseScript).toContain(
        "const thisFolder = insomnia.parentFolders.get('Folder1');"
      );
      expect(request2!.afterResponseScript).toContain(
        "const thisFolder = insomnia.parentFolders.get('Folder2');"
      );
    });
  });
});
