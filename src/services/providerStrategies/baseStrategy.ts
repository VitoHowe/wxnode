import axios, { AxiosInstance } from 'axios';

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  [key: string]: any;
}

export interface ProviderStrategy {
  fetchModels(): Promise<ModelInfo[]>;
}

export abstract class BaseProviderStrategy implements ProviderStrategy {
  protected axiosInstance: AxiosInstance;
  protected endpoint: string;
  protected apiKey: string;
  protected config: Record<string, any>;

  constructor(endpoint: string, apiKey: string, config: Record<string, any> = {}) {
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.config = config;
    this.axiosInstance = axios.create({
      timeout: 10000,
    });
  }

  abstract fetchModels(): Promise<ModelInfo[]>;
}
