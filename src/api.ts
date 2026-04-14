import { request } from "./core/request";
import { InterceptorManager } from "./core/interceptors";
import { ApiRequestConfig, ApiResponse } from "./types";

/**
 * Main API class with Axios-style methods
 */
export class ApiClient {
  private defaultConfig: ApiRequestConfig;

  interceptors: {
    request: InterceptorManager<ApiRequestConfig>;
    response: InterceptorManager<ApiResponse<any>>;
  };

  constructor(config: ApiRequestConfig = {}) {
    this.defaultConfig = config;
    this.interceptors = {
      request: new InterceptorManager<ApiRequestConfig>(),
      response: new InterceptorManager<ApiResponse<any>>(),
    };
  }

  /**
   * Run a method through the full interceptor chain.
   *
   * TODO(human): Implement the interceptor pipeline here.
   * This method receives the raw config and a dispatchFn that calls fetch.
   * It should:
   *   1. Run all request interceptors on the config (in order)
   *   2. Call dispatchFn with the (possibly modified) config
   *   3. Run all response interceptors on the result (in order)
   * Return the final ApiResponse.
   */
  private async runWithInterceptors<T>(
    config: ApiRequestConfig,
    dispatchFn: (config: ApiRequestConfig) => Promise<ApiResponse<T>>,
  ): Promise<ApiResponse<T>> {
    
    const reqHandlers: Array<import("./types").InterceptorHandler<ApiRequestConfig>> = [];

    this.interceptors.request.forEach((h) => reqHandlers.push(h));
    for (const handler of reqHandlers) {
      config = await handler.fulfilled(config);
    }

    let response = await dispatchFn(config);

    const resHandlers: Array<import("./types").InterceptorHandler<ApiResponse<any>>> = [];
    this.interceptors.response.forEach((h) => resHandlers.push(h));
    for (const handler of resHandlers) {
      response = await handler.fulfilled(response);
    }

    return response;
  }

  async get<T = any>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.runWithInterceptors<T>(
      { ...this.defaultConfig, ...config },
      (cfg) => request<T>("GET", url, undefined, cfg, this.defaultConfig),
    );
  }

  async post<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.runWithInterceptors<T>(
      { ...this.defaultConfig, ...config },
      (cfg) => request<T>("POST", url, data, cfg, this.defaultConfig),
    );
  }

  async put<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.runWithInterceptors<T>(
      { ...this.defaultConfig, ...config },
      (cfg) => request<T>("PUT", url, data, cfg, this.defaultConfig),
    );
  }

  async patch<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.runWithInterceptors<T>(
      { ...this.defaultConfig, ...config },
      (cfg) => request<T>("PATCH", url, data, cfg, this.defaultConfig),
    );
  }

  async delete<T = any>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.runWithInterceptors<T>(
      { ...this.defaultConfig, ...config },
      (cfg) => request<T>("DELETE", url, undefined, cfg, this.defaultConfig),
    );
  }

  async head(url: string, config?: ApiRequestConfig): Promise<ApiResponse<void>> {
    return this.runWithInterceptors<void>(
      { ...this.defaultConfig, ...config },
      (cfg) => request<void>("HEAD", url, undefined, cfg, this.defaultConfig),
    );
  }

  async options(url: string, config?: ApiRequestConfig): Promise<ApiResponse<void>> {
    return this.runWithInterceptors<void>(
      { ...this.defaultConfig, ...config },
      (cfg) => request<void>("OPTIONS", url, undefined, cfg, this.defaultConfig),
    );
  }
}

/**
 * Factory function to create API client instances
 */
export function createApiClient(config?: ApiRequestConfig): ApiClient {
  return new ApiClient(config);
}
