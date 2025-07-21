/**
 * Enhanced response examples handling for postman2insomnia
 *
 * This module extends the existing converter to preserve Postman response examples
 * by appending them to the request description field as markdown JSON blocks.
 *
 * All examples are included with consistent formatting:
 * - Pretty formatted JSON
 * - All response headers included
 */

// Generic type that works with both v2.0 and v2.1
type GenericPostmanItem = {
  request: unknown;
  name?: string;
  event?: unknown;
  response?: unknown[];
  description?: string | { content?: string };
};

/**
 * Interface representing a Postman response header
 */
interface PostmanResponseHeader {
  key: string;
  value: string;
  name?: string;
  description?: string;
}

/**
 * Interface representing the original request in a Postman response example
 */
interface PostmanOriginalRequest {
  method: string;
  header: PostmanResponseHeader[];
  url: unknown; // This can be string or complex URL object
  body?: unknown;
}

/**
 * Interface representing a Postman response example
 */
interface PostmanResponseExample {
  /** Unique identifier for the response */
  id?: string;
  /** Human-readable name for the response example */
  name: string;
  /** Original request that generated this response */
  originalRequest?: PostmanOriginalRequest;
  /** Response status information */
  status: string;
  /** HTTP status code */
  code: number;
  /** Response headers */
  header: PostmanResponseHeader[];
  /** Response body content */
  body?: string;
  /** Response cookies if any */
  cookie?: unknown[];
  /** Additional metadata */
  _postman_previewlanguage?: string;
}

/**
 * Interface representing the formatted response example data structure
 */
interface FormattedResponseExample {
  name: string;
  status: string;
  code: number;
  headers?: Record<string, string>;
  body?: unknown;
  contentType?: string;
  originalRequest?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
  };
}

/**
 * Generic Insomnia request interface for integration
 */
interface GenericInsomniaRequest {
  description: string;
}

/**
 * Interface representing form data item in request body
 */
interface FormDataItem {
  key: string;
  value: string;
  type?: string;
  description?: string;
}

/**
 * Interface representing URL encoded item in request body
 */
interface UrlEncodedItem {
  key: string;
  value: string;
}

/**
 * Interface representing a formatted request body
 */
interface FormattedRequestBody {
  mode: string;
  formdata?: FormDataItem[];
  raw?: string;
  urlencoded?: UrlEncodedItem[];
}

/**
 * Interface representing the formatted request data structure
 */
interface FormattedRequestExample {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: FormattedRequestBody | unknown;
}

/**
 * Helper function to format request body with proper typing
 *
 * @param body - Raw request body from Postman
 * @returns Formatted request body structure
 */
function formatRequestBody(body: unknown): FormattedRequestBody | unknown {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const bodyObj = body as Record<string, unknown>;

  // Handle formdata body mode
  if (bodyObj.mode === 'formdata' && Array.isArray(bodyObj.formdata)) {
    const formdata: FormDataItem[] = bodyObj.formdata.map((item: unknown) => {
      const formItem = item as Record<string, unknown>;
      const result: FormDataItem = {
        key: String(formItem.key || ''),
        value: String(formItem.value || '')
      };

      if (formItem.type && typeof formItem.type === 'string') {
        result.type = formItem.type;
      }

      if (formItem.description && typeof formItem.description === 'string') {
        result.description = formItem.description;
      }

      return result;
    });

    return {
      mode: 'formdata',
      formdata
    };
  }

  // Handle raw body mode
  if (bodyObj.mode === 'raw' && typeof bodyObj.raw === 'string') {
    return {
      mode: 'raw',
      raw: bodyObj.raw
    };
  }

  // Handle urlencoded body mode
  if (bodyObj.mode === 'urlencoded' && Array.isArray(bodyObj.urlencoded)) {
    const urlencoded: UrlEncodedItem[] = bodyObj.urlencoded.map((item: unknown) => {
      const urlItem = item as Record<string, unknown>;
      return {
        key: String(urlItem.key || ''),
        value: String(urlItem.value || '')
      };
    });

    return {
      mode: 'urlencoded',
      urlencoded
    };
  }

  // Return the body as-is for other modes or unknown structures
  return bodyObj;
}

/**
 * Helper function to extract URL from original request URL object
 *
 * @param url - URL from original request (can be string or object)
 * @returns Formatted URL string
 */
function extractUrlFromOriginalRequest(url: unknown): string {
  if (typeof url === 'string') {
    return url;
  }

  if (url && typeof url === 'object') {
    const urlObj = url as Record<string, unknown>;
    if (typeof urlObj.raw === 'string') {
      return urlObj.raw;
    }
  }

  return '';
}

/**
 * Complete formatResponseExamples function with request body support
 *
 * Processes Postman response examples and formats them as markdown with
 * complete request context (including body) followed by response details.
 *
 * @param responses - Array of Postman response examples
 * @returns Formatted markdown string containing request and response examples
 */
