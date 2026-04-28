# nanofetch

> Nano-sized, type-safe HTTP client. Axios-like API, zero dependencies, powered by native fetch.

[![npm version](https://img.shields.io/npm/v/@hnrie/nanofetch.svg)](https://www.npmjs.com/package/@hnrie/nanofetch)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Why nanofetch?

-  **Lightweight** - ~5KB package size, zero dependencies
-  **Zero dependencies** - No supply chain vulnerabilities
-  **Axios-compatible API** - Easy migration from Axios
-  **TypeScript first** - Full type safety and autocomplete
-  **Universal** - Works in browsers, Node.js, and React Native
-  **Modern** - Built on native fetch API

## Installation
```bash
npm install @hnrie/nanofetch
```

## Quick Start
```typescript
import { api } from '@hnrie/nanofetch';

// GET request
const response = await api.get('https://api.example.com/users');
console.log(response.data);

// POST request
await api.post('https://api.example.com/users', {
  name: 'John Doe',
  email: 'john@example.com'
});
```

## Usage

### Basic Requests
```typescript
import { api } from '@hnrie/nanofetch';

// GET
const users = await api.get('/users');

// POST
const newUser = await api.post('/users', { name: 'Jane' });

// PUT
const updated = await api.put('/users/1', { name: 'Jane Doe' });

// PATCH
const patched = await api.patch('/users/1', { email: 'jane@new.com' });

// DELETE
await api.delete('/users/1');
```

### Query Parameters
```typescript
const response = await api.get('/users', {
  params: {
    page: 1,
    limit: 10,
    sort: 'name'
  }
});
// Requests: /users?page=1&limit=10&sort=name
```

### Custom Headers
```typescript
const response = await api.get('/protected', {
  headers: {
    'Authorization': 'Bearer your-token-here',
    'X-Custom-Header': 'value'
  }
});
```

### Request Timeout
```typescript
const response = await api.get('/slow-endpoint', {
  timeout: 5000 // 5 seconds
});
```

### Creating Custom Instances
```typescript
import { createApiClient } from '@hnrie/nanofetch';

const api = createApiClient({
  baseURL: 'https://api.example.com',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

// Now all requests use the baseURL
await api.get('/users'); // -> https://api.example.com/users
await api.post('/posts', data); // -> https://api.example.com/posts
```

### TypeScript Support
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Response is fully typed
const response = await api.get<User[]>('/users');
response.data.forEach(user => {
  console.log(user.name); // Full autocomplete!
});
```

### Error Handling
```typescript
import { api, ApiError } from '@hnrie/nanofetch';

try {
  const response = await api.get('/users');
} catch (error) {
  if (error instanceof ApiError) {
    console.log('Status:', error.status);
    console.log('Response:', error.response?.data);
    
    if (error.isNetworkError) {
      console.log('Network error - check your connection');
    }
    
    if (error.isTimeout) {
      console.log('Request timed out');
    }
  }
}
```

### Interceptors

Interceptors let you hook into requests before they are sent, and responses before they are returned to your code.

**Request interceptor** — runs before every fetch (e.g. inject auth headers):
```typescript
import { createApiClient } from '@hnrie/nanofetch';

const api = createApiClient({ baseURL: 'https://api.example.com' });

const id = api.interceptors.request.use((config) => {
  config.headers = {
    ...config.headers,
    'Authorization': `Bearer ${getToken()}`,
  };
  return config;
});

// Remove it later (e.g. on component unmount)
api.interceptors.request.eject(id);
```

**Response interceptor** — runs after every response (e.g. token refresh on 401):
```typescript
import { ApiError } from '@hnrie/nanofetch';

api.interceptors.response.use(
  (response) => response, // success path — return response as-is or transform it
  async (error) => {      // error path — handle or re-throw
    if (error instanceof ApiError && error.status === 401) {
      const newToken = await refreshToken();

      // Patch the new token into the original request config
      error.config!.headers = {
        ...error.config?.headers,
        Authorization: `Bearer ${newToken}`,
      };

      // Transparently replay the original request (any method, with original body)
      return api.replay(error);
    }
    throw error;
  }
);
```

**Multiple interceptors** run in the order they were added. Each one receives the output of the previous one, so changes accumulate through the chain.

### Retry with Exponential Backoff

Automatically retry failed requests with increasing delays between attempts:

```typescript
const api = createApiClient({
  baseURL: 'https://api.example.com',
  retry: {
    attempts: 3,                    // max retries (not counting first attempt)
    baseDelay: 1000,                // 1s base — doubles each retry + jitter
    statusCodes: [429, 503, 408],   // which status codes to retry on
  }
});

// If the server returns 503, nanofetch retries up to 3 times:
// attempt 1 → fail → wait ~1s
// attempt 2 → fail → wait ~2s
// attempt 3 → fail → wait ~4s
// attempt 4 → fail → throw ApiError
const response = await api.get('/users');
```

Retries only apply to transient errors — `404`, `401`, and parse errors are thrown immediately without retrying. Timeouts also do not retry. Delays are capped at 30 seconds.

## API Reference

### Request Config
```typescript
interface ApiRequestConfig {
  baseURL?: string;           // Base URL for requests
  params?: Record<string, any>; // Query parameters (arrays supported)
  paramsSerializer?: (params: unknown) => string; // Custom query string serializer
  headers?: Record<string, string>; // Custom headers
  timeout?: number;           // Request timeout in milliseconds
  signal?: AbortSignal;       // For manual cancellation
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer'; // Response type override
  fetch?: typeof fetch;       // Inject a custom fetch (tests / custom runtimes)
  validateStatus?: (status: number) => boolean; // Defaults to 200–299
  retry?: {
    attempts?: number;        // Max retries, default 0
    baseDelay?: number;       // Base delay in ms, default 1000
    statusCodes?: number[];   // Status codes to retry, default [429, 503, 408]
  };
}
```

### Response Object
```typescript
interface ApiResponse<T> {
  data: T;                    // Response data
  status: number;             // HTTP status code
  statusText: string;         // HTTP status text
  headers: Headers;           // Response headers
  config: ApiRequestConfig;   // Request config used
  request?: any;              // Opaque request info (Axios-like)
}
```

### Error Object
```typescript
class ApiError extends Error {
  status?: number;            // HTTP status code
  response?: ApiResponse;     // Full response object
  config?: ApiRequestConfig;  // Request config used
  code?: string;              // Axios-like error code (e.g. ECONNABORTED, ERR_CANCELED)
  request?: any;              // Opaque request info (Axios-like)
  cause?: unknown;            // Original error, if available
  method?: string;            // HTTP method of the failed request
  url?: string;               // URL of the failed request
  data?: any;                 // Original request body (pre-serialization)
  isNetworkError: boolean;    // True if network failure
  isTimeout: boolean;         // True if request timed out
  isParseError: boolean;      // True if response JSON was malformed
}
```

Helpers:

```typescript
import { isApiError, isCancel } from '@hnrie/nanofetch';

try {
  await api.get('/slow', { timeout: 10 });
} catch (e) {
  if (isCancel(e)) {
    // user abort via AbortController
  }
  if (isApiError(e) && e.code === 'ECONNABORTED') {
    // timeout
  }
}
```

### `client.replay(error)`

Re-fires the exact request that produced an `ApiError` — same method, URL, body, and config. Designed for use inside response interceptors after token refresh or other recovery logic.

```typescript
// Patch recovery state onto error.config, then replay
error.config!.headers = { ...error.config?.headers, Authorization: `Bearer ${newToken}` };
const response = await client.replay(error);
```

Throws an `ApiError` if `method` or `url` is missing from the error (e.g. the error did not originate from a nanofetch request).

## Migrating from Axios

nanofetch uses the same API as Axios for common operations:
```typescript
// Axios
import axios from 'axios';
const response = await axios.get('/users', { params: { page: 1 } });

// @hnrie/nanofetch - identical!
import { api } from '@hnrie/nanofetch';
const response = await api.get('/users', { params: { page: 1 } });
```

### Key Differences

- **No request cancellation tokens** - Use native `AbortController` instead (`ApiError.code === "ERR_CANCELED"` for cancels)

## Roadmap

- [x] Core HTTP methods (GET, POST, PUT, PATCH, DELETE)
- [x] Query parameters
- [x] Custom headers
- [x] Timeout support
- [x] TypeScript support
- [x] Request/response interceptors
- [x] Retry logic with exponential backoff
- [x] Transparent request replay via `client.replay(error)`
- [ ] Progress events for uploads/downloads
- [ ] Request deduplication

## License

MIT © [Henry Taiwo](https://github.com/devhnry)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Built by [Henry Taiwo](https://github.com/devhnry) - Full-stack engineer building tools for developers.

