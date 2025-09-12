// =============================================================================
// POSTMAN TO INSOMNIA CONVERTER
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import { TransformEngine } from './transform-engine';
import { PostmanEnvironment } from './types/postman-environment.types';
import type {
  HttpsSchemaGetpostmanComJsonCollectionV200 as PostmanCollectionV2,
} from './types/postman-2.0.types';

import type {
  HttpsSchemaGetpostmanComJsonCollectionV210 as PostmanCollectionV21,
} from './types/postman-2.1.types';
import { ImportRequest } from './types/entities';
import {
  InsomniaWorkspace,
  InsomniaEnvironment,
  InsomniaV5Export,
  InsomniaV5CollectionExport,
  InsomniaV5CollectionItem,
  InsomniaV5Request,
  InsomniaV5RequestGroup,
  InsomniaV5Header,
  InsomniaV5Parameter,
  InsomniaV5PathParameter,
  InsomniaV5Body,
  InsomniaV5Authentication,
  EmptyBody
} from './types/insomnia-v5.types';

// Import existing constants and utilities
export const CONTENT_TYPE_JSON = 'application/json';
export const CONTENT_TYPE_PLAINTEXT = 'text/plain';
export const CONTENT_TYPE_XML = 'application/xml';

export const fakerFunctions = {
  guid: () => '{% faker "guid" %}',
  timestamp: () => '{% faker "timestamp" %}',
  randomInt: () => '{% faker "randomInt" %}',
};

export function forceBracketNotation(prefix: string, path: string): string {
  if (path.includes('-')) {
    return `${prefix}['${path}']`;
  }
  return `${prefix}.${path}`;
}

// Import existing converter but we'll override the script processing
import { convert as postmanConvert } from './postman-converter';

/**
 * Variable type definition
 */
interface Variable {
  name: string;
  value: string | number | boolean;
  enabled?: boolean;
  description?: string;
}

// =============================================================================
// HANDLING WRAPPED POSTMAN COLLECTIONS AND ENVIRONMENTS FROM POSTMAN API
// =============================================================================
function unwrapPostmanJson(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const asObj = obj as Record<string, unknown>;

  // Direct wrappers for known keys
  if ('collection' in asObj && isPostmanCollection(asObj['collection'])) {
    return asObj['collection'];
  }

  if ('environment' in asObj && isPostmanEnvironment(asObj['environment'])) {
    return asObj['environment'];
  }

  // Fallback: recursive search
  for (const key of Object.keys(asObj)) {
    const unwrapped = unwrapPostmanJson(asObj[key]);
    if (isPostmanCollection(unwrapped) || isPostmanEnvironment(unwrapped)) {
      return unwrapped;
    }
  }

  return obj;
}

// =============================================================================
// ENHANCED CONVERSION OPTIONS
// =============================================================================

export interface ConversionOptions {
  outputDir: string;
  format: 'yaml' | 'json';
  verbose: boolean;
  preprocess?: boolean;
  postprocess?: boolean;
  configFile?: string;
  transformEngine?: TransformEngine;
  useCollectionFolder?: boolean;
  experimental?: boolean;
  includeResponseExamples?: boolean;
}

export interface ConversionResult {
  successful: number;
  failed: number;
  outputs: string[];
}

/**
 * Transforms variable names by replacing dots with underscores for Insomnia compatibility
 *
 * @param variableName The original variable name from Postman
 * @returns The transformed variable name with dots replaced by underscores
 *
 * @example
 * transformVariableName("api.key") // returns "api_key"
 * transformVariableName("user.profile.name") // returns "user_profile_name"
 */
export function transformVariableName(variableName: string): string {
  return variableName.replace(/\./g, '_');
}

// =============================================================================
// ENHANCED FILE PROCESSING WITH TRANSFORMS
// =============================================================================

