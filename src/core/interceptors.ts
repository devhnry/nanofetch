import { InterceptorHandler } from "../types";

/**
 * Manages a list of interceptors for a single lifecycle phase (request or response).
 * Callers add handlers with .use() and remove them by ID with .eject().
 */
export class InterceptorManager<T> {
  private handlers: (InterceptorHandler<T> | null)[] = [];

  /**
   * Add a new interceptor. Returns an ID you can pass to .eject() to remove it.
   */
  use(
    fulfilled: (value: T) => T | Promise<T>,
    rejected?: (error: any) => any,
  ): number {
    this.handlers.push({ fulfilled, rejected });
    return this.handlers.length - 1;
  }

  /**
   * Remove an interceptor by the ID returned from .use().
   * Sets the slot to null so existing IDs stay stable.
   */
  eject(id: number): void {
    if (this.handlers[id] !== undefined) {
      this.handlers[id] = null;
    }
  }

  /**
   * Iterate over active (non-ejected) handlers.
   */
  forEach(fn: (handler: InterceptorHandler<T>) => void): void {
    this.handlers.forEach((handler) => {
      if (handler !== null) fn(handler);
    });
  }
}
