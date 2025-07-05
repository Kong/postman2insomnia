// =============================================================================
// POSTMAN COLLECTION CONVERTER - UUID FORMAT FIX
// =============================================================================
// UPDATED: Generate proper UUID-style IDs that match Insomnia v5 format
// instead of __TYPE_hash_counter__ format
// =============================================================================
// =============================================================================
// Updated postman converter with transform support
// =============================================================================
// Replace the translateHandlersInScript function with transform-aware version
// =============================================================================

import { CONTENT_TYPE_JSON, CONTENT_TYPE_PLAINTEXT, CONTENT_TYPE_XML, fakerFunctions, forceBracketNotation } from './converter';
import { TransformEngine } from './transform-engine';

// Import all existing types (unchanged)
import type {
  Converter as EntityConverter,
  ImportRequest as EntityImportRequest,
  Parameter as EntityParameter,
  Authentication as EntityAuthentication
} from './types/entities';

import type {
  Auth as V200Auth,
  EventList as V200EventList,
  Folder as V200Folder,
  FormParameter as V200FormParameter,
  Header as V200Header,
  HttpsSchemaGetpostmanComJsonCollectionV200 as V200Schema,
  Item as V200Item,
  Request1 as V200Request1,
  Url,
  UrlEncodedParameter as V200UrlEncodedParameter,
} from './types/postman-2.0.types';

import type {
  Auth as V210Auth,
  Auth1 as V210Auth1,
  EventList as V210EventList,
  Folder as V210Folder,
  FormParameter as V210FormParameter,
  Header as V210Header,
  HttpsSchemaGetpostmanComJsonCollectionV210 as V210Schema,
  Item as V210Item,
  QueryParam,
  Request1 as V210Request1,
  UrlEncodedParameter as V210UrlEncodedParameter,
} from './types/postman-2.1.types';

// All existing type definitions remain the same...
export const id = 'postman';
export const name = 'Postman';
export const description = 'Importer for Postman collections';

type PostmanCollection = V200Schema | V210Schema;
type EventList = V200EventList | V210EventList;
type Authentication = V200Auth | V210Auth;
type Body = V200Request1['body'] | V210Request1['body'];
type UrlEncodedParameter = V200UrlEncodedParameter | V210UrlEncodedParameter;
type FormParameter = V200FormParameter | V210FormParameter;
type Item = V200Item | V210Item;
type Folder = V200Folder | V210Folder;
type Header = V200Header | V210Header;

type ImportRequest = EntityImportRequest;
type Parameter = EntityParameter;
type AuthTypeOAuth2 = EntityAuthentication;

// Existing UUID generation class (unchanged)
class UUIDGenerator {
  private fileHash: string;
  private baseTime: number;
  private requestCounter: number = 1;
  private groupCounter: number = 1;

  constructor(rawData: string) {
    this.fileHash = this.simpleHash(rawData);
    this.baseTime = Date.now();
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private generateHex32(): string {
    const timestamp = this.baseTime.toString(16);
    const fileHash = this.fileHash.padStart(8, '0').substring(0, 8);
    const random1 = Math.random().toString(16).substring(2, 10);
    const random2 = Math.random().toString(16).substring(2, 10);
    const random3 = Math.random().toString(16).substring(2, 10);

    const combined = (timestamp + fileHash + random1 + random2 + random3).substring(0, 32);
    return combined.padEnd(32, '0');
  }

  generateRequestId(): string {
    const hex = this.generateHex32();
    return `req_${hex}`;
  }

  generateGroupId(): string {
    const hex = this.generateHex32();
    return `fld_${hex}`;
  }
}

// Existing faker transformation functions (unchanged)
const fakerTags = Object.keys(fakerFunctions);
const postmanTagRegexs = fakerTags.map(tag => ({
  tag,
  regex: new RegExp(`\\{\\{\\$${tag}\\}\\}`, 'g')
}));

const postmanToNunjucksLookup = fakerTags
  .map(tag => ({ [tag]: `{% faker '${tag}' %}` }))
  .reduce((acc, obj) => ({ ...acc, ...obj }), {});

export const transformPostmanToNunjucksString = (inputString?: string | null) => {
  if (!inputString) {
    return '';
  }
  if (typeof inputString !== 'string') {
    return inputString;
  }

  const replaceFaker = postmanTagRegexs.reduce((transformedString, { tag, regex }) => {
    return transformedString.replace(regex, postmanToNunjucksLookup[tag]);
  }, inputString);

  return normaliseJsonPath(replaceFaker);
};

export const normaliseJsonPath = (input?: string) => {
  if (!input) {
    return '';
  }
  if (!input.includes('-')) {
    return input;
  }

  return input.replace(/{{\s*([^ }]+)\s*[^}]*\s*}}/g, (_, match) => {
    const replaced = forceBracketNotation('_', match);
    return `{{${replaced}}}`;
  });
};

