import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import chalk from 'chalk';

// Extracted constants (replacing UI dependencies)
export const CONTENT_TYPE_JSON = 'application/json';
export const CONTENT_TYPE_PLAINTEXT = 'text/plain';
export const CONTENT_TYPE_XML = 'application/xml';

// Simple faker functions (replacing UI dependency)
export const fakerFunctions = {
  guid: () => '{% faker "guid" %}',
  timestamp: () => '{% faker "timestamp" %}',
  randomInt: () => '{% faker "randomInt" %}',
  // Add more as needed
};

// Simple force bracket notation utility
export function forceBracketNotation(prefix: string, path: string): string {
  if (path.includes('-')) {
    return `${prefix}['${path}']`;
  }
  return `${prefix}.${path}`;
}

import { convert as postmanConvert } from './postman-converter';

// File type detection functions
function isPostmanEnvironment(parsed: any): boolean {
  return (
    parsed._postman_variable_scope === 'environment' ||
    parsed._postman_variable_scope === 'globals'
  ) && Array.isArray(parsed.values);
}

function isPostmanCollection(parsed: any): boolean {
  return parsed.info && parsed.info.schema && Array.isArray(parsed.item);
}

// Postman environment converter
function convertPostmanEnvironment(envData: any): any[] {
  const validPostmanEnvTypes = ['globals', 'environment'];

  if (!validPostmanEnvTypes.includes(envData._postman_variable_scope)) {
    return [];
  }

  // Create a workspace for the environment
  const workspaceId = 'wrk_' + Math.random().toString(36).substr(2, 9);
  const envId = 'env_' + Math.random().toString(36).substr(2, 9);

  // Convert environment variables to data object
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

      // Detect file type and use appropriate converter
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
        // Handle the different return types from postmanConvert
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
        // Convert to Insomnia v5 format using exact schema
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

  // Handle merged output
  if (options.merge && allCollections.length > 0) {
    const mergedData = convertToInsomniaV5Format(allCollections, 'Merged Collection');
    const outputPath = await writeMergedOutput(mergedData, options);
    result.outputs.push(outputPath);
  }

  return result;
}

function convertToInsomniaV5Format(resources: any[], collectionName: string) {
  // Check if this is an environment-only workspace (has workspace resource)
  const workspace = resources.find(r => r._type === 'workspace');

  if (workspace && workspace.scope === 'environment') {
    // Handle environment-only v5 format
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
          id: environment?._id || 'env_' + Math.random().toString(36).substr(2, 9),
          created: Date.now(),
          modified: Date.now(),
          isPrivate: false
        },
        data: environment?.data || {}
      }
    };
  }

  // Handle collection workspaces (find the collection root request_group)
  const collectionWorkspace = resources.find(r => r._type === 'request_group' && r.parentId === '__WORKSPACE_ID__');

  const insomniaData = {
    type: 'collection.insomnia.rest/5.0' as const,
    name: collectionWorkspace?.name || collectionName,
    meta: {
      id: collectionWorkspace?._id || 'wrk_' + Math.random().toString(36).substr(2, 9),
      created: Date.now(),
      modified: Date.now(),
      isPrivate: false,
      description: collectionWorkspace?.description || ''
    },
    collection: convertResourcesToInsomniaV5Collection(resources, collectionWorkspace?._id || '__WORKSPACE_ID__'),
    environments: {
      name: 'Base Environment',
      meta: {
        id: 'env_' + Math.random().toString(36).substr(2, 9),
        created: Date.now(),
        modified: Date.now(),
        isPrivate: false
      },
      data: collectionWorkspace?.variable || {}
    },
    cookieJar: {
      name: 'Cookie Jar',
      meta: {
        id: 'jar_' + Math.random().toString(36).substr(2, 9),
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
      // Create exact Request schema format
      collection.push({
        name: resource.name || '',
        url: resource.url || '',
        method: resource.method || 'GET', // Required field
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
          followRedirects: 'global' as const, // Must be enum value
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
        // Add undefined properties to satisfy discriminated union
        children: undefined
      });
    } else if (resource._type === 'request_group') {
      // Create exact RequestGroup schema format
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
        // Add undefined properties to satisfy discriminated union
        method: undefined,
        url: undefined,
        parameters: undefined,
        pathParameters: undefined
      });
    }
  }

  return collection;
}

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
