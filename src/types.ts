/**
 * Configuration for a single API request
 */
export interface ApiRequestConfig {
  baseURL?: string;
  url?: string;
  method?: string;
  data?: any;
  params?: Record<string, any>;
  /**
   * Optional params serializer. Return a query string without a leading "?".
   * If omitted, nanofetch uses a small built-in serializer.
   */
  paramsSerializer?: (params: unknown) => string;
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  responseType?: "json" | "text" | "blob" | "arrayBuffer";
  /**
   * Override fetch implementation (useful for tests / custom runtimes).
   * Defaults to global fetch.
   */
  fetch?: typeof fetch;
  /**
   * Decide whether an HTTP status should resolve or throw.
   * Defaults to 200–299.
   */
  validateStatus?: (status: number) => boolean;
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
  /**
   * Opaque request info (Axios-like). Shape may vary by environment.
   */
  request?: any;
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
  code?: string;
  request?: any;
  cause?: unknown;
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

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isCancel(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === "ERR_CANCELED";
}