/**
 * Checks if a parsed JSON object is a Postman environment.
 *
 * This check is based on the core structural properties of a Postman environment
 * (`name` and `values` array) as defined by its JSON schema. This is more
 * reliable than checking for `_postman_variable_scope`, which may be absent
 * in environments exported via the Postman API. It also includes a check to
 * differentiate it from a Postman Collection.
 *
 * @param parsed The parsed JSON data.
 * @returns True if the object is a Postman environment, false otherwise.
 */
export function isPostmanEnvironment(parsed: unknown): parsed is PostmanEnvironment {
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    return false;
  }

  const env = parsed as Record<string, unknown>;

  if (
    typeof env.name !== 'string' ||
    !Array.isArray(env.values) ||
    (env.info && env.item) // Quick check: not a collection
  ) {
    return false;
  }

  if (env.values.length > 0) {
    const firstValue = env.values[0] as Record<string, unknown>;
    return (
      typeof firstValue === 'object' &&
      firstValue !== null &&
      typeof firstValue.key === 'string' &&
      typeof firstValue.value === 'string'
    );
  }

  return true; // empty values is still valid
}

/**
 * Checks if a parsed JSON object is a Postman collection.
 *
 * This verifies the presence of `info.schema` and `item[]`,
 * which distinguishes it from environments and invalid objects.
 *
 * @param parsed The parsed JSON data.
 * @returns True if the object is a Postman collection.
 */
function isPostmanCollection(parsed: unknown): parsed is PostmanCollectionV2 | PostmanCollectionV21 {
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    return false;
  }

  const col = parsed as Record<string, unknown>;

  if (
    !col.info ||
    typeof col.info !== 'object' ||
    !Array.isArray(col.item)
  ) {
    return false;
  }

  const info = col.info as Record<string, unknown>;

  return (
    typeof info.schema === 'string' &&
    info.schema.includes('postman.com/json/collection')
  );
}

function generateSecureInsomniaUUID(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    const uuid = crypto.randomUUID().replace(/-/g, '');
    return `${prefix}_${uuid}`;
  }

  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random1 = Math.random().toString(16).substring(2, 10);
  const random2 = Math.random().toString(16).substring(2, 10);
  const random3 = Math.random().toString(16).substring(2, 6);

  const hex32 = (timestamp + random1 + random2 + random3).substring(0, 32);
  return `${prefix}_${hex32.padEnd(32, '0')}`;
}

/**
 * Converts a validated Postman environment object to the Insomnia format.
 *
 * @param envData The Postman environment data.
 * @returns An array of Insomnia-compatible objects.
 */

