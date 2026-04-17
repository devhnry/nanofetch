import { request } from "./core/request";
import { InterceptorManager } from "./core/interceptors";
import { ApiRequestConfig, ApiResponse, ApiError } from "./types";

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

  private async runWithInterceptors<T>(
    config: ApiRequestConfig,
    dispatchFn: (config: ApiRequestConfig) => Promise<ApiResponse<T>>,
  ): Promise<ApiResponse<T>> {
    const reqHandlers: Array<import("./types").InterceptorHandler<ApiRequestConfig>> = [];
    this.interceptors.request.forEach((h) => reqHandlers.push(h));
    for (const handler of reqHandlers) {
      try {
        config = await handler.fulfilled(config);
      } catch (err) {
        if (handler.rejected) {
          config = await handler.rejected(err);
        } else {
          throw err;
        }
      }
    }

    let response: ApiResponse<T>;
    const resHandlers: Array<import("./types").InterceptorHandler<ApiResponse<any>>> = [];
    this.interceptors.response.forEach((h) => resHandlers.push(h));

    try {
      response = await dispatchFn(config);
    } catch (err) {
      // Give response interceptors a chance to handle dispatch errors (e.g. token refresh on 401)
      let handled = false;
      for (const handler of resHandlers) {
        if (handler.rejected) {
          try {
            response = await handler.rejected(err);
            handled = true;
            break;
          } catch (retryErr) {
            throw retryErr;
          }
        }
      }
      if (!handled) throw err;
    }

    for (const handler of resHandlers) {
      try {
        response = await handler.fulfilled(response!);
      } catch (err) {
        if (handler.rejected) {
          response = await handler.rejected(err);
        } else {
          throw err;
        }
      }
    }

    return response!;
  }

  async get<T = any>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.runWithInterceptors<T>(
      { ...this.defaultConfig, ...config, url, method: "GET" },
      (cfg) => request<T>("GET", url, undefined, cfg, this.defaultConfig),
    );
  }

  async post<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.runWithInterceptors<T>(
      { ...this.defaultConfig, ...config, url, method: "POST", data },
      (cfg) => request<T>("POST", url, data, cfg, this.defaultConfig),
    );
  }

  async put<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.runWithInterceptors<T>(
      { ...this.defaultConfig, ...config, url, method: "PUT", data },
      (cfg) => request<T>("PUT", url, data, cfg, this.defaultConfig),
    );
  }

  async patch<T = any>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.runWithInterceptors<T>(
      { ...this.defaultConfig, ...config, url, method: "PATCH", data },
      (cfg) => request<T>("PATCH", url, data, cfg, this.defaultConfig),
    );
  }

  async delete<T = any>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    return this.runWithInterceptors<T>(
      { ...this.defaultConfig, ...config, url, method: "DELETE" },
      (cfg) => request<T>("DELETE", url, undefined, cfg, this.defaultConfig),
    );
  }

  async head(url: string, config?: ApiRequestConfig): Promise<ApiResponse<void>> {
    return this.runWithInterceptors<void>(
      { ...this.defaultConfig, ...config, url, method: "HEAD" },
      (cfg) => request<void>("HEAD", url, undefined, cfg, this.defaultConfig),
    );
  }

  async options(url: string, config?: ApiRequestConfig): Promise<ApiResponse<void>> {
    return this.runWithInterceptors<void>(
      { ...this.defaultConfig, ...config, url, method: "OPTIONS" },
      (cfg) => request<void>("OPTIONS", url, undefined, cfg, this.defaultConfig),
    );
  }

  async replay<T = any>(error: ApiError): Promise<ApiResponse<T>> {
    if (!error.method || !error.url) {
      throw new ApiError("Cannot replay a request without method and url", error.config);
    }
    return this.runWithInterceptors<T>(
      { ...error.config, url: error.url, method: error.method, data: error.data },
      (cfg) => request<T>(error.method!, error.url!, error.data, cfg, this.defaultConfig),
    );
  }
}

/**
 * Factory function to create API client instances
 */
export function createApiClient(config?: ApiRequestConfig): ApiClient {
  return new ApiClient(config);
}
