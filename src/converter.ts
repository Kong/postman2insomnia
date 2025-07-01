// =============================================================================
// POSTMAN TO INSOMNIA CONVERTER - UUID FORMAT FIX
// =============================================================================
// Updated to generate proper UUID-style IDs that match Insomnia v5 format
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import chalk from 'chalk';

// =============================================================================
// EXTRACTED CONSTANTS (REPLACING UI DEPENDENCIES)
// =============================================================================
export const CONTENT_TYPE_JSON = 'application/json';
export const CONTENT_TYPE_PLAINTEXT = 'text/plain';
export const CONTENT_TYPE_XML = 'application/xml';

// =============================================================================
// IMPROVED UUID-STYLE ID GENERATION UTILITIES
// =============================================================================

/**
 * Generates UUID-style IDs that match Insomnia v5 format
 *
 * FORMAT: prefix_32hexcharacters
 * EXAMPLES:
 * - wrk_a84180a6bd3f478ea499794fc2e6f479
 * - env_ba857013df9840738db04cbb4359df4b
 * - jar_57c227dcaae3cd7960af1bb5455c8b23
 */
function generateInsomniaUUID(prefix: string): string {
  // Generate 32 hex characters
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random1 = Math.random().toString(16).substring(2, 10);
  const random2 = Math.random().toString(16).substring(2, 10);
  const random3 = Math.random().toString(16).substring(2, 6);

  // Combine and ensure exactly 32 characters
  const hex32 = (timestamp + random1 + random2 + random3).substring(0, 32);
  return `${prefix}_${hex32.padEnd(32, '0')}`;
}

/**
 * Alternative using crypto.randomUUID if available
 */
function generateSecureInsomniaUUID(prefix: string): string {
  // Check if crypto.randomUUID is available (Node.js 14.17+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    const uuid = crypto.randomUUID().replace(/-/g, '');
    return `${prefix}_${uuid}`;
  }

  // Fallback to our hex generation
  return generateInsomniaUUID(prefix);
}

