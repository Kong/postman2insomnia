export interface Comment {
  comment?: string;
}

export type Variable = `{{ ${string} }}`;

export interface Authentication extends Comment {
  authorizationUrl?: string;
  accessTokenUrl?: string;
  clientId?: string;
  clientSecret?: Variable;
  scope?: string;
  type?: 'basic' | 'oauth2' | 'bearer' | 'apikey' | 'awsv4' | 'digest' | 'oauth1';
  grantType?: 'authorization_code' | 'password' | 'client_credentials';
  disabled?: boolean;
  username?: string;
  password?: string;
}

export interface Parameter extends Comment {
  name: string;
  value?: string;
  filename?: string;
  fileName?: string;
  disabled?: boolean;
  type?: 'file' | string;
}

export type Body =
  | string
  | {
      mimeType?: string;
      text?: string;
      params?: Parameter[];
    };

export interface Cookie {
  name: string;
  value: string;
}

export interface Header extends Comment {
  name: 'Cookie' | 'Content-Type' | string;
  disabled?: boolean;
  value: any;
}

export interface QueryString extends Comment {
  name: string;
}

export type ImportRequestType = 'environment' | 'request' | 'request_group' | 'workspace';

export interface ImportRequest extends Comment {
  _id?: string;
  _type?: string;
  authentication?: Authentication;
  body?: Body;
  cookies?: Cookie[];
  environment?: {};
  headers?: Header[];
  httpVersion?: string;
  method?: string;
  name?: string;
  data?: object;
  description?: string;
  parameters?: Parameter[];
  parentId?: string | null;
  variable?: any;
  queryString?: QueryString[];
  url?: string;
  preRequestScript?: string;
  afterResponseScript?: string;
  metaSortKey?: number;
  scope?: string;
}

interface ConvertErrorResult {
  convertErrorMessage: string;
}

type ConvertResult = ImportRequest[] | ConvertErrorResult | null;

export type Converter = (rawData: string) => ConvertResult | Promise<ConvertResult>;

export interface ImportEntry {
  contentStr: string;
  oriFileName?: string;
  oriFilePath?: string;
}
