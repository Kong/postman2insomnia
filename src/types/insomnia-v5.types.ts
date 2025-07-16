/**
 * Insomnia v5 Type Definitions
 *
 * This file contains type definitions for the Insomnia v5 export format.
 * These types ensure that generated exports conform to the official
 * Insomnia v5 schema specification.
 *
 * @fileoverview Type definitions for Insomnia v5 export format
 * @module InsomniaV5Types
 */

/**
 * Base metadata structure for all Insomnia v5 resources
 *
 * This interface defines the common metadata fields that appear in all
 * Insomnia v5 resources. It's used throughout the export format to provide
 * consistent resource identification and tracking.
 *
 * @example
 * ```typescript
 * const meta: InsomniaV5Meta = {
 *   id: 'req_1234567890abcdef',
 *   created: 1642680000000,
 *   modified: 1642680000000,
 *   isPrivate: false,
 *   description: 'API endpoint for user management'
 * };
 * ```
 */
interface InsomniaV5Meta {
  /** Unique identifier for the resource (format: prefix_hexstring) */
  id: string;

  /** Unix timestamp (milliseconds) when the resource was created */
  created: number;

  /** Unix timestamp (milliseconds) when the resource was last modified */
  modified: number;

  /** Whether this resource is private (affects sharing/sync behaviour) */
  isPrivate: boolean;

  /** Optional human-readable description of the resource */
  description?: string;
}

/**
 * Legacy Insomnia workspace structure (used internally)
 *
 * This interface represents the internal workspace format used during
 * the conversion process. It's part of the intermediate format before
 * final v5 export generation.
 *
 * **Usage Context**: Environment conversion pipeline
 * **Conversion Flow**: `PostmanEnvironment` → `InsomniaWorkspace` → `InsomniaV5EnvironmentExport`
 *
 * @internal This is an internal type used during conversion
 */
export interface InsomniaWorkspace {
  /** Internal resource identifier with underscore prefix */
  _id: string;

  /** Resource type discriminator for internal processing */
  _type: 'workspace';

  /** Display name for the workspace */
  name: string;

  /** Human-readable description of the workspace */
  description: string;

  /** Parent resource ID (always null for top-level workspaces) */
  parentId: null;

  /** Workspace scope - 'environment' for environment workspaces */
  scope: 'environment';
}

/**
 * Legacy Insomnia environment structure (used internally)
 *
 * This interface represents the internal environment format used during
 * the conversion process. It stores environment variables and their
 * metadata for later conversion to v5 format.
 *
 * **Usage Context**: Environment conversion pipeline
 * **Conversion Flow**: `PostmanEnvironment` → `InsomniaEnvironment` → `InsomniaV5EnvironmentExport`
 *
 * @internal This is an internal type used during conversion
 */
export interface InsomniaEnvironment {
  /** Internal resource identifier with underscore prefix */
  _id: string;

  /** Resource type discriminator for internal processing */
  _type: 'environment';

  /** Display name for the environment */
  name: string;

  /** Environment variables as key-value pairs (string values only) */
  data: Record<string, string>;

  /** Property ordering for UI display (legacy field) */
  dataPropertyOrder: object;

  /** UI color for the environment (always null in v5) */
  color: null;

  /** Whether this environment is private */
  isPrivate: boolean;

  /** Parent workspace ID that contains this environment */
  parentId: string;

  /** Sort key for UI ordering (Unix timestamp) */
  metaSortKey: number;
}

/**
 * Environment data structure for Insomnia v5
 *
 * This interface defines the structure of environment data in the final
 * v5 export format. It supports multiple value types and is used in
 * both collection and environment exports.
 *
 * **Usage Context**: Final v5 export generation
 * **Location**: `InsomniaV5CollectionExport.environments` and `InsomniaV5EnvironmentExport.environments`
 *
 * @example
 * ```typescript
 * const environment: InsomniaV5Environment = {
 *   name: 'Production',
 *   meta: {
 *     id: 'env_prod123',
 *     created: Date.now(),
 *     modified: Date.now(),
 *     isPrivate: false
 *   },
 *   data: {
 *     apiUrl: 'https://api.prod.com',
 *     timeout: 5000,
 *     debug: false
 *   }
 * };
 * ```
 */
