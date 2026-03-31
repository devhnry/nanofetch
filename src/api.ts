import { request } from "./core/request";
import { ApiRequestConfig, ApiResponse } from "./types";

/**
 * Main API class with Axios-style methods
 */
export class ApiClient {
  private defaultConfig: ApiRequestConfig;

  constructor(config: ApiRequestConfig = {}) {
    this.defaultConfig = config;
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    config?: ApiRequestConfig,
  ): Promise<ApiResponse<T>> {
    return request<T>("GET", url, undefined, config, this.defaultConfig);
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: ApiRequestConfig,
  ): Promise<ApiResponse<T>> {
    return request<T>("POST", url, data, config, this.defaultConfig);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: ApiRequestConfig,
  ): Promise<ApiResponse<T>> {
    return request<T>("PUT", url, data, config, this.defaultConfig);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    url: string,
    data?: any,
    config?: ApiRequestConfig,
  ): Promise<ApiResponse<T>> {
    return request<T>("PATCH", url, data, config, this.defaultConfig);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    url: string,
    config?: ApiRequestConfig,
  ): Promise<ApiResponse<T>> {
    return request<T>("DELETE", url, undefined, config, this.defaultConfig);
  }

  /**
   * HEAD request
   */
  async head(
    url: string,
    config?: ApiRequestConfig,
  ): Promise<ApiResponse<void>> {
    return request<void>("HEAD", url, undefined, config, this.defaultConfig);
  }

  /**
   * OPTIONS request
   */
  async options(
    url: string,
    config?: ApiRequestConfig,
  ): Promise<ApiResponse<void>> {
    return request<void>("OPTIONS", url, undefined, config, this.defaultConfig);
  }
}

/**
 * Factory function to create API client instances
 */
export function createApiClient(config?: ApiRequestConfig): ApiClient {
  return new ApiClient(config);
}