// =============================================================================
// FAKER FUNCTIONS (REPLACING UI DEPENDENCY)
// =============================================================================
export const fakerFunctions = {
  guid: () => '{% faker "guid" %}',
  timestamp: () => '{% faker "timestamp" %}',
  randomInt: () => '{% faker "randomInt" %}',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
export function forceBracketNotation(prefix: string, path: string): string {
  if (path.includes('-')) {
    return `${prefix}['${path}']`;
  }
  return `${prefix}.${path}`;
}

// Import the core Postman collection converter
import { convert as postmanConvert } from './postman-converter';

// =============================================================================
// FILE TYPE DETECTION FUNCTIONS
// =============================================================================

function isPostmanEnvironment(parsed: any): boolean {
  return (
    parsed._postman_variable_scope === 'environment' ||
    parsed._postman_variable_scope === 'globals'
  ) && Array.isArray(parsed.values);
}

function isPostmanCollection(parsed: any): boolean {
  return parsed.info && parsed.info.schema && Array.isArray(parsed.item);
}

// =============================================================================
// POSTMAN ENVIRONMENT CONVERTER
// =============================================================================

function convertPostmanEnvironment(envData: any): any[] {
  const validPostmanEnvTypes = ['globals', 'environment'];
  if (!validPostmanEnvTypes.includes(envData._postman_variable_scope)) {
    return [];
  }

  // Generate proper UUID-style IDs
  const workspaceId = generateSecureInsomniaUUID('wrk');
  const envId = generateSecureInsomniaUUID('env');

  const data = envData.values.reduce((accumulator: any, { enabled, key, value }: any) => {
    if (!enabled) {
      return accumulator;
    }
    return {
      ...accumulator,
      [key]: value,
    };
  }, {});

  return [
    {
      _id: workspaceId,
      _type: 'workspace',
      name: envData.name || 'Imported Environment',
      description: `Imported from Postman ${envData._postman_variable_scope}`,
      parentId: null,
      scope: 'environment'
    },
    {
      _id: envId,
      _type: 'environment',
      name: envData.name || 'Base Environment',
      data: data,
      dataPropertyOrder: {},
      color: null,
      isPrivate: false,
      parentId: workspaceId,
      metaSortKey: Date.now()
    }
  ];
}

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface ConversionOptions {
  outputDir: string;
  format: 'yaml' | 'json';
  merge: boolean;
  verbose: boolean;
}

export interface ConversionResult {
  successful: number;
  failed: number;
  outputs: string[];
}

// =============================================================================
// MAIN CONVERSION ORCHESTRATOR
// =============================================================================

export async function convertPostmanToInsomnia(
  files: string[],
  options: ConversionOptions
): Promise<ConversionResult> {

  const result: ConversionResult = {
    successful: 0,
    failed: 0,
    outputs: []
  };

  const allCollections: any[] = [];

  for (const file of files) {
    try {
      if (options.verbose) {
        console.log(chalk.gray(`Processing: ${path.basename(file)}`));
      }

      const rawData = fs.readFileSync(file, 'utf8');
      const parsed = JSON.parse(rawData);

      let converted: any[] | null = null;

      if (isPostmanEnvironment(parsed)) {
        if (options.verbose) {
          console.log(chalk.gray(`  Detected Postman environment file`));
        }
        converted = convertPostmanEnvironment(parsed);

      } else if (isPostmanCollection(parsed)) {
        if (options.verbose) {
          console.log(chalk.gray(`  Detected Postman collection file`));
        }

        const collectionResult = postmanConvert(rawData);

        if (Array.isArray(collectionResult)) {
          converted = collectionResult;
        } else {
          converted = null;
        }

      } else {
        console.error(chalk.red(`❌ Unknown file format: ${path.basename(file)}`));
        result.failed++;
        continue;
      }

      if (!converted || !Array.isArray(converted)) {
        console.error(chalk.red(`❌ Failed to convert: ${path.basename(file)}`));
        result.failed++;
        continue;
      }

      if (options.merge) {
        allCollections.push(...converted);
      } else {
        const insomniaData = convertToInsomniaV5Format(converted, path.basename(file, '.json'));
        const outputPath = await writeOutput(insomniaData, file, options);
        result.outputs.push(outputPath);

        if (options.verbose) {
          console.log(chalk.green(`✅ Converted: ${path.basename(outputPath)}`));
        }
      }

      result.successful++;

    } catch (error) {
      console.error(chalk.red(`❌ Error processing ${path.basename(file)}:`),
        error instanceof Error ? error.message : error);
      result.failed++;
    }
  }

  if (options.merge && allCollections.length > 0) {
    const mergedData = convertToInsomniaV5Format(allCollections, 'Merged Collection');
    const outputPath = await writeMergedOutput(mergedData, options);
    result.outputs.push(outputPath);
  }

  return result;
}

// =============================================================================
// INSOMNIA V5 FORMAT CONVERSION
// =============================================================================

function convertToInsomniaV5Format(resources: any[], collectionName: string) {

  // Check if this is an environment-only workspace
  const workspace = resources.find(r => r._type === 'workspace');

  if (workspace && workspace.scope === 'environment') {
    const environment = resources.find(r => r._type === 'environment');

    return {
      type: 'environment.insomnia.rest/5.0' as const,
      name: workspace.name || collectionName,
      meta: {
        id: workspace._id,
        created: Date.now(),
        modified: Date.now(),
        isPrivate: false,
        description: workspace.description || ''
      },
      environments: {
        name: environment?.name || 'Base Environment',
        meta: {
          id: environment?._id || generateSecureInsomniaUUID('env'),
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false
        },
        data: environment?.data || {}
      }
    };
  }

  // Handle collection workspaces
  const collectionWorkspace = resources.find(r => r._type === 'request_group' && r.parentId === '__WORKSPACE_ID__');

  const insomniaData = {
    type: 'collection.insomnia.rest/5.0' as const,
    name: collectionWorkspace?.name || collectionName,
    meta: {
      id: collectionWorkspace?._id || generateSecureInsomniaUUID('wrk'),
      created: Date.now(),
      modified: Date.now(),
      isPrivate: false,
      description: collectionWorkspace?.description || ''
    },
    collection: convertResourcesToInsomniaV5Collection(resources, collectionWorkspace?._id || '__WORKSPACE_ID__'),

    environments: {
      name: 'Base Environment',
      meta: {
        id: generateSecureInsomniaUUID('env'),
        created: Date.now(),
        modified: Date.now(),
        isPrivate: false
      },
      data: collectionWorkspace?.variable || {}
    },

    cookieJar: {
      name: 'Cookie Jar',
      meta: {
        id: generateSecureInsomniaUUID('jar'),
        created: Date.now(),
        modified: Date.now(),
        isPrivate: false
      },
      cookies: []
    }
  };

  return insomniaData;
}

// =============================================================================
// INSOMNIA V5 COLLECTION STRUCTURE CONVERSION
// =============================================================================

function convertResourcesToInsomniaV5Collection(resources: any[], parentId: string): any[] {
  const collection: any[] = [];

  const childResources = resources.filter(r => r.parentId === parentId);

  for (const resource of childResources) {
    if (resource._type === 'request') {
      collection.push({
        name: resource.name || '',
        url: resource.url || '',
        method: resource.method || 'GET',

        body: resource.body || {
          mimeType: null,
          text: ''
        },

        headers: (resource.headers || []).map((h: any) => ({
          name: h.name || '',
          value: h.value || ''
        })),

        parameters: (resource.parameters || []).map((p: any) => ({
          name: p.name || '',
          value: p.value || '',
          disabled: p.disabled || false
        })),

        pathParameters: (resource.pathParameters || []).map((p: any) => ({
          name: p.name || '',
          value: p.value || ''
        })),

        authentication: resource.authentication || {},

        scripts: {
          preRequest: resource.preRequestScript || '',
          afterResponse: resource.afterResponseScript || ''
        },

        settings: {
          renderRequestBody: true,
          encodeUrl: true,
          rebuildPath: true,
          followRedirects: 'global' as const,
          cookies: {
            send: true,
            store: true
          }
        },

        meta: {
          id: resource._id,
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: resource.description || '',
          sortKey: Date.now()
        },

        // CRITICAL: Add undefined properties to satisfy discriminated union
        children: undefined
      });

    } else if (resource._type === 'request_group') {
      collection.push({
        name: resource.name || '',
        description: resource.description || '',
        environment: resource.environment || {},
        environmentPropertyOrder: resource.environmentPropertyOrder || {},

        scripts: {
          preRequest: resource.preRequestScript || '',
          afterResponse: resource.afterResponseScript || ''
        },

        authentication: resource.authentication || {},

        headers: (resource.headers || []).map((h: any) => ({
          name: h.name || '',
          value: h.value || ''
        })),

        meta: {
          id: resource._id,
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: resource.description || '',
          sortKey: Date.now()
        },

        // RECURSIVE: Process children of this group
        children: convertResourcesToInsomniaV5Collection(resources, resource._id),

        // CRITICAL: Add undefined properties to satisfy discriminated union
        method: undefined,
        url: undefined,
        parameters: undefined,
        pathParameters: undefined
      });
    }
  }

  return collection;
}

// =============================================================================
// FILE OUTPUT FUNCTIONS
// =============================================================================

async function writeOutput(data: any, inputFile: string, options: ConversionOptions): Promise<string> {
  const baseName = path.basename(inputFile, '.json');
  const extension = options.format === 'yaml' ? 'yaml' : 'json';
  const outputFile = path.join(options.outputDir, `${baseName}.insomnia.${extension}`);

  let content: string;
  if (options.format === 'yaml') {
    content = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });
  } else {
    content = JSON.stringify(data, null, 2);
  }

  fs.writeFileSync(outputFile, content, 'utf8');
  return outputFile;
}