interface InsomniaV5Environment {
  /** Display name for the environment */
  name: string;

  /** Standard v5 metadata for the environment */
  meta: InsomniaV5Meta;

  /** Environment variables supporting string, number, and boolean values */
  data: Record<string, string | number | boolean>;
}

/**
 * Cookie jar structure for Insomnia v5
 *
 * This interface defines the cookie jar structure in v5 exports.
 * The cookie jar stores HTTP cookies that persist across requests
 * within the collection.
 *
 * **Usage Context**: Collection exports only
 * **Location**: `InsomniaV5CollectionExport.cookieJar`
 *
 * @example
 * ```typescript
 * const cookieJar: InsomniaV5CookieJar = {
 *   name: 'Cookie Jar',
 *   meta: {
 *     id: 'jar_123',
 *     created: Date.now(),
 *     modified: Date.now(),
 *     isPrivate: false
 *   },
 *   cookies: []
 * };
 * ```
 */
interface InsomniaV5CookieJar {
  /** Display name for the cookie jar */
  name: string;

  /** Standard v5 metadata for the cookie jar */
  meta: InsomniaV5Meta;

  /** Array of cookies (structure not strictly typed) */
  cookies: unknown[];
}

/**
 * Complete Insomnia v5 collection export format
 *
 * This interface defines the complete structure for exporting Postman
 * collections to Insomnia v5 format. It includes the collection items,
 * base environment, and cookie jar.
 *
 * **Usage Context**: Main export format for Postman collections
 * **Generated By**: `convertToInsomniaV5Format()` when processing collection resources
 * **File Type**: `.insomnia.yaml` collection files
 *
 * @example
 * ```typescript
 * const export: InsomniaV5CollectionExport = {
 *   type: 'collection.insomnia.rest/5.0',
 *   name: 'My API Collection',
 *   meta: { id: 'col_123', created: Date.now(), modified: Date.now(), isPrivate: false },
 *   collection: [
 *     // Array of requests and request groups
 *   ],
 *   environments: {
 *     name: 'Base Environment',
 *     meta: { id: 'env_123', created: Date.now(), modified: Date.now(), isPrivate: false },
 *     data: { baseUrl: 'https://api.example.com' }
 *   },
 *   cookieJar: {
 *     name: 'Cookie Jar',
 *     meta: { id: 'jar_123', created: Date.now(), modified: Date.now(), isPrivate: false },
 *     cookies: []
 *   }
 * };
 * ```
 */
export interface InsomniaV5CollectionExport {
  /** Fixed type identifier for collection exports */
  type: 'collection.insomnia.rest/5.0';

  /** Display name for the collection */
  name: string;

  /** Standard v5 metadata for the collection */
  meta: InsomniaV5Meta;

  /** Array of collection items (requests and request groups) */
  collection: InsomniaV5Collection;

  /** Base environment with default variables */
  environments: InsomniaV5Environment;

  /** Cookie jar for HTTP cookie persistence */
  cookieJar: InsomniaV5CookieJar;
}

/**
 * Insomnia v5 environment export format
 *
 * This interface defines the structure for exporting Postman environments
 * to Insomnia v5 format. It's a simpler format that only contains
 * environment variables without collection data.
 *
 * **Usage Context**: Environment-only exports
 * **Generated By**: `convertToInsomniaV5Format()` when processing environment resources
 * **File Type**: `.insomnia.yaml` environment files
 *
 * @example
 * ```typescript
 * const export: InsomniaV5EnvironmentExport = {
 *   type: 'environment.insomnia.rest/5.0',
 *   name: 'Development Environment',
 *   meta: { id: 'env_dev', created: Date.now(), modified: Date.now(), isPrivate: false },
 *   environments: {
 *     name: 'Development',
 *     meta: { id: 'env_dev_data', created: Date.now(), modified: Date.now(), isPrivate: false },
 *     data: {
 *       apiUrl: 'https://dev-api.example.com',
 *       apiKey: 'dev-key-123',
 *       timeout: 10000
 *     }
 *   }
 * };
 * ```
 */
export interface InsomniaV5EnvironmentExport {
  /** Fixed type identifier for environment exports */
  type: 'environment.insomnia.rest/5.0';

