// src/postman-converter.ts (using your real type files)
import { CONTENT_TYPE_JSON, CONTENT_TYPE_PLAINTEXT, CONTENT_TYPE_XML, fakerFunctions, forceBracketNotation } from './converter';

// Import types from entities but rename to avoid conflicts
import type {
  Converter as EntityConverter,
  ImportRequest as EntityImportRequest,
  Parameter as EntityParameter,
  Authentication as EntityAuthentication
} from './types/entities';

// Import Postman types with proper naming
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

// Use the entity types for our exports
type ImportRequest = EntityImportRequest;
type Parameter = EntityParameter;
type AuthTypeOAuth2 = EntityAuthentication;

let requestCount = 1;
let requestGroupCount = 1;
const fakerTags = Object.keys(fakerFunctions);
const postmanTagRegexs = fakerTags.map(tag => ({ tag, regex: new RegExp(`\\{\\{\\$${tag}\\}\\}`, 'g') }));
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

export function translateHandlersInScript(scriptContent: string): string {
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
  return translated;
}

export class ImportPostman {
  collection: PostmanCollection;

  constructor(collection: PostmanCollection) {
    this.collection = collection;
  }

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

    return translateHandlersInScript(scriptContent);
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

    return translateHandlersInScript(scriptContent);
  };

  importRequestItem = ({ request, name = '', event }: Item, parentId: string): ImportRequest => {
    if (typeof request === 'string') {
      return {
        _id: `__REQ_${requestCount++}__`,
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
      _id: `__REQ_${requestCount++}__`,
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
      _id: `__GRP_${requestGroupCount++}__`,
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
      _id: `__GRP_${requestGroupCount++}__`,
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
      return this.importBodyFormdata(body.formdata);
    }
    if (body.mode === 'urlencoded') {
      return this.importBodyFormUrlEncoded(body.urlencoded);
    }
    if (body.mode === 'raw') {
      const rawOptions = body.options?.raw as { language: string };
      return this.importBodyRaw(body.raw, rawOptions?.language || '');
    }
    return {};
  };

  importBodyFormdata = (formdata?: FormParameter[]) => {
    const { schema } = this.collection.info;

    const params = formdata?.map(({ key, value, type, enabled, disabled, src }: any) => {
      const item: Parameter = {
        type,
        name: transformPostmanToNunjucksString(key),
      };

      if (POSTMAN_SCHEMA_URLS_V2_0.includes(schema)) {
        item.disabled = !enabled;
      } else if (POSTMAN_SCHEMA_URLS_V2_1.includes(schema)) {
        item.disabled = !!disabled;
      }

      if (type === 'file') {
        item.fileName = src as string;
      } else if (typeof value === 'string') {
        item.value = transformPostmanToNunjucksString(value);
      } else {
        item.value = value as string;
      }

      return item;
    });

    return {
      params,
      mimeType: 'multipart/form-data',
    };
  };

  importBodyFormUrlEncoded = (urlEncoded?: UrlEncodedParameter[]): ImportRequest['body'] => {
    const { schema } = this.collection.info;

    const params = urlEncoded?.map(({ key, value, enabled, disabled }: any) => {
      const item: Parameter = {
        value: transformPostmanToNunjucksString(value),
        name: transformPostmanToNunjucksString(key),
      };

      if (POSTMAN_SCHEMA_URLS_V2_0.includes(schema)) {
        item.disabled = !enabled;
      } else if (POSTMAN_SCHEMA_URLS_V2_1.includes(schema)) {
        item.disabled = !!disabled;
      }

      return item;
    });

    return {
      params,
      mimeType: 'application/x-www-form-urlencoded',
    };
  };

  importBodyRaw = (raw?: string, language?: string) => {
    if (raw === '') {
      return {};
    }
    if (language === 'xml') {
      return {
        mimeType: CONTENT_TYPE_XML,
        text: transformPostmanToNunjucksString(raw),
      };
    }
    if (language === 'json') {
      return {
        mimeType: CONTENT_TYPE_JSON,
        text: transformPostmanToNunjucksString(raw),
      };
    }
    return {
      mimeType: CONTENT_TYPE_PLAINTEXT,
      text: transformPostmanToNunjucksString(raw),
    };
  };

  importBodyGraphQL = (graphql?: Record<string, unknown>) => {
    if (!graphql) {
      return {};
    }

    return {
      mimeType: 'application/graphql',
      text: transformPostmanToNunjucksString(JSON.stringify(graphql)),
    };
  };

  importAuthentication = (authentication?: Authentication | null, originalHeaders: Header[] = []) => {
    const isAuthorizationHeader = ({ key }: any) => key === 'Authorization';
    const authorizationHeader = originalHeaders.find(isAuthorizationHeader)?.value;
    const headers = originalHeaders;

    if (!authentication) {
      if (authorizationHeader) {
        switch (authorizationHeader?.slice(0, Math.max(0, authorizationHeader.indexOf(' ')))) {
          case 'Bearer': {
            return {
              authentication: this.importBearerAuthenticationFromHeader(authorizationHeader),
              headers,
            };
          }
          case 'Basic': {
            return {
              authentication: this.importBasicAuthenticationFromHeader(authorizationHeader),
              headers,
            };
          }
          case 'AWS4-HMAC-SHA256': {
            return this.importАwsv4AuthenticationFromHeader(authorizationHeader, headers);
          }
          case 'Digest': {
            return {
              authentication: this.importDigestAuthenticationFromHeader(authorizationHeader),
              headers,
            };
          }
          case 'OAuth': {
            return {
              authentication: this.importOauth1AuthenticationFromHeader(authorizationHeader),
              headers,
            };
          }
          default: {
            return {
              authentication: {},
              headers,
            };
          }
        }
      }
      return {
        authentication: {},
        headers,
      };
    }

    switch (authentication.type) {
      case 'awsv4': {
        return {
          authentication: this.importAwsV4Authentication(authentication),
          headers,
        };
      }
      case 'basic': {
        return {
          authentication: this.importBasicAuthentication(authentication),
          headers,
        };
      }
      case 'bearer': {
        return {
          authentication: this.importBearerTokenAuthentication(authentication),
          headers,
        };
      }
      case 'digest': {
        return {
          authentication: this.importDigestAuthentication(authentication),
          headers,
        };
      }
      case 'oauth1': {
        return {
          authentication: this.importOauth1Authentication(authentication),
          headers,
        };
      }
      case 'oauth2': {
        return {
          authentication: this.importOauth2Authentication(authentication),
          headers,
        };
      }
      case 'apikey': {
        return {
          authentication: this.importApiKeyAuthentication(authentication),
          headers,
        };
      }
      default: {
        return {
          authentication: {},
          headers: originalHeaders,
        };
      }
    }
  };

  // Simplified authentication methods (you can expand these with your full implementations)
  importAwsV4Authentication = (auth: Authentication) => {
    return { type: 'iam', disabled: false };
  };

  importBasicAuthentication = (auth: Authentication) => {
    return { type: 'basic', disabled: false };
  };

  importBearerTokenAuthentication = (auth: Authentication) => {
    return { type: 'bearer', disabled: false };
  };

  importDigestAuthentication = (auth: Authentication) => {
    return { type: 'digest', disabled: false };
  };

  importOauth1Authentication = (auth: Authentication) => {
    return { type: 'oauth1', disabled: false };
  };

  importOauth2Authentication = (auth: Authentication): AuthTypeOAuth2 | {} => {
    return { type: 'oauth2', disabled: false };
  };

  importApiKeyAuthentication = (auth: Authentication) => {
    return { type: 'apikey', disabled: false };
  };

  // Header-based authentication methods
  importBasicAuthenticationFromHeader = (authHeader: string) => {
    return { type: 'basic', disabled: false };
  };

  importBearerAuthenticationFromHeader = (authHeader: string) => {
    return { type: 'bearer', disabled: false };
  };

  importАwsv4AuthenticationFromHeader = (authHeader: string, headers: Header[]) => {
    return { authentication: { type: 'iam', disabled: false }, headers };
  };

  importDigestAuthenticationFromHeader = (authHeader: string) => {
    return { type: 'digest', disabled: false };
  };

  importOauth1AuthenticationFromHeader = (authHeader: string) => {
    return { type: 'oauth1', disabled: false };
  };

  findValueByKey = <T extends { key: string; value?: unknown }>(array?: T[], key?: string) => {
    if (!array) {
      return '';
    }

    const obj = array.find(o => o.key === key);

    if (obj && typeof obj.value === 'string') {
      return obj.value || '';
    }

    return '';
  };
}

export const convert: EntityConverter = rawData => {
  requestCount = 1;
  requestGroupCount = 1;

  try {
    const collection = JSON.parse(rawData) as PostmanCollection;

    if (
      POSTMAN_SCHEMA_URLS_V2_0.includes(collection.info.schema) ||
      POSTMAN_SCHEMA_URLS_V2_1.includes(collection.info.schema)
    ) {
      const list = new ImportPostman(collection).importCollection();
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