// =============================================================================
// ENHANCED SCRIPT TRANSFORMATION WITH TRANSFORM ENGINE SUPPORT
// =============================================================================

/**
 * Enhanced script transformation that can use the transform engine
 */
export function translateHandlersInScript(
  scriptContent: string,
  transformEngine?: TransformEngine
): string {
  // Step 1: Basic pm. to insomnia. replacement (existing logic)
  let translated = scriptContent;
  let offset = 0;

  for (let i = 0; i < scriptContent.length - 2; i++) {
    const isPM = scriptContent.slice(i, i + 3) === 'pm.';
    const isPrevCharacterAlphaNumeric = i - 1 >= 0 && /[0-9a-zA-Z_$]/.test(scriptContent[i - 1]);

    if (isPM && !isPrevCharacterAlphaNumeric) {
      translated = translated.slice(0, i + offset) + 'insomnia.' + translated.slice(i + 3 + offset);
      offset += 6;
    }
  }

  // Step 2: Apply postprocessing transforms if provided
  if (transformEngine) {
    translated = transformEngine.postprocess(translated);
  }

  return translated;
}

// Existing schema URLs and helper functions (unchanged)
const POSTMAN_SCHEMA_URLS_V2_0 = [
  'https://schema.getpostman.com/json/collection/v2.0.0/collection.json',
  'https://schema.postman.com/json/collection/v2.0.0/collection.json',
];

const POSTMAN_SCHEMA_URLS_V2_1 = [
  'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  'https://schema.postman.com/json/collection/v2.1.0/collection.json',
];

const mapGrantTypeToInsomniaGrantType = (grantType: string) => {
  if (grantType === 'authorization_code_with_pkce') {
    return 'authorization_code';
  }
  if (grantType === 'password_credentials') {
    return 'password';
  }
  return grantType || 'authorization_code';
};

// =============================================================================
// ENHANCED IMPORTPOSTMAN CLASS WITH TRANSFORM SUPPORT
// =============================================================================

export class ImportPostman {
  collection: PostmanCollection;
  uuidGenerator: UUIDGenerator;
  transformEngine?: TransformEngine;

  constructor(collection: PostmanCollection, rawData: string, transformEngine?: TransformEngine) {
    this.collection = collection;
    this.uuidGenerator = new UUIDGenerator(rawData);
    this.transformEngine = transformEngine;
  }

  // All existing methods remain the same, but script processing methods are enhanced...

  importVariable = (variables: Record<string, string>[]): Record<string, string> | null => {
    if (variables?.length === 0) {
      return null;
    }

    const variable: Record<string, string> = {};
    for (const { key, value } of variables) {
      if (key === undefined) {
        continue;
      }
      variable[key] = transformPostmanToNunjucksString(value);
    }
    return variable;
  };

  importItems = (items: PostmanCollection['item'], parentId = '__WORKSPACE_ID__'): ImportRequest[] => {
    const result: ImportRequest[] = [];

    for (const item of items) {
      if (Object.prototype.hasOwnProperty.call(item, 'request')) {
        result.push(this.importRequestItem(item as Item, parentId));
      } else {
        const requestGroup = this.importFolderItem(item as Folder, parentId);
        result.push(requestGroup);
        result.push(...this.importItems((item as Folder).item as PostmanCollection['item'], requestGroup._id!));
      }
    }

    return result;
  };