  /** Display name for the environment export */
  name: string;

  /** Standard v5 metadata for the environment export */
  meta: InsomniaV5Meta;

  /** Environment data with variables */
  environments: InsomniaV5Environment;
}

/**
 * Union type for all possible Insomnia v5 export formats
 *
 * This union type allows functions to return either collection or
 * environment exports while maintaining type safety. The `type` field
 * acts as a discriminator for TypeScript's type narrowing.
 *
 * **Usage Context**: Return type for main conversion functions
 * **Type Discrimination**: Use the `type` field to determine the specific export format
 *
 * @example
 * ```typescript
 * function handleExport(export: InsomniaV5Export) {
 *   if (export.type === 'collection.insomnia.rest/5.0') {
 *     // TypeScript knows this is InsomniaV5CollectionExport
 *     console.log(`Collection has ${export.collection.length} items`);
 *   } else {
 *     // TypeScript knows this is InsomniaV5EnvironmentExport
 *     console.log(`Environment has ${Object.keys(export.environments.data).length} variables`);
 *   }
 * }
 * ```
 */
export type InsomniaV5Export = InsomniaV5CollectionExport | InsomniaV5EnvironmentExport;

/**
 * HTTP header structure for Insomnia v5
 *
 * This interface defines the structure of HTTP headers in requests and
 * request groups. Headers are simple name-value pairs.
 *
 * **Usage Context**: Request headers and default headers in request groups
 * **Generated By**: `convertHeaders()` function in converter
 *
 * @example
 * ```typescript
 * const headers: InsomniaV5Header[] = [
 *   { name: 'Content-Type', value: 'application/json' },
 *   { name: 'Authorization', value: 'Bearer {{token}}' }
 * ];
 * ```
 */
export interface InsomniaV5Header {
  /** Header name (e.g., 'Content-Type', 'Authorization') */
  name: string;

  /** Header value (supports template variables like {{token}}) */
  value: string;
}

/**
 * Query parameter structure for Insomnia v5
 *
 * This interface defines the structure of URL query parameters in requests.
 * Parameters can be enabled/disabled and support template variables.
 *
 * **Usage Context**: Request query parameters
 * **Generated By**: `convertParameters()` function in converter
 * **URL Example**: `https://api.example.com/users?page=1&limit=10`
 *
 * @example
 * ```typescript
 * const parameters: InsomniaV5Parameter[] = [
 *   { name: 'page', value: '1', disabled: false },
 *   { name: 'limit', value: '{{pageSize}}', disabled: false },
 *   { name: 'debug', value: 'true', disabled: true }
 * ];
 * ```
 */
export interface InsomniaV5Parameter {
  /** Parameter name (e.g., 'page', 'limit') */
  name: string;

  /** Parameter value (supports template variables) */
  value: string;

  /** Whether this parameter is disabled (excluded from requests) */
  disabled: boolean;
}

/**
 * Path parameter structure for Insomnia v5
 *
 * This interface defines the structure of URL path parameters in requests.
 * Path parameters are placeholders in the URL path that get replaced with
 * actual values at runtime.
 *
 * **Usage Context**: Request path parameters
 * **Generated By**: `convertPathParameters()` function in converter
 * **URL Example**: `https://api.example.com/users/:id` where `:id` is a path parameter
 *
 * @example
 * ```typescript
 * const pathParameters: InsomniaV5PathParameter[] = [
 *   { name: 'id', value: '{{userId}}' },
 *   { name: 'version', value: 'v1' }
 * ];
 * ```
 */
export interface InsomniaV5PathParameter {
  /** Path parameter name (without colon prefix) */
  name: string;

  /** Path parameter value (supports template variables) */
  value: string;
}

/**
 * Request body structure for Insomnia v5
 *
 * This interface defines the structure of HTTP request bodies. It supports
 * various content types and can contain text-based data.
 *
 * **Usage Context**: Request bodies in HTTP requests
 * **Generated By**: `convertBody()` function in converter
 * **Content Types**: JSON, XML, plain text, GraphQL, etc.
 *
 * @example
 * ```typescript
 * const jsonBody: InsomniaV5Body = {
 *   mimeType: 'application/json',
 *   text: '{"name": "John", "email": "john@example.com"}'
 * };
 *
 * const xmlBody: InsomniaV5Body = {
 *   mimeType: 'application/xml',
 *   text: '<user><name>John</name></user>'
 * };
 *
 * const plainTextBody: InsomniaV5Body = {
 *   mimeType: null,
 *   text: 'Simple text content'
 * };
 * ```
 */