async function writeMergedOutput(data: any, options: ConversionOptions): Promise<string> {
  const extension = options.format === 'yaml' ? 'yaml' : 'json';
  const outputFile = path.join(options.outputDir, `merged-collection.insomnia.${extension}`);

  let content: string;
  if (options.format === 'yaml') {
    content = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });
  } else {
    content = JSON.stringify(data, null, 2);
  }

  fs.writeFileSync(outputFile, content, 'utf8');
  return outputFile;
}

// =============================================================================
// NOTES FOR MAINTAINERS
// =============================================================================

/*
UUID FORMAT FIX IMPLEMENTED:

**PROBLEM SOLVED**: IDs were not matching Insomnia v5 UUID format expectations

**NEW UUID FORMAT**:
- OLD: wrk_a84180a_abc123_456 (random format)
- NEW: wrk_a84180a6bd3f478ea499794fc2e6f479 (32-hex format)

**MATCHES INSOMNIA v5 EXPECTATIONS**:
✅ wrk_32hexcharacters for workspaces
✅ env_32hexcharacters for environments
✅ jar_32hexcharacters for cookie jars
✅ Collision-resistant through timestamp + random components
✅ Proper hex encoding matches Insomnia's native UUID format

**MAINTAINS UNIQUENESS**:
- Timestamp component ensures different conversion runs get different IDs
- Multiple random components provide collision resistance
- 32-character hex format exactly matches Insomnia's expectations
- crypto.randomUUID() support when available for maximum security

This ensures perfect compatibility with Insomnia v5 import expectations
while maintaining all collision-resistance benefits.
*/
