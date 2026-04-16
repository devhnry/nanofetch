/**
 * Configuration for a single API request
 */
export interface ApiRequestConfig {
  baseURL?: string;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  responseType?: "json" | "text" | "blob";
  retry?: {
    attempts?: number;
    baseDelay?: number;
    statusCodes?: number[];
  }
}

/**
 * API response structure
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: ApiRequestConfig;
}

/**
 * A single interceptor handler pair
 */
export interface InterceptorHandler<T> {
  fulfilled: (value: T) => T | Promise<T>;
  rejected?: (error: any) => any;
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  status?: number;
  response?: ApiResponse<any>;
  config?: ApiRequestConfig;
  isNetworkError: boolean = false;
  isTimeout: boolean = false;
  isParseError: boolean = false;
  method?: string;
  url?: string;
  data?: any;

  constructor(message: string, config?: ApiRequestConfig) {
    super(message);
    this.name = "ApiError";
    this.config = config;
  }
}