export interface InsomniaV5Body {
  /** MIME type of the body content (null for plain text) */
  mimeType: string | null;

  /** Body content as text (supports template variables) */
  text: string;
}

/**
 * Empty body type for requests without body content
 *
 * This type represents an empty object used when a request has no body
 * content. It's used as an alternative to InsomniaV5Body for GET requests
 * and other requests that don't require a body.
 *
 * **Usage Context**: GET requests, DELETE requests, or any request without body
 * **Generated By**: `convertBody()` function when body is empty or undefined
 *
 * @example
 * ```typescript
 * const emptyBody: EmptyBody = {};
 *
 * // Used in requests like:
 * const getRequest: InsomniaV5Request = {
 *   // ... other properties
 *   body: {} // EmptyBody
 * };
 * ```
 */
export type EmptyBody = Record<string, never>;

/**
 * Authentication configuration for Insomnia v5
 *
 * This interface defines the structure of authentication settings for
 * requests and request groups. It's flexible to support various auth
 * types while maintaining type safety.
 *
 * **Usage Context**: Request and request group authentication
 * **Generated By**: `convertAuthentication()` function in converter
 * **Supported Types**: Basic, Bearer, API Key, OAuth, etc.
 *
 * @example
 * ```typescript
 * const basicAuth: InsomniaV5Authentication = {
 *   type: 'basic',
 *   username: 'user',
 *   password: 'pass'
 * };
 *
 * const bearerAuth: InsomniaV5Authentication = {
 *   type: 'bearer',
 *   token: '{{accessToken}}'
 * };
 *
 * const apiKeyAuth: InsomniaV5Authentication = {
 *   type: 'apikey',
 *   key: 'X-API-Key',
 *   value: '{{apiKey}}'
 * };
 *
 * const noAuth: InsomniaV5Authentication = {};
 * ```
 */
export interface InsomniaV5Authentication {
  /** Authentication type (basic, bearer, apikey, etc.) */
  type?: string;

  /** Additional authentication properties (flexible structure) */
  [key: string]: unknown;
}

/**
 * Script configuration for Insomnia v5
 *
 * This interface defines the structure of pre-request and post-response
 * scripts that can be attached to requests and request groups. Scripts
 * are JavaScript code that runs before/after HTTP requests.
 *
 * **Usage Context**: Request and request group scripts
 * **Generated By**: Script processing in postman-converter
 * **Transform Pipeline**: Postman `pm.*` API → Insomnia `insomnia.*` API
 *
 * @example
 * ```typescript
 * const scripts: InsomniaV5Scripts = {
 *   preRequest: `
 *     insomnia.environment.set('timestamp', Date.now());
 *     console.log('Request starting...');
 *   `,
 *   afterResponse: `
 *     const responseTime = Date.now() - insomnia.environment.get('timestamp');
 *     console.log('Response time:', responseTime + 'ms');
 *   `
 * };
 * ```
 */
export interface InsomniaV5Scripts {
  /** JavaScript code to run before sending the request */
  preRequest: string;

  /** JavaScript code to run after receiving the response */
  afterResponse: string;
}

/**
 * Request settings for Insomnia v5
 *
 * This interface defines the various settings that control request
 * behavior in Insomnia. These settings affect how requests are processed
 * and how responses are handled.
 *
 * **Usage Context**: Individual request configuration
 * **Generated By**: Default settings applied to all converted requests
 * **Behaviour**: Controls URL encoding, redirects, cookies, etc.
 *
 * @example
 * ```typescript
 * const settings: InsomniaV5Settings = {
 *   renderRequestBody: true,    // Process template variables in body
 *   encodeUrl: true,           // URL encode query parameters
 *   rebuildPath: true,         // Rebuild URL path from components
 *   followRedirects: 'global', // Follow redirects based on global setting
 *   cookies: {
 *     send: true,              // Send cookies with requests
 *     store: true              // Store cookies from responses
 *   }
 * };
 * ```
 */
