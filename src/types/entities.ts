// =============================================================================
// ENTITY TYPE DEFINITIONS - SHARED INTERFACES AND TYPES
// =============================================================================
// This file defines the core TypeScript interfaces used throughout the
// Postman to Insomnia converter. These types represent the internal format
// that Postman data gets converted TO (not the original Postman format).
//
// IMPORTANT: These are NOT Postman types - they represent the intermediate
// format used by the converter before generating Insomnia v5 output.
//
// ORIGIN: Adapted from Insomnia's internal type definitions
// PURPOSE: Provides type safety for the conversion pipeline
// =============================================================================

/**
 * Base interface for items that can have comments/descriptions
 * Used throughout the system for documentation fields
 */
export interface Comment {
  comment?: string;
}

/**
 * Template variable syntax used by Insomnia
 * Format: {{ variableName }} - note the spaces and double braces
 *
 * EXAMPLES:
 * - {{ baseUrl }}
 * - {{ apiKey }}
 * - {{ _['api-key'] }} (for variables with hyphens)
 */
export type Variable = `{{ ${string} }}`;

/**
 * Authentication configuration for requests and request groups
 *
 * SUPPORTED AUTH TYPES:
 * - basic: HTTP Basic Authentication (username/password)
 * - oauth2: OAuth 2.0 flows (authorization_code, client_credentials, etc.)
 * - bearer: Bearer token authentication (JWT, API tokens)
 * - apikey: API key authentication (header or query parameter)
 * - awsv4: AWS Signature Version 4
 * - digest: HTTP Digest Authentication
 * - oauth1: OAuth 1.0 authentication
 *
 * OAUTH2 GRANT TYPES:
 * - authorization_code: Standard OAuth2 flow with auth code
 * - password: Resource owner password credentials flow
 * - client_credentials: Client credentials flow (machine-to-machine)
 *
 * NOTE: Some fields use Variable type for template substitution
 */
export interface Authentication extends Comment {
  /** OAuth2 authorization endpoint URL */
  authorizationUrl?: string;

  /** OAuth2 token endpoint URL */
  accessTokenUrl?: string;

  /** OAuth2 client identifier */
  clientId?: string;

  /** OAuth2 client secret (often templated for security) */
  clientSecret?: Variable;

  /** OAuth2 scope string (space-separated scopes) */
  scope?: string;

  /** Authentication method type */
  type?: 'basic' | 'oauth2' | 'bearer' | 'apikey' | 'awsv4' | 'digest' | 'oauth1';

  /** OAuth2 grant type */
  grantType?: 'authorization_code' | 'password' | 'client_credentials';

  /** Whether this authentication is disabled */
  disabled?: boolean;

  /** Username for basic/digest auth */
  username?: string;

  /** Password for basic/digest auth */
  password?: string;
}

/**
 * Represents a parameter (query parameter, form field, etc.)
 *
 * USAGE CONTEXTS:
 * - URL query parameters (?key=value)
 * - Form data fields (multipart or urlencoded)
 * - Path parameters (/users/:id)
 *
 * FILE UPLOAD SUPPORT:
 * - When type='file', use fileName/filename for file path
 * - Regular parameters use value field
 */
export interface Parameter extends Comment {
  /** Parameter name/key */
  name: string;

  /** Parameter value (for non-file parameters) */
  value?: string;

  /** File name for file uploads (legacy field name) */
  filename?: string;

  /** File name for file uploads (preferred field name) */
  fileName?: string;

  /** Whether this parameter is disabled/excluded */
  disabled?: boolean;

  /** Parameter type - 'file' for uploads, usually omitted for regular params */
  type?: 'file' | string;
}

/**
 * Request body content - supports multiple formats
 *
 * SIMPLE FORMAT: Just a string containing the body content
 *
 * COMPLEX FORMAT: Object with:
 * - mimeType: Content-Type for the body
 * - text: String content (for raw bodies)
 * - params: Array of parameters (for form submissions)
 *
 * COMMON MIME TYPES:
 * - application/json: JSON data
 * - application/xml: XML data
 * - text/plain: Plain text
 * - multipart/form-data: File uploads and form fields
 * - application/x-www-form-urlencoded: Form submissions
 * - application/graphql: GraphQL queries
 */
export type Body =
  | string
  | {
      /** MIME type of the body content */
      mimeType?: string;

      /** Raw text content (for text-based bodies) */
      text?: string;

      /** Parameter array (for form-based bodies) */
      params?: Parameter[];
    };

/**
 * HTTP Cookie representation
 * Simple key-value structure for cookie data
 */
export interface Cookie {
  /** Cookie name */
  name: string;

  /** Cookie value */
  value: string;
}

/**
 * HTTP Header representation
 *
 * SPECIAL HEADERS:
 * - 'Cookie': Handled specially for cookie management
 * - 'Content-Type': Often auto-generated based on body type
 *
 * VALUE TYPE: 'any' to support both string values and template variables
 */
export interface Header extends Comment {
  /** Header name (e.g., 'Content-Type', 'Authorization') */
  name: 'Cookie' | 'Content-Type' | string;

  /** Whether this header is disabled */
  disabled?: boolean;

  /** Header value (string or template variable) */
  value: any;
}

/**
 * Query string parameter (URL parameters)
 * Simplified version of Parameter for URL-specific use
 */
export interface QueryString extends Comment {
  /** Query parameter name */
  name: string;
}

