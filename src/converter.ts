// =============================================================================
// POSTMAN TO INSOMNIA CONVERTER - UUID FORMAT FIX
// =============================================================================
// Updated to generate proper UUID-style IDs that match Insomnia v5 format
// =============================================================================
// =============================================================================
// Updated converter with transform engine integration
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import { TransformEngine, translateHandlersInScriptWithTransforms } from './transform-engine';

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

// =============================================================================
// ENHANCED CONVERSION OPTIONS
// =============================================================================

export interface ConversionOptions {
  outputDir: string;
  format: 'yaml' | 'json';
  merge: boolean;
  verbose: boolean;
  preprocess?: boolean;
  postprocess?: boolean;
  configFile?: string;
  transformEngine?: TransformEngine;
}

export interface ConversionResult {
  successful: number;
  failed: number;
  outputs: string[];
}

// =============================================================================
// ENHANCED FILE PROCESSING WITH TRANSFORMS
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

function convertPostmanEnvironment(envData: any): any[] {
  const validPostmanEnvTypes = ['globals', 'environment'];
  if (!validPostmanEnvTypes.includes(envData._postman_variable_scope)) {
    return [];
  }

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

  const allCollections: any[] = [];

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
        rawData = transformEngine.preprocess(rawData);
      }

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
// ENHANCED POSTMAN CONVERTER WITH TRANSFORM SUPPORT
// =============================================================================
function convertPostmanCollectionWithTransforms(
  rawData: string,
  transformEngine?: TransformEngine,
  options?: ConversionOptions
): any[] | null {
  try {
    const collection = JSON.parse(rawData);

    // Use the existing converter logic but with enhanced script processing
    const result = postmanConvert(rawData, transformEngine);

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
            item.preRequestScript = transformEngine.postprocess(item.preRequestScript);
          }
          if (item.afterResponseScript) {
            item.afterResponseScript = transformEngine.postprocess(item.afterResponseScript);
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
// EXISTING INSOMNIA V5 FORMAT CONVERSION (UNCHANGED)
// =============================================================================

function convertToInsomniaV5Format(resources: any[], collectionName: string) {
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

function convertResourcesToInsomniaV5Collection(resources: any[], parentId: string): any[] {
  const collection: any[] = [];
  const childResources = resources.filter(r => r.parentId === parentId);

  for (const resource of childResources) {
    if (resource._type === 'request') {
      collection.push({
        name: resource.name || '',
        url: resource.url || '',
        method: resource.method || 'GET',
        body: resource.body || { mimeType: null, text: '' },
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

        children: convertResourcesToInsomniaV5Collection(resources, resource._id),

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
// FILE OUTPUT FUNCTIONS (UNCHANGED)
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
