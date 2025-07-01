// =============================================================================
// POSTMAN ENVIRONMENT CONVERTER
// =============================================================================
// Handles conversion of Postman Environment exports to Insomnia format.
// This includes both regular environments and global variable files.
//
// POSTMAN ENVIRONMENT STRUCTURE:
// {
//   "name": "Development Environment",
//   "_postman_variable_scope": "environment",  // or "globals"
//   "values": [
//     { "key": "baseUrl", "value": "https://api.dev.com", "enabled": true },
//     { "key": "apiKey", "value": "secret123", "enabled": false }
//   ]
// }
//
// KEY FEATURES:
// - Supports both 'environment' and 'globals' scope types
// - Filters out disabled variables (enabled: false)
// - Creates simple key-value data structure for Insomnia
// - Validates scope before processing
// =============================================================================

import type { Converter } from './entities';

// Converter metadata for identification
export const id = 'postman-environment';
export const name = 'Postman Environment';
export const description = 'Importer for Postman environments';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Individual environment variable from Postman export
 *
 * STRUCTURE: Each variable in the "values" array
 * FILTERING: Only variables with enabled: true are imported
 */
interface EnvVar {
  /** Whether this variable is active/enabled */
  enabled: boolean;

  /** Variable name/key */
  key: string;

  /** Variable value (often contains secrets) */
  value: string;
}

/**
 * Complete Postman environment export structure
 *
 * DETECTION: Used to identify environment files vs collection files
 * SCOPE TYPES: 'environment' for regular envs, 'globals' for global variables
 */
interface Environment {
  /** Environment display name */
  name: string;

  /** Array of environment variables */
  values: EnvVar[];

  /** Identifies this as an environment file and its scope */
  _postman_variable_scope: 'environment' | string;
}

// =============================================================================
// POSTMAN ENVIRONMENT TYPES
// =============================================================================

/**
 * Supported Postman environment scope types
 *
 * ENVIRONMENT: Regular environment (e.g., Dev, Staging, Prod)
 * GLOBAL: Global variables that apply across all environments
 *
 * NOTE: Both types are processed identically, scope is just metadata
 */
export enum POSTMAN_ENV_TYPE {
  GLOBAL = 'globals',
  ENVIRONMENT = 'environment',
}

// Create validation array from enum values
const validPostmanEnvTypeList = Object.values(POSTMAN_ENV_TYPE) as string[];

// =============================================================================
// MAIN CONVERSION FUNCTION
// =============================================================================

/**
 * Converts Postman environment JSON to Insomnia format
 *
 * PROCESS:
 * 1. Parse JSON and validate structure
 * 2. Check if scope type is supported
 * 3. Generate unique ID for the environment
 * 4. Filter enabled variables only
 * 5. Create Insomnia environment object
 * 6. Return array with single environment item
 *
 * OUTPUT FORMAT: Array with one environment object containing:
 * - Standard Insomnia metadata (_id, _type, name)
 * - Filtered data object with only enabled variables
 * - Meta object preserving original Postman scope
 *
 * ERROR HANDLING: Returns null for:
 * - Invalid JSON
 * - Unrecognized scope types
 * - Missing required fields
 *
 * ID GENERATION: Uses same pattern as collections (env_ + random string)
 * to ensure uniqueness when processing multiple environment files
 *
 * @param rawData Raw JSON string from Postman environment export
 * @returns Array with environment object or null if invalid
 */
export const convert: Converter = (rawData: string) => {
  try {
    // Parse and destructure the Postman environment JSON
    const { _postman_variable_scope, name, values } = JSON.parse(rawData) as Environment;

    // VALIDATION: Check if this is a recognized environment scope
    if (!validPostmanEnvTypeList.includes(_postman_variable_scope)) {
      return null; // Not a valid Postman environment file
    }

    // GENERATE UNIQUE ID: Consistent with collection converter pattern
    // Format: 'env_' + random alphanumeric string (9 characters)
    const environmentId = 'env_' + Math.random().toString(36).substr(2, 9);

    // SUCCESS: Create Insomnia environment object
    return [
      {
        // Standard Insomnia environment structure
        _id: environmentId,         // Unique ID for this environment
        _type: 'environment',       // Insomnia resource type
        name: name || 'Postman Environment', // Fallback name if missing

        // CORE DATA: Convert variables array to key-value object
        // FILTERING: Only include enabled variables
        data: values.reduce((accumulator, { enabled, key, value }) => {
          if (!enabled) {
            return accumulator; // Skip disabled variables
          }
          return {
            ...accumulator,
            [key]: value,
          };
        }, {}),

        // METADATA: Preserve original Postman scope information
        meta: {
          postmanEnvScope: _postman_variable_scope,
        },
      },
    ];
  } catch (error) {
    // ERROR HANDLING: Invalid JSON or parsing failure
    // Silently return null - error handling is done at higher level
    return null;
  }
};

// =============================================================================
// NOTES FOR MAINTAINERS
// =============================================================================

/*
UNDERSTANDING THIS CONVERTER:

1. **SIMPLE BUT CRITICAL**: This converter is much simpler than the collection
   converter, but it's essential for environment variable support.

2. **FILTERING LOGIC**: The key feature is filtering out disabled variables.
   Postman allows disabled variables, but Insomnia imports all data.

3. **SCOPE PRESERVATION**: The original Postman scope is preserved in meta
   for debugging and potential future features.

4. **ID GENERATION**: Uses same pattern as collection converter for consistency
   and to avoid conflicts when processing multiple environment files.

COMMON MAINTENANCE SCENARIOS:

1. **New Scope Types**: If Postman adds new scope types:
   - Add to POSTMAN_ENV_TYPE enum
   - Test with real exports from new Postman versions

2. **Variable Structure Changes**: If Postman changes variable format:
   - Update EnvVar interface
   - Test enabled/disabled detection logic
   - Verify key/value extraction

3. **ID Generation Issues**: If ID conflicts occur:
   - Consider using more entropy (longer random string)
   - Could add timestamp component for uniqueness
   - Verify Math.random() is sufficient for your use case

4. **Metadata Extensions**: To preserve more Postman metadata:
   - Extend the meta object in the return value
   - Consider what additional context might be useful

TESTING RECOMMENDATIONS:

- Test with both 'environment' and 'globals' scope types
- Test with disabled variables (should be filtered out)
- Test with missing names (should use fallback)
- Test with malformed JSON (should return null)
- Test with empty values arrays
- Test with special characters in variable names/values
- Test multiple environment processing for ID uniqueness

INTEGRATION NOTES:

- Called by converter.ts when environment file is detected
- Detection happens in converter.ts using isPostmanEnvironment()
- Output gets processed by convertToInsomniaV5Format() for final format
- Works alongside collection converter in batch processing scenarios
- ID generation pattern matches collection converter for consistency

BUG FIX HISTORY:
- Fixed hardcoded '__ENV_1__' ID to use dynamic generation like collections
- Ensures uniqueness when processing multiple environment files in batch mode

This converter handles a specific but important use case - keep it simple
but robust for the variety of environment exports users might have.
*/
