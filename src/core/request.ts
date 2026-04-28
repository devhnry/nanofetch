import { ApiRequestConfig, ApiResponse, ApiError } from "../types";

/**
 * Build the full URL from baseURL, path, and query params
 */
function defaultValidateStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function defaultParamsSerializer(params: unknown): string {
  if (!params || typeof params !== "object") return "";

  const pairs: Array<[string, string]> = [];

  const add = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;
    if (value instanceof Date) {
      pairs.push([key, value.toISOString()]);
      return;
    }
    pairs.push([key, String(value)]);
  };

  const build = (prefix: string, value: unknown) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (isPlainObject(item)) {
          // Axios-ish: nested objects inside arrays get a [] hint.
          build(`${prefix}[]`, item);
        } else {
          add(prefix, item);
        }
      }
      return;
    }

    if (isPlainObject(value)) {
      for (const key of Object.keys(value).sort()) {
        build(prefix ? `${prefix}[${key}]` : key, value[key]);
      }
      return;
    }

    add(prefix, value);
  };

  build("", params);

  // URLSearchParams handles encoding; preserve order already made stable by sorting keys above.
  const sp = new URLSearchParams();
  for (const [k, v] of pairs) sp.append(k, v);
  return sp.toString();
}

function appendQueryString(url: string, qs: string): string {
  if (!qs) return url;
  const hashIndex = url.indexOf("#");
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";

  return base.includes("?") ? `${base}&${qs}${hash}` : `${base}?${qs}${hash}`;
}

