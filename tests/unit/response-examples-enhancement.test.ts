/**
 * Test suite for response examples enhancement
 *
 * Tests the integration of Postman response examples into Insomnia request descriptions,
 * including edge cases, error handling, and proper appending to existing descriptions.
 */

import {
  formatResponseExamples,
  enhanceRequestWithResponseExamples,
  integrateResponseExamples,
  validateResponseExamples,
  isValidPostmanResponseExample,
  GenericPostmanItem,
  GenericInsomniaRequest,
  PostmanResponseExample
} from '../../src/response-examples-enhancement';

describe('Response Examples Enhancement', () => {

  // ==========================================================================
  // Test Data Setup
  // ==========================================================================

  const mockSuccessResponse: PostmanResponseExample = {
    id: "response-1",
    name: "Successful Upload",
    status: "OK",
    code: 200,
    header: [
      { key: "Content-Type", value: "application/json" },
      { key: "X-Request-ID", value: "12345" }
    ],
    body: JSON.stringify({
      id: "doc123",
      status: "uploaded",
      message: "Document processed successfully"
    }),
    _postman_previewlanguage: "json"
  };

  const mockErrorResponse: PostmanResponseExample = {
    name: "Bad Request",
    status: "Bad Request",
    code: 400,
    header: [
      { key: "Content-Type", value: "application/json" }
    ],
    body: JSON.stringify({
      error: "Invalid file format",
      code: "INVALID_FORMAT"
    })
  };

  const mockUnauthorizedResponse: PostmanResponseExample = {
    name: "Unauthorized",
    status: "Unauthorized",
    code: 401,
    header: [
      { key: "Content-Type", value: "application/json" },
      { key: "WWW-Authenticate", value: "Bearer" }
    ],
    body: JSON.stringify({
      error: "Authentication required",
      message: "Please provide a valid access token"
    }),
    _postman_previewlanguage: "json"
  };

  // ==========================================================================
  // Response Formatting Tests
  // ==========================================================================

  describe('formatResponseExamples', () => {
    test('should format single response example correctly', () => {
      const result = formatResponseExamples([mockSuccessResponse]);

      expect(result).toContain('## Response Examples');
      expect(result).toContain('### Response Example 1: Successful Upload');
      expect(result).toContain('```json');
      expect(result).toContain('"name": "Successful Upload"');
      expect(result).toContain('"code": 200');
      expect(result).toContain('"status": "OK"');
      expect(result).toContain('"Content-Type": "application/json"');
      expect(result).toContain('"X-Request-ID": "12345"');
    });

    test('should format multiple response examples', () => {
      const result = formatResponseExamples([mockSuccessResponse, mockErrorResponse, mockUnauthorizedResponse]);

      expect(result).toContain('## Response Examples');
      expect(result).toContain('### Response Example 1: Successful Upload');
      expect(result).toContain('### Response Example 2: Bad Request');
      expect(result).toContain('### Response Example 3: Unauthorized');

      // Check that all status codes are present
      expect(result).toContain('"code": 200');
      expect(result).toContain('"code": 400');
      expect(result).toContain('"code": 401');
    });

    test('should include headers in formatted output', () => {
      const result = formatResponseExamples([mockSuccessResponse]);

      expect(result).toContain('"headers"');
      expect(result).toContain('"Content-Type": "application/json"');
      expect(result).toContain('"X-Request-ID": "12345"');
    });

    test('should parse JSON response bodies correctly', () => {
      const result = formatResponseExamples([mockSuccessResponse]);

      // Should contain the parsed JSON object, not the string
      expect(result).toContain('"id": "doc123"');
      expect(result).toContain('"status": "uploaded"');
      expect(result).toContain('"message": "Document processed successfully"');
    });

    test('should handle non-JSON response bodies as strings', () => {
      const textResponse: PostmanResponseExample = {
        name: "Plain Text Response",
        status: "OK",
        code: 200,
        header: [{ key: "Content-Type", value: "text/plain" }],
        body: "Plain text response content"
      };

      const result = formatResponseExamples([textResponse]);
      expect(result).toContain('"body": "Plain text response content"');
    });

    test('should include content type when available', () => {
      const result = formatResponseExamples([mockSuccessResponse]);
      expect(result).toContain('"contentType": "json"');
    });

    test('should handle responses without headers', () => {
      const responseWithoutHeaders: PostmanResponseExample = {
        name: "No Headers Response",
        status: "OK",
        code: 200,
        header: []
      };

      const result = formatResponseExamples([responseWithoutHeaders]);
      expect(result).not.toContain('"headers"');
      expect(result).toContain('"name": "No Headers Response"');
    });

    test('should handle empty response array', () => {
      const result = formatResponseExamples([]);
      expect(result).toBe('');
    });

    test('should pretty format JSON with proper indentation', () => {
      const result = formatResponseExamples([mockSuccessResponse]);

      // Check for proper JSON indentation (2 spaces)
      expect(result).toMatch(/{\n  "name"/);
      expect(result).toMatch(/,\n  "status"/);
    });
  });

  // ==========================================================================
  // Request Enhancement Tests
  // ==========================================================================

  describe('enhanceRequestWithResponseExamples', () => {
    test('should append response examples to existing string description', () => {
      const mockItem: GenericPostmanItem = {
        request: { method: 'POST' },
        name: 'Upload Document',
        description: 'This endpoint uploads a document for processing.',
        response: [mockSuccessResponse, mockErrorResponse]
      };

      const result = enhanceRequestWithResponseExamples(mockItem);

      expect(result).toContain('This endpoint uploads a document for processing.');
      expect(result).toContain('## Response Examples');
      expect(result).toContain('Successful Upload');
      expect(result).toContain('Bad Request');
    });

    test('should append response examples to existing object description', () => {
      const mockItem: GenericPostmanItem = {
        request: { method: 'POST' },
        name: 'Upload Document',
        description: {
          content: 'Object-based description content'
        },
        response: [mockSuccessResponse]
      };

      const result = enhanceRequestWithResponseExamples(mockItem);

      expect(result).toContain('Object-based description content');
      expect(result).toContain('## Response Examples');
      expect(result).toContain('Successful Upload');
    });

    test('should handle item with no existing description', () => {
      const mockItem: GenericPostmanItem = {
        request: { method: 'POST' },
        name: 'Upload Document',
        response: [mockSuccessResponse]
      };

      const result = enhanceRequestWithResponseExamples(mockItem);

      expect(result).toContain('## Response Examples');
      expect(result).toContain('Successful Upload');
      expect(result).not.toContain('undefined');
    });

    test('should handle item with empty string description', () => {
      const mockItem: GenericPostmanItem = {
        request: { method: 'POST' },
        name: 'Upload Document',
        description: '',
        response: [mockSuccessResponse]
      };

      const result = enhanceRequestWithResponseExamples(mockItem);

      expect(result).toContain('## Response Examples');
      expect(result).toContain('Successful Upload');
    });

    test('should handle item with no responses', () => {
      const mockItem: GenericPostmanItem = {
        request: { method: 'POST' },
        name: 'Upload Document',
        description: 'This endpoint uploads a document.',
        response: []
      };

      const result = enhanceRequestWithResponseExamples(mockItem);

      expect(result).toBe('This endpoint uploads a document.');
      expect(result).not.toContain('## Response Examples');
    });

    test('should handle item with undefined responses', () => {
      const mockItem: GenericPostmanItem = {
        request: { method: 'POST' },
        name: 'Upload Document',
        description: 'This endpoint uploads a document.'
      };

      const result = enhanceRequestWithResponseExamples(mockItem);

      expect(result).toBe('This endpoint uploads a document.');
      expect(result).not.toContain('## Response Examples');
    });

    test('should preserve line breaks in existing descriptions', () => {
      const mockItem: GenericPostmanItem = {
        request: { method: 'POST' },
        name: 'Upload Document',
        description: 'Line 1\nLine 2\n\nLine 4',
        response: [mockSuccessResponse]
      };

      const result = enhanceRequestWithResponseExamples(mockItem);

      expect(result).toContain('Line 1\nLine 2\n\nLine 4');
      expect(result).toContain('## Response Examples');
    });
  });

  // ==========================================================================
  // Integration Function Tests
  // ==========================================================================

  describe('integrateResponseExamples', () => {
    test('should modify insomnia request description', () => {
      const mockItem: GenericPostmanItem = {
        request: { method: 'POST' },
        name: 'Upload Document',
        description: 'Original description',
        response: [mockSuccessResponse]
      };

      const mockInsomniaRequest: GenericInsomniaRequest = {
        description: 'Original description'
      };

      integrateResponseExamples(mockItem, mockInsomniaRequest);

      expect(mockInsomniaRequest.description).toContain('Original description');
      expect(mockInsomniaRequest.description).toContain('## Response Examples');
      expect(mockInsomniaRequest.description).toContain('Successful Upload');
    });

    test('should not modify request if no enhanced description', () => {
      const mockItem: GenericPostmanItem = {
        request: { method: 'POST' },
        name: 'Upload Document',
        response: []
      };

      const mockInsomniaRequest: GenericInsomniaRequest = {
        description: ''
      };

      integrateResponseExamples(mockItem, mockInsomniaRequest);

      expect(mockInsomniaRequest.description).toBe('');
    });

    test('should handle whitespace-only descriptions', () => {
      const mockItem: GenericPostmanItem = {
        request: { method: 'POST' },
        name: 'Upload Document',
        description: '   \n   ',
        response: [mockSuccessResponse]
      };

      const mockInsomniaRequest: GenericInsomniaRequest = {
        description: '   \n   '
      };

      integrateResponseExamples(mockItem, mockInsomniaRequest);

      // Should still enhance because there's actual content being added
      expect(mockInsomniaRequest.description).toContain('## Response Examples');
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe('validateResponseExamples', () => {
    test('should filter out invalid response examples', () => {
      const mixedResponses = [
        mockSuccessResponse,
        { name: "Valid", status: "OK", code: 200 },
        { name: "Missing code" }, // Invalid
        null, // Invalid
        { code: 400 }, // Invalid - missing name and status
        mockErrorResponse,
        undefined // Invalid
      ];

      const validResponses = validateResponseExamples(mixedResponses);

      expect(validResponses).toHaveLength(3);
      expect(validResponses[0]).toEqual(mockSuccessResponse);
      expect(validResponses[2]).toEqual(mockErrorResponse);
    });

    test('should return empty array for all invalid responses', () => {
      const invalidResponses = [
        null,
        undefined,
        { name: "incomplete" },
        { code: 200 },
        { status: "OK" },
        "string response"
      ];

      const validResponses = validateResponseExamples(invalidResponses);
      expect(validResponses).toHaveLength(0);
    });
  });

  describe('isValidPostmanResponseExample', () => {
    test('should validate complete response examples', () => {
      expect(isValidPostmanResponseExample(mockSuccessResponse)).toBe(true);
      expect(isValidPostmanResponseExample(mockErrorResponse)).toBe(true);
    });

    test('should reject incomplete response examples', () => {
      expect(isValidPostmanResponseExample({ name: "test" })).toBe(false);
      expect(isValidPostmanResponseExample({ code: 200 })).toBe(false);
      expect(isValidPostmanResponseExample({ status: "OK" })).toBe(false);
      expect(isValidPostmanResponseExample(null)).toBe(false);
      expect(isValidPostmanResponseExample(undefined)).toBe(false);
      expect(isValidPostmanResponseExample("string")).toBe(false);
    });

    test('should require all three essential fields', () => {
      const partialResponse = {
        name: "Test Response",
        status: "OK"
        // Missing code
      };

      expect(isValidPostmanResponseExample(partialResponse)).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases and Error Handling
  // ==========================================================================

  describe('Edge cases and error handling', () => {
    test('should handle malformed JSON in response body gracefully', () => {
      const malformedResponse: PostmanResponseExample = {
        name: "Malformed JSON",
        status: "OK",
        code: 200,
        header: [],
        body: '{ invalid json'
      };

      const result = formatResponseExamples([malformedResponse]);

      expect(result).toContain('Malformed JSON');
      expect(result).toContain('"body": "{ invalid json"');
    });

    test('should handle responses with minimal data', () => {
      const minimalResponse: PostmanResponseExample = {
        name: "Minimal Response",
        status: "OK",
        code: 200,
        header: []
      };

      const result = formatResponseExamples([minimalResponse]);

      expect(result).toContain('Minimal Response');
      expect(result).toContain('"code": 200');
      expect(result).not.toContain('"headers"');
      expect(result).not.toContain('"body"');
    });

    test('should handle very large response bodies', () => {
      const largeBody = JSON.stringify({
        data: new Array(100).fill("large data item"),
        metadata: {
          count: 100,
          description: "This is a very large response body for testing"
        }
      });

      const largeResponse: PostmanResponseExample = {
        name: "Large Response",
        status: "OK",
        code: 200,
        header: [{ key: "Content-Type", value: "application/json" }],
        body: largeBody
      };

      const result = formatResponseExamples([largeResponse]);

      expect(result).toContain('Large Response');
      expect(result).toContain('"count": 100');
    });

    test('should handle responses with special characters in names', () => {
      const specialResponse: PostmanResponseExample = {
        name: "Response with 'quotes' and \"double quotes\" & symbols!",
        status: "OK",
        code: 200,
        header: []
      };

      const result = formatResponseExamples([specialResponse]);

      expect(result).toContain("Response with 'quotes' and \"double quotes\" & symbols!");
    });

    test('should handle responses with Unicode characters', () => {
      const unicodeResponse: PostmanResponseExample = {
        name: "Unicode Response 🚀",
        status: "OK",
        code: 200,
        header: [],
        body: JSON.stringify({ message: "Hello 世界! 🌍" })
      };

      const result = formatResponseExamples([unicodeResponse]);

      expect(result).toContain('Unicode Response 🚀');
      expect(result).toContain('Hello 世界! 🌍');
    });

    test('should handle complex nested JSON response bodies', () => {
      const complexBody = JSON.stringify({
        user: {
          id: 123,
          name: "John Doe",
          preferences: {
            theme: "dark",
            notifications: {
              email: true,
              push: false,
              sms: {
                enabled: true,
                frequency: "weekly"
              }
            }
          }
        },
        metadata: {
          timestamp: "2024-01-01T00:00:00Z",
          version: "1.0.0"
        }
      });

      const complexResponse: PostmanResponseExample = {
        name: "Complex Nested Response",
        status: "OK",
        code: 200,
        header: [{ key: "Content-Type", value: "application/json" }],
        body: complexBody
      };

      const result = formatResponseExamples([complexResponse]);

      expect(result).toContain('Complex Nested Response');
      expect(result).toContain('"id": 123');
      expect(result).toContain('"frequency": "weekly"');
    });
  });

  // ==========================================================================
  // Real-world Integration Test
  // ==========================================================================

  describe('Real-world integration', () => {
    test('should handle actual Postman collection structure', () => {
      // This mimics the structure from your actual paste.txt file
      const realWorldItem: GenericPostmanItem = {
        request: {
          method: "POST",
          header: [
            { key: "context-partnerid", value: "web_sofinco" },
            { key: "Authorization", value: "Bearer {{POD-UAT}}" }
          ],
          url: "https://kong-gateway.com/supportingDocuments/v1/contracts/:id/supportingDocuments/:documentId/upload"
        },
        name: "Step 5. Call upload and OCR of a supporting document - multiple files",
        description: "Upload and process supporting documents with OCR capability",
        response: [
          {
            name: "upload and OCR result",
            status: "OK",
            code: 200,
            header: [
              { key: "Content-Type", value: "application/json" }
            ],
            body: JSON.stringify({
              id: "Lorem adipisicing aliqua",
              borrowerCode: "nisi in enim ali",
              status: "toBeValidated",
              ocrResult: {
                status: "AUTH_ERROR",
                globalResult: "NONE"
              }
            }),
            _postman_previewlanguage: "json"
          },
          {
            name: "Bad request",
            status: "Bad Request",
            code: 400,
            header: [
              { key: "Content-Type", value: "application/json" }
            ],
            body: JSON.stringify({
              code: "enim ut pariatur nos",
              shortlib: "eiusmod exercitation Lorem qui"
            }),
            _postman_previewlanguage: "json"
          }
        ]
      };

      const result = enhanceRequestWithResponseExamples(realWorldItem);

      expect(result).toContain('Upload and process supporting documents with OCR capability');
      expect(result).toContain('## Response Examples');
      expect(result).toContain('upload and OCR result');
      expect(result).toContain('Bad request');
      expect(result).toContain('"borrowerCode": "nisi in enim ali"');
      expect(result).toContain('"shortlib": "eiusmod exercitation Lorem qui"');
      expect(result).toContain('"contentType": "json"');
    });

    test('should maintain proper markdown structure', () => {
      const mockItem: GenericPostmanItem = {
        request: { method: 'POST' },
        name: 'Test Request',
        description: '# Original Title\n\nThis is the original description with **bold** text.',
        response: [mockSuccessResponse, mockErrorResponse]
      };

      const result = enhanceRequestWithResponseExamples(mockItem);

      // Should preserve original markdown
      expect(result).toContain('# Original Title');
      expect(result).toContain('**bold**');

      // Should add properly formatted response examples
      expect(result).toContain('\n\n## Response Examples\n\n');
      expect(result).toContain('### Response Example 1:');
      expect(result).toContain('### Response Example 2:');
    });
  });
  // Add this to your existing test suite in response-examples-enhancement.test.ts

describe('Original Request Handling', () => {
  const mockResponseWithOriginalRequest: PostmanResponseExample = {
    name: "No Content",
    status: "No Content",
    code: 204,
    header: [
      { key: "Content-Type", value: "text/plain" }
    ],
    body: "",
    _postman_previewlanguage: "text",
    originalRequest: {
      method: "DELETE",
      header: [
        {
          key: "Authorization",
          value: "reprehenderit aliqu"
        },
        {
          key: "context-partnerid",
          value: "reprehenderit aliqu"
        },
        {
          key: "context-applicationid",
          value: "reprehenderit aliqu"
        }
      ],
      url: {
        raw: "{{baseUrl}}/contracts/:id/supportingDocuments/:documentId/pages",
        host: ["{{baseUrl}}"],
        path: ["contracts", ":id", "supportingDocuments", ":documentId", "pages"],
        variable: [
          { key: "id" },
          { key: "documentId" }
        ]
      },
      body: undefined
    }
  };

  test('should include original request information when available', () => {
    const result = formatResponseExamples([mockResponseWithOriginalRequest]);

    expect(result).toContain('## Response Examples');
    expect(result).toContain('### Response Example 1: No Content');
    expect(result).toContain('"originalRequest"');
    expect(result).toContain('"method": "DELETE"');
    expect(result).toContain('"url": "{{baseUrl}}/contracts/:id/supportingDocuments/:documentId/pages"');
    expect(result).toContain('"Authorization": "reprehenderit aliqu"');
    expect(result).toContain('"context-partnerid": "reprehenderit aliqu"');
    expect(result).toContain('"context-applicationid": "reprehenderit aliqu"');
  });

  test('should handle original request with string URL', () => {
    const responseWithStringUrl: PostmanResponseExample = {
      name: "String URL Response",
      status: "OK",
      code: 200,
      header: [],
      originalRequest: {
        method: "GET",
        header: [],
        url: "https://api.example.com/users"
      }
    };

    const result = formatResponseExamples([responseWithStringUrl]);

    expect(result).toContain('"originalRequest"');
    expect(result).toContain('"method": "GET"');
    expect(result).toContain('"url": "https://api.example.com/users"');
  });

  test('should handle original request without headers', () => {
    const responseWithoutHeaders: PostmanResponseExample = {
      name: "No Headers Request",
      status: "OK",
      code: 200,
      header: [],
      originalRequest: {
        method: "GET",
        header: [],
        url: "https://api.example.com/simple"
      }
    };

    const result = formatResponseExamples([responseWithoutHeaders]);

    expect(result).toContain('"originalRequest"');
    expect(result).toContain('"method": "GET"');
    expect(result).toContain('"url": "https://api.example.com/simple"');
    expect(result).not.toContain('"headers"');
  });

  test('should handle response without original request', () => {
    const responseWithoutOriginalRequest: PostmanResponseExample = {
      name: "No Original Request",
      status: "OK",
      code: 200,
      header: []
    };

    const result = formatResponseExamples([responseWithoutOriginalRequest]);

    expect(result).toContain('"name": "No Original Request"');
    expect(result).not.toContain('"originalRequest"');
  });

  test('should handle malformed original request URL', () => {
    const responseWithMalformedUrl: PostmanResponseExample = {
      name: "Malformed URL",
      status: "OK",
      code: 200,
      header: [],
      originalRequest: {
        method: "POST",
        header: [],
        url: null // Malformed URL
      }
    };

    const result = formatResponseExamples([responseWithMalformedUrl]);

    expect(result).toContain('"originalRequest"');
    expect(result).toContain('"method": "POST"');
    expect(result).toContain('"url": ""'); // Should fallback to empty string
  });

  test('should handle complex URL object structure', () => {
    const responseWithComplexUrl: PostmanResponseExample = {
      name: "Complex URL",
      status: "OK",
      code: 200,
      header: [],
      originalRequest: {
        method: "PUT",
        header: [],
        url: {
          raw: "https://api.example.com/users/:id?active=true",
          protocol: "https",
          host: ["api", "example", "com"],
          path: ["users", ":id"],
          query: [{ key: "active", value: "true" }],
          variable: [{ key: "id", value: "123" }]
        }
      }
    };

    const result = formatResponseExamples([responseWithComplexUrl]);

    expect(result).toContain('"originalRequest"');
    expect(result).toContain('"method": "PUT"');
    expect(result).toContain('"url": "https://api.example.com/users/:id?active=true"');
  });
});
});