export function convertPostmanEnvironment(
  envData: PostmanEnvironment | { environment: PostmanEnvironment }):
  [InsomniaWorkspace, InsomniaEnvironment] {

  const actualEnv: PostmanEnvironment =
  'environment' in envData ? envData.environment : envData;

  const workspaceId = generateSecureInsomniaUUID('wrk');
  const envId = generateSecureInsomniaUUID('env');

  const data = actualEnv.values.reduce<Record<string, string>>(
    (accumulator, { enabled, key, value }) => {
      if (enabled === false) return accumulator;
        const transformedKey = transformVariableName(key);
        return { ...accumulator, [transformedKey]: value };
    },
    {}
  );

  const scope = actualEnv._postman_variable_scope || 'environment';

  return [
    {
      _id: workspaceId,
      _type: 'workspace',
      name: actualEnv.name || 'Imported Environment',
      description: `Imported from Postman ${scope}`,
      parentId: null,
      scope: 'environment'
    },
    {
      _id: envId,
      _type: 'environment',
      name: actualEnv.name || 'Base Environment',
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
// MAIN CONVERSION ORCHESTRATOR WITH TRANSFORMS
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

  // Initialize transform engine if needed
  let transformEngine = options.transformEngine;
  if ((options.preprocess || options.postprocess) && !transformEngine) {
    if (options.configFile && fs.existsSync(options.configFile)) {
      transformEngine = TransformEngine.fromConfigFile(options.configFile);
    } else {
      transformEngine = new TransformEngine();
    }
  }

  for (const file of files) {
    try {
      if (options.verbose) {
        console.log(chalk.gray(`Processing: ${path.basename(file)}`));
      }

      let rawData = fs.readFileSync(file, 'utf8');

      // PREPROCESSING: Apply transforms to raw Postman JSON
      if (options.preprocess && transformEngine) {
        if (options.verbose) {
          console.log(chalk.gray(`  Applying preprocessing transforms...`));
        }
        rawData = transformEngine.preprocess(rawData, options.experimental || false);
      }

      const rawParsed = JSON.parse(rawData);
      const parsed = unwrapPostmanJson(rawParsed);

      if (options.verbose && parsed !== rawParsed) {
        console.log(chalk.gray('  Unwrapped content preview:'), JSON.stringify(parsed, null, 2));
        console.log(chalk.gray('  Detected wrapper and unwrapped it'));
      }

      let converted: ImportRequest[] | null = null;

      if (isPostmanEnvironment(parsed)) {
        if (options.verbose) {
          console.log(chalk.gray(`  Detected Postman environment file`));
        }
        converted = convertPostmanEnvironment(parsed);

      } else if (isPostmanCollection(parsed)) {
        if (options.verbose) {
          console.log(chalk.gray(`  Detected Postman collection file`));
        }

        // Use enhanced postman converter that supports transforms
        const collectionResult = convertPostmanCollectionWithTransforms(rawData, transformEngine, options);

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

      const insomniaData: InsomniaV5Export = convertToInsomniaV5Format(converted, path.basename(file, '.json'));
      const outputPath = await writeOutput(insomniaData, file, options);
      result.outputs.push(outputPath);

      if (options.verbose) {
        console.log(chalk.green(`✅ Converted: ${path.basename(outputPath)}`));
      }

      result.successful++;

    } catch (error) {
      console.error(chalk.red(`❌ Error processing ${path.basename(file)}:`),
        error instanceof Error ? error.message : error);
      result.failed++;
    }
  }

  return result;
}

// =============================================================================
// ENHANCED POSTMAN CONVERTER WITH TRANSFORM SUPPORT
// =============================================================================
function convertPostmanCollectionWithTransforms(
  rawData: string,
  transformEngine?: TransformEngine,
  options?: ConversionOptions
): ImportRequest[] | null {
  try {
    //const collection = JSON.parse(rawData);
    const parsed = JSON.parse(rawData);
    const unwrapped = unwrapPostmanJson(parsed);
    const unwrappedString = JSON.stringify(unwrapped);

    const result = postmanConvert(
      unwrappedString,
      transformEngine,
      options?.useCollectionFolder,
      options?.includeResponseExamples
    );

    // The result from postmanConvert might be ConvertResult, but we need any[] | null
    // So we need to check if it's an array and handle other cases
    if (Array.isArray(result)) {
      // POSTPROCESSING: Apply transforms to converted scripts
      if (options?.postprocess && transformEngine) {
        if (options.verbose) {
          console.log(chalk.gray(`  Applying postprocessing transforms to scripts...`));
        }

        result.forEach(item => {
          if (item.preRequestScript) {
            item.preRequestScript = transformEngine.postprocess(
              item.preRequestScript,
              options.experimental || false
            );
          }
          if (item.afterResponseScript) {
            item.afterResponseScript = transformEngine.postprocess(
              item.afterResponseScript,
              options.experimental || false
            );
          }
        });
      }
      return result;
    } else {
      // If result is not an array (e.g., null or ConvertErrorResult), return null
      return null;
    }
  } catch (error) {
    console.error('Error in enhanced Postman conversion:', error);
    return null;
  }
}

// =============================================================================
// EXISTING INSOMNIA V5 FORMAT CONVERSION
// =============================================================================
function convertToInsomniaV5Format(
  resources: ImportRequest[],
  collectionName: string
): InsomniaV5Export {

  // Check if this is an environment export
  const workspace = resources.find(r => r._type === 'workspace');
  if (workspace && workspace.scope === 'environment') {
    const environment = resources.find(r => r._type === 'environment');

    return {
      type: 'environment.insomnia.rest/5.0' as const,
      name: workspace.name || collectionName,
      meta: {
        id: workspace._id || generateSecureInsomniaUUID('wrk'),
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
        data: convertEnvironmentData(environment?.data)
      }
    };
  }

  // Handle collection export
  const collectionWorkspace = resources.find(
    r => r._type === 'request_group' && r.parentId === '__WORKSPACE_ID__'
  );

  const insomniaData: InsomniaV5CollectionExport = {
    type: 'collection.insomnia.rest/5.0' as const,
    name: collectionWorkspace?.name || collectionName,
    meta: {
      id: collectionWorkspace?._id || generateSecureInsomniaUUID('wrk'),
      created: Date.now(),
      modified: Date.now(),
      isPrivate: false,
      description: collectionWorkspace?.description || ''
    },
    collection: convertResourcesToInsomniaV5Collection(
      resources,
      collectionWorkspace?._id || '__WORKSPACE_ID__'
    ),
    environments: {
      name: 'Base Environment',
      meta: {
        id: generateSecureInsomniaUUID('env'),
        created: Date.now(),
        modified: Date.now(),
        isPrivate: false
      },
      data: convertVariableToData(collectionWorkspace?.variable) || {}
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

/**
 * Converts ImportRequest resources to Insomnia v5 collection format
 *
 * This function recursively processes the resource tree and converts each
 * request and folder to the proper Insomnia v5 collection item format.
 *
 * @param resources Array of ImportRequest resources to convert
 * @param parentId Parent ID to filter children for this level
 * @returns Array of properly formatted Insomnia v5 collection items
 */
function convertResourcesToInsomniaV5Collection(
  resources: ImportRequest[],
  parentId: string
): InsomniaV5CollectionItem[] {

  const collection: InsomniaV5CollectionItem[] = [];
  const childResources = resources.filter(r => r.parentId === parentId);
  const now = Date.now();
  let sortKeyCounter = -now;

  for (const resource of childResources) {
    if (resource._type === 'request') {
      // Create a properly typed request item
      const requestItem: InsomniaV5Request = {
        name: resource.name || '',
        description: resource.description || '',
        url: resource.url || '',
        method: resource.method || 'GET',
        body: convertBody(resource.body),
        headers: convertHeaders(resource.headers),
        parameters: convertParameters(resource.parameters),
        pathParameters: convertPathParameters(resource.parameters),
        authentication: convertAuthentication(resource.authentication),
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
          id: resource._id || 'unknown',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: resource.description || '',
          sortKey: sortKeyCounter++
        },
        children: undefined
      };

      collection.push(requestItem);

    } else if (resource._type === 'request_group') {
      // Create a properly typed request group item
      const groupItem: InsomniaV5RequestGroup = {
        name: resource.name || '',
        description: resource.description || '',
        environment: convertEnvironmentToObject(resource.environment),
        environmentPropertyOrder: convertEnvironmentToObject(resource.environmentPropertyOrder),
        scripts: {
          preRequest: resource.preRequestScript || '',
          afterResponse: resource.afterResponseScript || ''
        },
        authentication: convertAuthentication(resource.authentication),
        headers: convertHeaders(resource.headers),
        meta: {
          id: resource._id || 'unknown',
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false,
          description: resource.description || '',
          sortKey: sortKeyCounter++
        },
        // Recursively convert children
        children: convertResourcesToInsomniaV5Collection(resources, resource._id || ''),
        method: undefined,
        url: undefined,
        parameters: undefined,
        pathParameters: undefined
      };

      collection.push(groupItem);
    }
  }

  return collection;
}



// =============================================================================
// FILE OUTPUT FUNCTIONS
// =============================================================================

//async function writeOutput(data: ImportRequest[], inputFile: string, options: ConversionOptions): Promise<string> {
async function writeOutput(
  insomniaData: InsomniaV5Export,
  file: string,
  options: ConversionOptions
): Promise<string> {
  const baseName = path.basename(file, '.json');
  const extension = options.format === 'yaml' ? 'yaml' : 'json';
  const outputFile = path.join(options.outputDir, `${baseName}.insomnia.${extension}`);

  let content: string;
  if (options.format === 'yaml') {
    content = yaml.dump(insomniaData, {
      indent: 2,
      lineWidth: -1,
      noRefs: true
    });
  } else {
    content = JSON.stringify(insomniaData, null, 2);
  }

  fs.writeFileSync(outputFile, content, 'utf8');
  return outputFile;
}

/**
 * Safely converts variable data to environment data format
 */
function convertVariableToData(
  variable: Record<string, string | number | boolean> | Variable[] | undefined
): Record<string, string | number | boolean> {
  if (!variable) {
    return {};
  }

  // If it's already a simple object, return it
  if (!Array.isArray(variable)) {
    return variable;
  }

  // If it's an array of variables, convert to object
  const result: Record<string, string | number | boolean> = {};
  for (const v of variable) {
    if (typeof v === 'object' && v !== null && 'name' in v && 'value' in v) {
      result[String(v.name)] = v.value;
    }
  }

  return result;
}

function convertEnvironmentData(data: unknown): Record<string, string | number | boolean> {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const result: Record<string, string | number | boolean> = {};
  const objectData = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(objectData)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    } else if (value !== null && value !== undefined) {
      result[key] = String(value);
    }
  }

  return result;
}

function convertHeaders(headers: unknown): InsomniaV5Header[] {
  if (!Array.isArray(headers)) {
    return [];
  }

  return headers.map((h: unknown): InsomniaV5Header => {
    const header = h as Record<string, unknown>;
    return {
      name: String(header.name || ''),
      value: String(header.value || '')
    };
  });
}

function convertParameters(parameters: unknown): InsomniaV5Parameter[] {
  if (!Array.isArray(parameters)) {
    return [];
  }

  return parameters.map((p: unknown): InsomniaV5Parameter => {
    const param = p as Record<string, unknown>;
    return {
      name: String(param.name || ''),
      value: String(param.value || ''),
      disabled: Boolean(param.disabled)
    };
  });
}

function convertPathParameters(pathParameters: unknown): InsomniaV5PathParameter[] {
  if (!Array.isArray(pathParameters)) {
    return [];
  }

  return pathParameters.map((p: unknown): InsomniaV5PathParameter => {
    const param = p as Record<string, unknown>;
    return {
      name: String(param.name || ''),
      value: String(param.value || '')
    };
  });
}

function convertBody(body: unknown): InsomniaV5Body | EmptyBody {
  // Return empty object for falsy values
  if (!body) {
    return {};
  }

  // Return empty object for empty objects
  if (typeof body === 'object' && Object.keys(body).length === 0) {
    return {};
  }

  // Process structured bodies
  const bodyObj = body as Record<string, unknown>;

  // Return empty object if no meaningful content
  if (!bodyObj.mimeType && !bodyObj.text) {
    return {};
  }

  // Return structured body only when there's actual content
  return {
    mimeType: bodyObj.mimeType ? String(bodyObj.mimeType) : null,
    text: String(bodyObj.text || '')
  };
}

function convertAuthentication(auth: unknown): InsomniaV5Authentication {
  if (!auth || typeof auth !== 'object') {
    return {};
  }

  return auth as InsomniaV5Authentication;
}

function convertEnvironmentToObject(env: unknown): Record<string, unknown> {
  if (!env || typeof env !== 'object') {
    return {};
  }

  return env as Record<string, unknown>;
}