export interface InsomniaV5Settings {
  /** Whether to process template variables in request body */
  renderRequestBody: boolean;

  /** Whether to URL encode query parameters */
  encodeUrl: boolean;

  /** Whether to rebuild URL path from components */
  rebuildPath: boolean;

  /** Redirect following behavior */
  followRedirects: 'global' | 'on' | 'off';

  /** Cookie handling configuration */
  cookies: {
    /** Whether to send cookies with requests */
    send: boolean;

    /** Whether to store cookies from responses */
    store: boolean;
  };
}

/**
 * Metadata structure for collection items
 *
 * This interface defines the metadata structure specifically for collection
 * items (requests and request groups). It extends the base metadata with
 * additional fields needed for collection organization.
 *
 * **Usage Context**: Individual collection items (requests and groups)
 * **Generated By**: Collection conversion functions
 * **Sorting**: sortKey determines display order in Insomnia UI
 *
 * @example
 * ```typescript
 * const itemMeta: InsomniaV5ItemMeta = {
 *   id: 'req_1234567890abcdef',
 *   created: Date.now(),
 *   modified: Date.now(),
 *   isPrivate: false,
 *   description: 'Get user profile data',
 *   sortKey: -1642680000000  // Negative timestamp for sorting
 * };
 * ```
 */
export interface InsomniaV5ItemMeta {
  /** Unique identifier for the item */
  id: string;

  /** Unix timestamp when the item was created */
  created: number;

  /** Unix timestamp when the item was last modified */
  modified: number;

  /** Whether this item is private */
  isPrivate: boolean;

  /** Human-readable description of the item */
  description: string;

  /** Sort key for UI ordering (typically negative timestamp) */
  sortKey: number;
}

/**
 * HTTP request structure for Insomnia v5
 *
 * This interface defines the complete structure of an HTTP request in
 * Insomnia v5 format. It includes all request details like URL, method,
 * headers, body, and configuration.
 *
 * **Usage Context**: Individual HTTP requests in collections
 * **Generated By**: `convertResourcesToInsomniaV5Collection()` for request resources
 * **Hierarchy**: Can be nested within request groups
 *
 * @example
 * ```typescript
 * const request: InsomniaV5Request = {
 *   name: 'Create User',
 *   description: 'Creates a new user account',
 *   url: '{{baseUrl}}/users',
 *   method: 'POST',
 *   body: {
 *     mimeType: 'application/json',
 *     text: '{"name": "{{userName}}", "email": "{{userEmail}}"}'
 *   },
 *   headers: [
 *     { name: 'Content-Type', value: 'application/json' }
 *   ],
 *   parameters: [],
 *   pathParameters: [],
 *   authentication: { type: 'bearer', token: '{{authToken}}' },
 *   scripts: { preRequest: '', afterResponse: '' },
 *   settings: { renderRequestBody: true, encodeUrl: true, rebuildPath: true, followRedirects: 'global', cookies: { send: true, store: true } },
 *   meta: { id: 'req_123', created: Date.now(), modified: Date.now(), isPrivate: false, description: 'User creation', sortKey: -1000 },
 *   children: undefined
 * };
 * ```
 */
export interface InsomniaV5Request {
  /** Display name for the request */
  name: string;

  /** Optional description of the request */
  description?: string;

  /** Request URL (supports template variables) */
  url: string;

  /** HTTP method (GET, POST, PUT, DELETE, etc.) */
  method: string;

  /** Request body (can be empty for GET requests) */
  body: InsomniaV5Body | EmptyBody;

  /** HTTP headers array */
  headers: InsomniaV5Header[];

  /** URL query parameters */
  parameters: InsomniaV5Parameter[];

  /** URL path parameters */
  pathParameters: InsomniaV5PathParameter[];

  /** Authentication configuration */
  authentication: InsomniaV5Authentication;

  /** Pre/post request scripts */
  scripts: InsomniaV5Scripts;

  /** Request behavior settings */
  settings: InsomniaV5Settings;

  /** Item metadata */
  meta: InsomniaV5ItemMeta;

