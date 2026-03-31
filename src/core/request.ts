import { ApiRequestConfig, ApiResponse, ApiError } from "../types";

/**
 * Build the full URL from baseURL, path, and query params
 */
function buildURL(
  baseURL: string,
  path: string,
  params?: Record<string, any>,
): string {
  // Remove trailing slash from baseURL
  const base = baseURL.replace(/\/$/, "");
  // Remove leading slash from path
  const cleanPath = path.replace(/^\//, "");
  // Combine them
  let url = `${base}/${cleanPath}`;

  // Add query params if they exist
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    url += `?${searchParams.toString()}`;
  }

  return url;
}

/**
 * Merge headers with defaults
 */
function mergeHeaders(
  defaults?: Record<string, string>,
  custom?: Record<string, string>,
): Headers {
  const headers = new Headers();

  // Add default headers
  if (defaults) {
    Object.entries(defaults).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  // Override with custom headers
  if (custom) {
    Object.entries(custom).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }

  return headers;
}

/**
 * Core request function that executes fetch
 */
export async function request<T = any>(
  method: string,
  url: string,
  data?: any,
  config: ApiRequestConfig = {},
  defaultConfig: ApiRequestConfig = {},
): Promise<ApiResponse<T>> {
  // Merge configs (request config overrides default config)
  const mergedConfig: ApiRequestConfig = {
    ...defaultConfig,
    ...config,
    headers: {
      ...defaultConfig.headers,
      ...config.headers,
    },
  };

  // Build full URL
  const fullURL = mergedConfig.baseURL
    ? buildURL(mergedConfig.baseURL, url, mergedConfig.params)
    : url;

  // Prepare headers
  const headers = mergeHeaders(defaultConfig.headers, mergedConfig.headers);

  // Auto-set Content-Type for JSON data
  if (data && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Prepare request body
  let body: string | FormData | undefined;
  if (data) {
    if (data instanceof FormData) {
      body = data;
      // Remove Content-Type for FormData (browser sets it with boundary)
      headers.delete("Content-Type");
    } else {
      body = JSON.stringify(data);
    }
  }

  // Setup timeout with AbortController
  const controller = new AbortController();
  const timeoutId = mergedConfig.timeout
    ? setTimeout(() => controller.abort(), mergedConfig.timeout)
    : null;

  try {
    // Execute fetch
    const response = await fetch(fullURL, {
      method,
      headers,
      body,
      signal: mergedConfig.signal || controller.signal,
    });

    // Clear timeout
    if (timeoutId) clearTimeout(timeoutId);

    // Parse response based on responseType
    let responseData: any;
    const responseType = mergedConfig.responseType || "json";

    if (responseType === "json") {
      const text = await response.text();
      responseData = text ? JSON.parse(text) : null;
    } else if (responseType === "text") {
      responseData = await response.text();
    } else if (responseType === "blob") {
      responseData = await response.blob();
    }

    // Build response object
    const apiResponse: ApiResponse<T> = {
      data: responseData,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      config: mergedConfig,
    };

    // Throw error for 4xx and 5xx responses
    if (!response.ok) {
      const error = new ApiError(
        `Request failed with status ${response.status}`,
        mergedConfig,
      );
      error.status = response.status;
      error.response = apiResponse;
      throw error;
    }

    return apiResponse;
  } catch (err: any) {
    // Clear timeout on error
    if (timeoutId) clearTimeout(timeoutId);

    // Handle different error types
    if (err instanceof ApiError) {
      throw err; // Re-throw API errors
    }

    const error = new ApiError(err.message || "Request failed", mergedConfig);

    // Detect timeout
    if (err.name === "AbortError") {
      error.isTimeout = true;
      error.message = "Request timeout";
    } else {
      // Network errors (no internet, DNS failure, etc.)
      error.isNetworkError = true;
    }

    throw error;
  }
}