  // ENHANCED: Script processing with transform engine support
  importPreRequestScript = (events: EventList | undefined): string => {
    if (events == null) {
      return '';
    }

    const preRequestEvent = events.find((event: any) => event.listen === 'prerequest');
    const scriptOrRows = preRequestEvent != null ? preRequestEvent.script : '';
    if (scriptOrRows == null || scriptOrRows === '') {
      return '';
    }

    const scriptContent =
      scriptOrRows.exec != null
        ? Array.isArray(scriptOrRows.exec)
          ? scriptOrRows.exec.join('\n')
          : scriptOrRows.exec
        : '';

    // Use enhanced script transformation with transform engine
    return translateHandlersInScript(scriptContent, this.transformEngine);
  };

  importAfterResponseScript = (events: EventList | undefined): string => {
    if (events == null) {
      return '';
    }

    const afterResponseEvent = events.find((event: any) => event.listen === 'test');
    const scriptOrRows = afterResponseEvent ? afterResponseEvent.script : '';
    if (!scriptOrRows) {
      return '';
    }

    const scriptContent = scriptOrRows.exec
      ? Array.isArray(scriptOrRows.exec)
        ? scriptOrRows.exec.join('\n')
        : scriptOrRows.exec
      : '';

    // Use enhanced script transformation with transform engine
    return translateHandlersInScript(scriptContent, this.transformEngine);
  };

  // All other existing methods remain exactly the same...
  importRequestItem = ({ request, name = '', event }: Item, parentId: string): ImportRequest => {
    if (typeof request === 'string') {
      return {
        _id: this.uuidGenerator.generateRequestId(),
        _type: 'request',
        name: name || 'Imported Request',
        url: request,
        method: 'GET',
        parentId
      };
    }

    const { authentication, headers } = this.importAuthentication(request.auth, request.header as Header[]);

    let parameters: Parameter[] = [];
    if (typeof request.url === 'object' && request.url?.query) {
      parameters = this.importParameters(request.url.query);
    }

    const preRequestScript = this.importPreRequestScript(event);
    const afterResponseScript = this.importAfterResponseScript(event);
    const body = this.importBody(request.body);

    if (
      !headers.find(({ key }: any) => key.toLowerCase() === 'content-type') &&
      typeof body === 'object' &&
      body?.mimeType
    ) {
      const contentType = body.mimeType === 'application/graphql' ? 'application/json' : body.mimeType;
      headers.push({
        key: 'Content-Type',
        value: contentType,
      } as any);
    }

    return {
      parentId,
      _id: this.uuidGenerator.generateRequestId(),
      _type: 'request',
      name,
      description: (request.description as string) || '',
      url: transformPostmanToNunjucksString(this.importUrl(request.url)),
      parameters: parameters,
      method: request.method || 'GET',
      headers: headers.map(({ key, value, disabled, description }: any) => ({
        name: transformPostmanToNunjucksString(key),
        value: transformPostmanToNunjucksString(value),
        ...(disabled !== undefined ? { disabled } : {}),
        ...(description !== undefined ? { description } : {}),
      })),
      body,
      authentication,
      preRequestScript,
      afterResponseScript,
    };
  };

  importParameters = (parameters: QueryParam[]): Parameter[] => {
    if (!parameters || parameters?.length === 0) {
      return [];
    }
    return parameters.map(
      ({ key, value, disabled }) =>
        ({
          name: transformPostmanToNunjucksString(key),
          value: transformPostmanToNunjucksString(value),
          disabled: disabled || false,
        }) as Parameter,
    );
  };

  importFolderItem = ({ name, description, event, auth }: Folder, parentId: string): ImportRequest => {
    const { authentication } = this.importAuthentication(auth);
    const preRequestScript = this.importPreRequestScript(event);
    const afterResponseScript = this.importAfterResponseScript(event);

    let desc = '';
    if (typeof description === 'string') {
      desc = description;
    } else if (description && typeof description === 'object' && 'content' in description) {
      desc = description.content || '';
    }

    return {
      parentId,
      _id: this.uuidGenerator.generateGroupId(),
      _type: 'request_group',
      name: name || 'Imported Folder',
      description: desc,
      preRequestScript,
      afterResponseScript,
      authentication,
    };
  };