  /** Always undefined for requests (no child items) */
  children: undefined;
}

/**
 * Request group (folder) structure for Insomnia v5
 *
 * This interface defines the structure of request groups (folders) in
 * Insomnia v5 format. Request groups can contain other requests and
 * nested request groups, creating a hierarchical organization.
 *
 * **Usage Context**: Folders/groups in collections
 * **Generated By**: `convertResourcesToInsomniaV5Collection()` for request_group resources
 * **Hierarchy**: Can contain child requests and other request groups
 *
 * @example
 * ```typescript
 * const requestGroup: InsomniaV5RequestGroup = {
 *   name: 'User Management',
 *   description: 'All user-related API endpoints',
 *   environment: { userId: '123' },
 *   environmentPropertyOrder: { userId: 0 },
 *   scripts: { preRequest: '', afterResponse: '' },
 *   authentication: { type: 'bearer', token: '{{authToken}}' },
 *   headers: [
 *     { name: 'Accept', value: 'application/json' }
 *   ],
 *   meta: { id: 'grp_123', created: Date.now(), modified: Date.now(), isPrivate: false, description: 'User APIs', sortKey: -2000 },
 *   children: [
 *     // Array of child requests and groups
 *   ],
 *   method: undefined,
 *   url: undefined,
 *   parameters: undefined,
 *   pathParameters: undefined
 * };
 * ```
 */
export interface InsomniaV5RequestGroup {
  /** Display name for the request group */
  name: string;

  /** Optional description of the request group */
  description?: string;

  /** Environment variables scoped to this group */
  environment: Record<string, unknown>;

  /** Property ordering for environment variables */
  environmentPropertyOrder: Record<string, unknown>;

  /** Pre/post request scripts inherited by children */
  scripts: InsomniaV5Scripts;

  /** Authentication configuration inherited by children */
  authentication: InsomniaV5Authentication;

  /** Default headers inherited by children */
  headers: InsomniaV5Header[];

  /** Group metadata */
  meta: InsomniaV5ItemMeta;

  /** Child requests and groups */
  children: InsomniaV5CollectionItem[];

  /** Always undefined for groups (not applicable) */
  method: undefined;

  /** Always undefined for groups (not applicable) */
  url: undefined;

  /** Always undefined for groups (not applicable) */
  parameters: undefined;

  /** Always undefined for groups (not applicable) */
  pathParameters: undefined;
}

/**
 * Union type for collection items
 *
 * This union type represents any item that can appear in a collection.
 * It enables type-safe handling of both requests and request groups
 * within the collection hierarchy.
 *
 * **Usage Context**: Elements within collection arrays
 * **Type Discrimination**: Use presence of `children` property to distinguish types
 *
 * @example
 * ```typescript
 * function processCollectionItem(item: InsomniaV5CollectionItem) {
 *   if (item.children === undefined) {
 *     // This is a request
 *     console.log(`Request: ${item.method} ${item.url}`);
 *   } else {
 *     // This is a request group
 *     console.log(`Group: ${item.name} (${item.children.length} children)`);
 *   }
 * }
 * ```
 */
export type InsomniaV5CollectionItem = InsomniaV5Request | InsomniaV5RequestGroup;

/**
 * Collection structure for Insomnia v5
 *
 * This type defines the structure of the collection array in Insomnia v5
 * exports. It's simply an array of collection items that can be requests
 * or request groups.
 *
 * **Usage Context**: Main collection content in `InsomniaV5CollectionExport`
 * **Generated By**: `convertResourcesToInsomniaV5Collection()` function
 * **Hierarchy**: Top-level array containing the collection tree structure
 *
 * @example
 * ```typescript
 * const collection: InsomniaV5Collection = [
 *   {
 *     name: 'Authentication',
 *     children: [
 *       { name: 'Login', method: 'POST', url: '/auth/login', ... },
 *       { name: 'Logout', method: 'POST', url: '/auth/logout', ... }
 *     ],
 *     ...
 *   },
 *   {
 *     name: 'Get Health Check',
 *     method: 'GET',
 *     url: '/health',
 *     children: undefined,
 *     ...
 *   }
 * ];
 * ```
 */
export type InsomniaV5Collection = InsomniaV5CollectionItem[];
