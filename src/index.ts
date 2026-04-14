// Export everything users need
export { ApiClient, createApiClient } from "./api";
export { ApiError } from "./types";
export type { ApiRequestConfig, ApiResponse, InterceptorHandler } from "./types";

// Create a default instance for convenience
import { createApiClient } from "./api";
export const api = createApiClient();