  importCollection = (): ImportRequest[] => {
    const {
      item,
      info: { name, description },
      variable,
      auth,
      event,
    } = this.collection;

    const postmanVariable = this.importVariable((variable as Record<string, string>[]) || []);
    const { authentication } = this.importAuthentication(auth);
    const preRequestScript = this.importPreRequestScript(event);
    const afterResponseScript = this.importAfterResponseScript(event);

    const collectionFolder: ImportRequest = {
      parentId: '__WORKSPACE_ID__',
      _id: this.uuidGenerator.generateGroupId(),
      _type: 'request_group',
      name,
      description: typeof description === 'string' ? description : '',
      authentication,
      preRequestScript,
      afterResponseScript,
    };

    if (postmanVariable) {
      collectionFolder.variable = postmanVariable;
    }

    return [collectionFolder, ...this.importItems(item, collectionFolder._id!)];
  };

  importUrl = (url?: Url | string) => {
    if (!url) {
      return '';
    }

    if (typeof url === 'object' && url.query && url.raw?.includes('?')) {
      return url.raw?.slice(0, url.raw.indexOf('?')) || '';
    }

    if (typeof url === 'object' && url.raw) {
      return url.raw;
    }

    if (typeof url === 'string') {
      return url;
    }

    return '';
  };

  importBody = (body: Body): ImportRequest['body'] => {
    if (!body) {
      return {};
    }

    if (body.mode === 'graphql') {
      return this.importBodyGraphQL(body.graphql);
    }
    if (body.mode === 'formdata') {
      return this.importBodyFormdata(body.formdata || []);
    }
    if (body.mode === 'urlencoded') {
      return this.importBodyFormUrlEncoded(body.urlencoded || []);
    }
    if (body.mode === 'raw') {
      const rawOptions = body.options?.raw as { language: string };
      return this.importBodyRaw(body.raw, rawOptions?.language || '');
    }

    return {};
  };

  importBodyGraphQL = (graphql: any): ImportRequest['body'] => {
    if (!graphql) {
      return {};
    }

    const query = graphql.query || '';
    const variables = graphql.variables || '';

    return {
      mimeType: 'application/graphql',
      text: JSON.stringify({
        query,
        variables: variables ? JSON.parse(variables) : {}
      })
    };
  };

  importBodyFormdata = (formdata: FormParameter[]): ImportRequest['body'] => {
    if (!formdata || formdata.length === 0) {
      return {};
    }

    const params = formdata.map((param) => {
      const disabled = 'disabled' in param ? param.disabled : ('enabled' in param ? !param.enabled : false);

      if (param.type === 'file') {
        return {
          name: param.key,
          type: 'file',
          fileName: param.src as string,
          disabled: disabled || false
        };
      }

      return {
        name: param.key,
        value: transformPostmanToNunjucksString(param.value as string),
        disabled: disabled || false
      };
    });

    return {
      mimeType: 'multipart/form-data',
      params
    };
  };

  importBodyFormUrlEncoded = (urlencoded: UrlEncodedParameter[]): ImportRequest['body'] => {
    if (!urlencoded || urlencoded.length === 0) {
      return {};
    }

    const params = urlencoded.map((param) => {
      const disabled = 'disabled' in param ? param.disabled : ('enabled' in param ? !param.enabled : false);

      return {
        name: param.key,
        value: transformPostmanToNunjucksString(param.value),
        disabled: disabled || false
      };
    });

    return {
      mimeType: 'application/x-www-form-urlencoded',
      params
    };
  };

  importBodyRaw = (raw: string | undefined, language: string): ImportRequest['body'] => {
    if (!raw) {
      return {};
    }

    let mimeType = CONTENT_TYPE_PLAINTEXT;

    if (language === 'json') {
      mimeType = CONTENT_TYPE_JSON;
    } else if (language === 'xml') {
      mimeType = CONTENT_TYPE_XML;
    }

    return {
      mimeType,
      text: transformPostmanToNunjucksString(raw)
    };
  };

