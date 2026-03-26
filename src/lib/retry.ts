/**
 * Retry utility with exponential backoff for transient AI API errors.
 * Only retries on rate-limit (429), network, and server errors (502/503).
 */

const RETRYABLE_PATTERNS = [
  "rate limit",
  "429",
  "network",
  "timeout",
  "econnrefused",
  "econnreset",
  "503",
  "502",
  "fetch failed",
];

function isRetryableError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();
  return RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  baseDelay = 1000,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
