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
}

/**
 * Generic Insomnia request interface for integration
 */
interface GenericInsomniaRequest {
  description: string;
}

/**
 * Processes Postman response examples and formats them as markdown
 *
 * Always includes:
 * - All available response examples
 * - Pretty formatted JSON
 * - Response headers
 *
 * @param responses - Array of Postman response examples
 * @returns Formatted markdown string containing response examples
 */
function formatResponseExamples(responses: PostmanResponseExample[]): string {
  if (!responses || responses.length === 0) {
    return '';
  }

  const exampleBlocks = responses.map((response, index) => {
    // Create the response example object with proper typing
    const exampleData: FormattedResponseExample = {
      name: response.name,
      status: response.status,
      code: response.code
    };

    // Always include headers if present
    if (response.header && response.header.length > 0) {
      exampleData.headers = response.header.reduce((acc: Record<string, string>, header) => {
        acc[header.key] = header.value;
        return acc;
      }, {});
    }

    // Add response body if present
    if (response.body) {
      try {
        // Try to parse as JSON for better formatting
        const parsedBody: unknown = JSON.parse(response.body);
        exampleData.body = parsedBody;
      } catch {
        // If not JSON, include as string
        exampleData.body = response.body;
      }
    }

    // Add preview language if available
    if (response._postman_previewlanguage) {
      exampleData.contentType = response._postman_previewlanguage;
    }

    // Always use pretty formatting
    const jsonString = JSON.stringify(exampleData, null, 2);

    return `### Response Example ${index + 1}: ${response.name}\n\n\`\`\`json\n${jsonString}\n\`\`\``;
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