function formatResponseExamples(responses: PostmanResponseExample[]): string {
  if (!responses || responses.length === 0) {
    return '';
  }

  const exampleBlocks = responses.map((response, index) => {
    let exampleBlock = '';

    // First, add the request example if original request exists
    if (response.originalRequest) {
      const requestData: FormattedRequestExample = {
        method: response.originalRequest.method,
        url: extractUrlFromOriginalRequest(response.originalRequest.url)
      };

      // Add headers if present
      if (response.originalRequest.header && response.originalRequest.header.length > 0) {
        requestData.headers = response.originalRequest.header.reduce((acc: Record<string, string>, header) => {
          acc[header.key] = header.value;
          return acc;
        }, {});
      }

      // Add body if present
      if (response.originalRequest.body) {
        requestData.body = formatRequestBody(response.originalRequest.body);
      }

      const requestJsonString = JSON.stringify(requestData, null, 2);
      exampleBlock += `### Request Example ${index + 1}: ${response.name}\n\n\`\`\`json\n${requestJsonString}\n\`\`\`\n\n`;
    }

    // Then add the response example
    const responseData: FormattedResponseExample = {
      name: response.name,
      status: response.status,
      code: response.code
    };

    // Add headers if present
    if (response.header && response.header.length > 0) {
      responseData.headers = response.header.reduce((acc: Record<string, string>, header) => {
        acc[header.key] = header.value;
        return acc;
      }, {});
    }

    // Add response body if present
    if (response.body) {
      try {
        // Try to parse as JSON for better formatting
        const parsedBody: unknown = JSON.parse(response.body);
        responseData.body = parsedBody;
      } catch {
        // If not JSON, include as string
        responseData.body = response.body;
      }
    }

    // Add content type if available
    if (response._postman_previewlanguage) {
      responseData.contentType = response._postman_previewlanguage;
    }

    const responseJsonString = JSON.stringify(responseData, null, 2);
    exampleBlock += `### Response Example ${index + 1}: ${response.name}\n\n\`\`\`json\n${responseJsonString}\n\`\`\``;

    return exampleBlock;
  });

  return `\n\n## Response Examples\n\n${exampleBlocks.join('\n\n')}`;
}

/**
 * Enhanced version of the request conversion that includes response examples
 *
 * This function assumes that response examples should be included (the decision
 * to call this function is made at a higher level based on user configuration).
 *
 * @param postmanItem - The Postman collection item (request) to convert
 * @returns Enhanced description with response examples appended
 */
function enhanceRequestWithResponseExamples(postmanItem: GenericPostmanItem): string {
  // Get the existing description
  let description = '';

  if (postmanItem.description) {
    if (typeof postmanItem.description === 'string') {
      description = postmanItem.description;
    } else if (postmanItem.description.content) {
      description = postmanItem.description.content;
    }
  }

  // Process response examples if they exist
  if (postmanItem.response && postmanItem.response.length > 0) {
    const responseExamples = formatResponseExamples(
      postmanItem.response as PostmanResponseExample[]
    );

    description += responseExamples;
  }

  return description;
}

/**
 * Integration function to be called from the main converter
 *
 * This function enhances request descriptions with response examples.
 * It should only be called when the higher-level code has determined
 * that response examples should be included.
 *
 * @param postmanItem - Postman collection item (generic type)
 * @param insomniaRequest - Insomnia request being built (generic type)
 */
function integrateResponseExamples(
  postmanItem: GenericPostmanItem,
  insomniaRequest: GenericInsomniaRequest
): void {
  // Enhance the description with response examples
  const enhancedDescription = enhanceRequestWithResponseExamples(postmanItem);

  // Update the Insomnia request description
  if (enhancedDescription.trim()) {
    insomniaRequest.description = enhancedDescription;
  }
}


/**
 * Type guard to check if an object is a valid PostmanResponseExample
 *
 * @param response - Object to validate
 * @returns True if the object is a valid PostmanResponseExample
 */
function isValidPostmanResponseExample(response: unknown): response is PostmanResponseExample {
  if (!response || typeof response !== 'object') {
    return false;
  }

  const responseObj = response as Record<string, unknown>;

  return (
    typeof responseObj.name === 'string' &&
    typeof responseObj.status === 'string' &&
    typeof responseObj.code === 'number'
  );
}

/**
 * Utility function to validate response examples
 *
 * @param responses - Array of response examples to validate
 * @returns Array of valid response examples
 */
function validateResponseExamples(responses: unknown[]): PostmanResponseExample[] {
  return responses.filter(isValidPostmanResponseExample);
}

export {
  GenericPostmanItem,
  GenericInsomniaRequest,
  PostmanResponseExample,
  PostmanResponseHeader,
  PostmanOriginalRequest,
  FormattedResponseExample,
  formatResponseExamples,
  enhanceRequestWithResponseExamples,
  integrateResponseExamples,
  validateResponseExamples,
  isValidPostmanResponseExample
};