/**
 * Import request type discriminator
 * Used to identify what kind of resource this is in the conversion pipeline
 *
 * TYPES:
 * - 'environment': Environment/workspace data
 * - 'request': Individual HTTP request
 * - 'request_group': Folder/collection container
 * - 'workspace': Top-level workspace container
 */
export type ImportRequestType = 'environment' | 'request' | 'request_group' | 'workspace';

/**
 * Core entity representing any convertible item
 *
 * This is the main data structure used throughout the conversion pipeline.
 * All Postman items (requests, folders, environments) get converted to this format
 * before being transformed into Insomnia v5 format.
 *
 * DISCRIMINATED UNION: The _type field determines which other fields are relevant
 *
 * HIERARCHY: parentId creates the tree structure:
 * - workspace (parentId: null)
 *   - request_group (parentId: workspace._id)
 *     - request (parentId: request_group._id)
 *     - request_group (parentId: request_group._id) // nested folders
 */
export interface ImportRequest extends Comment {
  /** Unique identifier for this resource */
  _id?: string;

  /** Resource type - determines structure and behavior */
  _type?: string;

  /** Authentication configuration (requests and groups) */
  authentication?: Authentication;

  /** Request body content (requests only) */
  body?: Body;

  /** HTTP cookies (requests only) */
  cookies?: Cookie[];

  /** Environment variables (environments only) */
  environment?: {};

  /** HTTP headers (requests only) */
  headers?: Header[];

  /** HTTP version (rarely used) */
  httpVersion?: string;

  /** HTTP method (requests only) */
  method?: string;

  /** Display name for this resource */
  name?: string;

  /** Additional data storage */
  data?: object;

  /** Description/documentation */
  description?: string;

  /** Query parameters (requests only) */
  parameters?: Parameter[];

  /** Parent resource ID (null for top-level items) */
  parentId?: string | null;

  /** Variables defined at this level */
  variable?: any;

  /** Query string parameters (alternative to parameters) */
  queryString?: QueryString[];

  /** Request URL (requests only) */
  url?: string;

  /** Pre-request script content */
  preRequestScript?: string;

  /** Post-response script content */
  afterResponseScript?: string;

  /** Sort order for UI display */
  metaSortKey?: number;

  /** Scope for environments ('environment' for env resources) */
  scope?: string;
}

/**
 * Error result structure for failed conversions
 * Used when a conversion cannot be completed
 */
interface ConvertErrorResult {
  /** Human-readable error message describing the failure */
  convertErrorMessage: string;
}

/**
 * Result type for converter functions
 *
 * RETURN VALUES:
 * - ImportRequest[]: Successful conversion with array of resources
 * - ConvertErrorResult: Conversion failed with error details
 * - null: Unable to process (e.g., unrecognized format)
 */
type ConvertResult = ImportRequest[] | ConvertErrorResult | null;

/**
 * Converter function signature
 *
 * All format-specific converters (Postman, environments, etc.) implement this interface
 *
 * @param rawData Raw string content from the input file
 * @param transformEngine Optional transform engine for preprocessing/postprocessing
 * @param useCollectionFolder Optional flag to add collection name as containing folder
 * @returns Conversion result or error
 */
export type Converter = (
  rawData: string,
  transformEngine?: any,
  useCollectionFolder?: boolean
) => ConvertResult | Promise<ConvertResult>;

/**
 * Import entry metadata
 * Contains the file content and optional metadata about the source file
 *
 * USAGE: Passed to converters along with content for context-aware processing
 */
export interface ImportEntry {
  /** File content as string */
  contentStr: string;

  /** Original filename (without path) */
  oriFileName?: string;

  /** Full original file path */
  oriFilePath?: string;
}

// =============================================================================
// NOTES FOR MAINTAINERS
// =============================================================================

/*
KEY UNDERSTANDING:

1. **INTERMEDIATE FORMAT**: These types represent the converter's internal format,
   NOT the final Insomnia v5 format. The conversion flow is:
   Postman JSON → ImportRequest[] → Insomnia v5 YAML

2. **DISCRIMINATED UNIONS**: The _type field is critical for determining what
   other fields are valid. Different _type values create different "shapes"
   of the ImportRequest interface.

3. **HIERARCHY MANAGEMENT**: The parentId system creates tree structures:
   - Root items have parentId: null or '__WORKSPACE_ID__'
   - Child items reference their parent's _id
   - This maintains folder/request organization from Postman

4. **TEMPLATE VARIABLES**: The Variable type represents Insomnia's template
   syntax. These get processed during final output generation.

5. **AUTHENTICATION COMPLEXITY**: The Authentication interface supports many
   auth types, but actual implementations may be simplified depending on
   converter complexity.

WHEN TO MODIFY:

1. **New Postman Features**: If Postman adds new request types or features,
   you may need to extend these interfaces

2. **New Auth Methods**: Add new auth types to the Authentication interface
   type union

3. **New Body Formats**: Extend the Body type if new content types are needed

4. **New Resource Types**: Add to ImportRequestType if new convertible items
   are added

MAINTENANCE TIPS:

- Keep interfaces minimal - only add fields that are actually used
- Use optional fields (?) for anything that might not be present
- Consider backward compatibility when modifying existing interfaces
- Test type changes with real conversion scenarios
- Document any new fields with clear JSDoc comments

This file is the "contract" between conversion stages - changes here affect
the entire pipeline, so modify carefully!
*/
