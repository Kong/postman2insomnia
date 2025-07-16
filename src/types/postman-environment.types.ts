export interface PostmanEnvironmentVariable {
  enabled?: boolean;
  key: string;
  name?: string;
  type?: string;
  value: string;
}

export interface PostmanEnvironment {
  id?: string;
  name: string;
  syncedFilename?: string;
  synced?: boolean;
  timestamp?: number;
  values: PostmanEnvironmentVariable[];
  _postman_variable_scope?: string; // sometimes present
}