function buildURL(
  baseURL: string,
  path: string,
  params: unknown,
  paramsSerializer?: (params: unknown) => string,
): string {
  // Remove trailing slash from baseURL
  const base = baseURL.replace(/\/$/, "");
  // Remove leading slash from path
  const cleanPath = path.replace(/^\//, "");
  // Combine them
  let url = `${base}/${cleanPath}`;

  // Add query params if they exist
  const serialize = paramsSerializer ?? defaultParamsSerializer;
  const qs = serialize(params);
  if (qs) {
    url = appendQueryString(url, qs);
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

  // Build full URL — guard against bare relative URLs in Node.js
  if (!mergedConfig.baseURL && !isAbsoluteHttpUrl(url)) {
    const error = new ApiError(
      `Invalid URL: "${url}" is a relative path but no baseURL is configured`,
      mergedConfig,
    );
    error.isNetworkError = true;
    throw error;
  }
  let fullURL: string;
  try {
    if (mergedConfig.baseURL && !isAbsoluteHttpUrl(url)) {
      fullURL = buildURL(
        mergedConfig.baseURL,
        url,
        mergedConfig.params,
        mergedConfig.paramsSerializer,
      );
    } else {
      const serialize = mergedConfig.paramsSerializer ?? defaultParamsSerializer;
      fullURL = appendQueryString(url, serialize(mergedConfig.params));
    }
  } catch (cause) {
    const error = new ApiError(`Failed to build request URL for "${url}"`, mergedConfig);
    error.cause = cause;
    throw error;
  }

  const globalFetch = (globalThis as any).fetch as typeof fetch | undefined;
  const fetchImpl = mergedConfig.fetch ?? globalFetch;
  if (typeof fetchImpl !== "function") {
    const error = new ApiError(
      `No fetch implementation available. Provide config.fetch or use a runtime with global fetch.`,
      mergedConfig,
    );
    error.isNetworkError = true;
    throw error;
  }

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
      try {
        body = JSON.stringify(data);
      } catch (err: any) {
        const error = new ApiError(
          `Failed to serialize request body: ${err.message}`,
          mergedConfig,
        );
        error.cause = err;
        throw error;
      }
    }
  }

  const retryAttempts = mergedConfig.retry?.attempts ?? 0;
  const retryBaseDelay = mergedConfig.retry?.baseDelay ?? 1000;
  const retryStatusCodes = mergedConfig.retry?.statusCodes ?? [429, 503, 408];

  let lastError: ApiError | undefined;

  for (let attempt = 0; attempt <= retryAttempts; attempt++) {

    // Fresh controller per attempt — a used/aborted signal can't be reused
    const controller = new AbortController();
    let abortedByTimeout = false;
    let localTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let onAbort: (() => void) | null = null;

    if (mergedConfig.signal?.aborted) {
      controller.abort(mergedConfig.signal.reason);
    } else if (mergedConfig.signal) {
      onAbort = () => controller.abort(mergedConfig.signal!.reason);
      mergedConfig.signal.addEventListener("abort", onAbort);
    }

    try {
      localTimeoutId = mergedConfig.timeout
        ? setTimeout(() => {
            abortedByTimeout = true;
            controller.abort("NANOFETCH_TIMEOUT");
          }, mergedConfig.timeout)
        : null;

      const response = await fetchImpl(fullURL, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      let responseData: any;
      const explicitType = mergedConfig.responseType;
      const contentType = response.headers.get("content-type") || "";
      const inferredType =
        /(^|;)\s*application\/json\s*(;|$)/i.test(contentType) || /\+json\b/i.test(contentType)
          ? "json"
          : "text";
      const responseType = explicitType ?? inferredType;

      if (responseType === "json") {
        const text = await response.text();
        try {
          responseData = text ? JSON.parse(text) : null;
        } catch (err: any) {
          const parseError = new ApiError(
            `Failed to parse response as JSON: ${err.message}`,
            mergedConfig,
          );
          parseError.isParseError = true;
          parseError.status = response.status;
          parseError.cause = err;
          throw parseError;
        }
      } else if (responseType === "text") {
        responseData = await response.text();
      } else if (responseType === "blob") {
        responseData = await response.blob();
      } else if (responseType === "arrayBuffer") {
        responseData = await response.arrayBuffer();
      }

      const apiResponse: ApiResponse<T> = {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config: mergedConfig,
        request: { url: fullURL, method },
      };

      const validateStatus = mergedConfig.validateStatus ?? defaultValidateStatus;
      let isValidStatus: boolean;
      try {
        isValidStatus = validateStatus(response.status);
      } catch (cause) {
        const error = new ApiError(
          `validateStatus threw while evaluating response status ${response.status}`,
          mergedConfig,
        );
        error.status = response.status;
        error.response = apiResponse;
        error.method = method;
        error.url = url;
        error.data = data;
        error.request = apiResponse.request;
        error.cause = cause;
        throw error;
      }

      if (!isValidStatus) {
        const error = new ApiError(
          `Request failed with status ${response.status}`,
          mergedConfig,
        );
        error.status = response.status;
        error.response = apiResponse;
        error.method = method;
        error.url = url;
        error.data = data;
        error.request = apiResponse.request;
        throw error;
      }

      return apiResponse;
    } catch (err: any) {
      let apiError: ApiError;
      if (err instanceof ApiError) {
        apiError = err;
      } else {
        apiError = new ApiError(err.message || "Request failed", mergedConfig);
        apiError.cause = err;
        if (err.name === "AbortError") {
          if (abortedByTimeout || controller.signal.reason === "NANOFETCH_TIMEOUT") {
            apiError.isTimeout = true;
            apiError.code = "ECONNABORTED";
            apiError.message = mergedConfig.timeout
              ? `timeout of ${mergedConfig.timeout}ms exceeded`
              : "Request timeout";
          } else {
            apiError.code = "ERR_CANCELED";
          }
        } else {
          apiError.isNetworkError = true;
        }
      }
      apiError.method = method;
      apiError.url = url;
      apiError.data = data;
      apiError.request = { url: fullURL, method };

      const isRetryable =
        !apiError.isTimeout &&
        apiError.code !== "ERR_CANCELED" &&
        (apiError.isNetworkError ||
          (apiError.status !== undefined && retryStatusCodes.includes(apiError.status)));

      lastError = apiError;

      if (!isRetryable || attempt === retryAttempts) {
        throw apiError;
      }

      // Exponential backoff with jitter — wait before next attempt
      const delay = Math.min(
        retryBaseDelay * 2 ** attempt + Math.random() * 500,
        30000,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    } finally {
      if (localTimeoutId) clearTimeout(localTimeoutId);
      if (onAbort && mergedConfig.signal) {
        mergedConfig.signal.removeEventListener("abort", onAbort);
      }
    }
  }

  throw lastError!;
}