  importAuthentication = (auth?: V200Auth | V210Auth | null, headers: Header[] = []): { authentication: any; headers: Header[] } => {
    const authHeaders = [...headers];
    let authentication: any = {};

    // Check for auth in headers first
    const authHeader = headers.find(h => h.key?.toLowerCase() === 'authorization');
    if (authHeader && typeof authHeader.value === 'string') {
      const authValue = authHeader.value;

      if (authValue.startsWith('Bearer ')) {
        authentication = {
          type: 'bearer',
          token: authValue.substring(7),
          disabled: false
        };
        // Remove auth header since it's now handled by authentication
        const index = authHeaders.findIndex(h => h.key?.toLowerCase() === 'authorization');
        if (index > -1) authHeaders.splice(index, 1);
      } else if (authValue.startsWith('Basic ')) {
        authentication = {
          type: 'basic',
          useISO88591: false,
          disabled: false
        };
        // Remove auth header since it's now handled by authentication
        const index = authHeaders.findIndex(h => h.key?.toLowerCase() === 'authorization');
        if (index > -1) authHeaders.splice(index, 1);
      }
    }

    // Handle explicit auth object
    if (auth && auth.type !== 'noauth') {
      switch (auth.type) {
        case 'bearer':
          const bearerAuth = auth.bearer as V210Auth1[];
          const tokenField = bearerAuth?.find(field => field.key === 'token');
          authentication = {
            type: 'bearer',
            token: transformPostmanToNunjucksString(tokenField?.value as string),
            disabled: false
          };
          break;

        case 'basic':
          const basicAuth = auth.basic as V210Auth1[];
          const usernameField = basicAuth?.find(field => field.key === 'username');
          const passwordField = basicAuth?.find(field => field.key === 'password');
          authentication = {
            type: 'basic',
            username: transformPostmanToNunjucksString(usernameField?.value as string),
            password: transformPostmanToNunjucksString(passwordField?.value as string),
            useISO88591: false,
            disabled: false
          };
          break;

        case 'apikey':
          const apikeyAuth = auth.apikey as V210Auth1[];
          const keyField = apikeyAuth?.find(field => field.key === 'key');
          const valueField = apikeyAuth?.find(field => field.key === 'value');
          const inField = apikeyAuth?.find(field => field.key === 'in');
          authentication = {
            type: 'apikey',
            key: transformPostmanToNunjucksString(keyField?.value as string),
            value: transformPostmanToNunjucksString(valueField?.value as string),
            addTo: inField?.value === 'header' ? 'header' : 'query',
            disabled: false
          };
          break;

        case 'oauth2':
          const oauth2Auth = auth.oauth2 as V210Auth1[];
          const accessTokenField = oauth2Auth?.find(field => field.key === 'accessToken');
          const tokenTypeField = oauth2Auth?.find(field => field.key === 'tokenType');
          authentication = {
            type: 'oauth2',
            grantType: 'authorization_code',
            accessTokenUrl: '',
            authorizationUrl: '',
            clientId: '',
            clientSecret: '',
            scope: '',
            accessToken: transformPostmanToNunjucksString(accessTokenField?.value as string),
            disabled: false
          };
          break;

        case 'oauth1':
          authentication = {
            type: 'oauth1',
            disabled: false
          };
          break;

        case 'awsv4':
          authentication = {
            type: 'iam',
            disabled: false
          };
          break;

        case 'digest':
          const digestAuth = auth.digest as V210Auth1[];
          const digestUsernameField = digestAuth?.find(field => field.key === 'username');
          const digestPasswordField = digestAuth?.find(field => field.key === 'password');
          authentication = {
            type: 'digest',
            username: transformPostmanToNunjucksString(digestUsernameField?.value as string),
            password: transformPostmanToNunjucksString(digestPasswordField?.value as string),
            disabled: false
          };
          break;

        default:
          authentication = { disabled: false };
      }
    }

    return {
      authentication,
      headers: authHeaders
    };
  };
}

// =============================================================================
// ENHANCED MAIN CONVERTER EXPORT FUNCTION
// =============================================================================
export const convert: EntityConverter = (rawData: string, transformEngine?: TransformEngine) => {
  try {
    const collection = JSON.parse(rawData) as PostmanCollection;

    if (
      POSTMAN_SCHEMA_URLS_V2_0.includes(collection.info.schema) ||
      POSTMAN_SCHEMA_URLS_V2_1.includes(collection.info.schema)
    ) {
      // Pass transform engine to ImportPostman constructor
      const list = new ImportPostman(collection, rawData, transformEngine).importCollection();

      const now = Date.now();
      const ordered = list.map((item, index) => ({
        ...item,
        metaSortKey: -1 * (now - index),
      }));

      return ordered;
    }
  } catch (error) {
    console.error('Error parsing Postman collection:', error);
  }

  return null;
};
