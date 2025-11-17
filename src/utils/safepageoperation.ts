import { Page, Response, Locator } from '@playwright/test';

/**
 * Safe Page Operations Wrapper
 * 
 * This module provides wrappers for common page operations that handle
 * "Target page, context or browser has been closed" errors gracefully.
 * This is especially important in CI/Jenkins environments where resources
 * may be limited and contexts can close unexpectedly.
 */

interface SafePageOperationOptions {
  maxRetries?: number;
  retryDelay?: number;
}

interface SafeGotoOptions {
  retries?: number;
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  [key: string]: unknown;
}

interface WaitForSelectorOptions {
  timeout?: number;
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  [key: string]: unknown;
}

interface ClickOptions {
  timeout?: number;
  [key: string]: unknown;
}

interface FillOptions {
  timeout?: number;
  [key: string]: unknown;
}

/**
 * Safely execute a page operation with error handling for closed contexts
 */
export async function safePageOperation<T>(
  page: Page,
  operation: (page: Page) => Promise<T>,
  options: SafePageOperationOptions = {}
): Promise<T> {
  const { maxRetries = 1, retryDelay = 1000 } = options;

  if (!page) {
    throw new Error('Page is null or undefined');
  }

  // Check if page is closed before attempting operation
  if (page.isClosed()) {
    throw new Error('Cannot execute operation: page has been closed');
  }

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Double-check page is still open
      if (page.isClosed()) {
        throw new Error('Page was closed during operation');
      }

      // Execute the operation
      return await operation(page);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if error is due to closed context/browser
      const errorMessage = lastError.message || '';
      const isContextClosedError =
        errorMessage.includes('Target page, context or browser has been closed') ||
        errorMessage.includes('Browser has been closed') ||
        errorMessage.includes('Context has been closed') ||
        errorMessage.includes('page has been closed');

      if (isContextClosedError) {
        // If we have retries left, wait and retry
        if (attempt < maxRetries) {
          console.warn(`⚠️ Context closed error detected, retrying (attempt ${attempt + 1}/${maxRetries + 1})...`);
          // Use page.waitForTimeout if available, otherwise fallback to setTimeout
          try {
            if (!page.isClosed()) {
              await page.waitForTimeout(retryDelay * (attempt + 1));
            }
          } catch {
            // If page.waitForTimeout fails, the page is likely closed
            // Wait a bit using a small delay before retry
            await new Promise(resolve => setTimeout(resolve, Math.min(retryDelay * (attempt + 1), 5000)));
          }
          continue;
        } else {
          // No retries left, throw a more descriptive error
          throw new Error(`Operation failed: ${lastError.message}. Context was closed and max retries (${maxRetries + 1}) exceeded.`);
        }
      }

      // If it's not a context closure error, throw immediately
      throw lastError;
    }
  }

  throw lastError || new Error('Operation failed after all retries');
}

/**
 * Safely navigate to a URL with error handling and retry logic
 */
export async function safeGoto(
  page: Page,
  url: string,
  options: SafeGotoOptions = {}
): Promise<Response | null> {
  const { retries = 3, timeout = 30000, waitUntil = 'domcontentloaded', ...gotoOptions } = options;

  console.log(`🔄 Attempting navigation to: ${url}`);

  // Validate page state before navigation
  if (!page) {
    throw new Error('Cannot navigate: page is null or undefined');
  }

  if (page.isClosed()) {
    throw new Error('Cannot navigate: page has been closed');
  }

  // Check context state
  try {
    const context = page.context();
    if (!context) {
      throw new Error('Cannot navigate: context is null or undefined');
    }

    // Verify browser is still connected
    const browser = context.browser();
    if (browser && !browser.isConnected()) {
      throw new Error('Cannot navigate: browser is disconnected');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot navigate: context validation failed - ${errorMessage}`);
  }

  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`📍 Navigation attempt ${attempt}/${retries} to ${url}`);

      // Double-check page is still valid
      if (page.isClosed()) {
        throw new Error('Page was closed before navigation');
      }

      // Perform navigation
      const response = await page.goto(url, {
        waitUntil: waitUntil,
        timeout: timeout,
        ...gotoOptions
      } as Parameters<Page['goto']>[1]);

      console.log(`✅ Navigation successful to: ${url}`);
      return response;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message || '';

      // Check if error is due to closed context/browser
      const isContextClosedError =
        errorMessage.includes('Target page, context or browser has been closed') ||
        errorMessage.includes('Browser has been closed') ||
        errorMessage.includes('Context has been closed') ||
        errorMessage.includes('page has been closed');

      if (isContextClosedError) {
        console.warn(`⚠️ Context closed error on attempt ${attempt}/${retries}: ${errorMessage}`);

        if (attempt < retries) {
          const retryDelay = 1000 * attempt; // Exponential backoff
          console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
          try {
            if (!page.isClosed()) {
              await page.waitForTimeout(retryDelay);
            } else {
              await new Promise(resolve => setTimeout(resolve, Math.min(retryDelay, 5000)));
            }
          } catch {
            await new Promise(resolve => setTimeout(resolve, Math.min(retryDelay, 5000)));
          }
          continue;
        } else {
          throw new Error(`Navigation failed after ${retries} attempts: ${errorMessage}. Context was closed.`);
        }
      }

      // For other navigation errors, retry with backoff
      if (attempt < retries) {
        console.warn(`⚠️ Navigation attempt ${attempt} failed: ${errorMessage}`);
        const retryDelay = 1000 * attempt;
        console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
        try {
          if (!page.isClosed()) {
            await page.waitForTimeout(retryDelay);
          } else {
            await new Promise(resolve => setTimeout(resolve, Math.min(retryDelay, 5000)));
          }
        } catch {
          await new Promise(resolve => setTimeout(resolve, Math.min(retryDelay, 5000)));
        }
        continue;
      } else {
        throw new Error(`Navigation failed after ${retries} attempts: ${errorMessage}`);
      }
    }
  }

  throw lastError || new Error(`Navigation failed after ${retries} attempts`);
}

/**
 * Safely wait for a selector with error handling
 */
export async function safeWaitForSelector(
  page: Page,
  selector: string,
  options: WaitForSelectorOptions = {}
): Promise<Awaited<ReturnType<Page['waitForSelector']>>> {
  return safePageOperation(page, async (p) => {
    return await p.waitForSelector(selector, {
      timeout: options.timeout || 10000,
      state: options.state || 'visible',
      ...options
    } as Parameters<Page['waitForSelector']>[1]);
  }, { maxRetries: 1, retryDelay: 1000 });
}

/**
 * Safely click an element with error handling
 */
export async function safeClick(
  page: Page,
  selector: string,
  options: ClickOptions = {}
): Promise<void> {
  return safePageOperation(page, async (p) => {
    const element = p.locator(selector).first();
    await element.click({
      timeout: options.timeout || 10000,
      ...options
    } as Parameters<Locator['click']>[0]);
  }, { maxRetries: 1, retryDelay: 1000 });
}

/**
 * Safely fill an input field with error handling
 */
export async function safeFill(
  page: Page,
  selector: string,
  value: string,
  options: FillOptions = {}
): Promise<void> {
  return safePageOperation(page, async (p) => {
    const element = p.locator(selector).first();
    await element.fill(value, {
      timeout: options.timeout || 10000,
      ...options
    } as Parameters<Locator['fill']>[1]);
  }, { maxRetries: 1, retryDelay: 1000 });
}

/**
 * Check if page and context are still valid
 */
export function isPageValid(page: Page | null | undefined): boolean {
  if (!page) {
    return false;
  }

  try {
    if (page.isClosed()) {
      return false;
    }

    const context = page.context();
    if (!context) {
      return false;
    }

    // Try to access context properties to verify it's still open
    try {
      const browser = context.browser();
      if (browser && !browser.isConnected()) {
        return false;
      }
    } catch {
      // Browser might be null, which is okay
    }

    const pages = context.pages();
    return pages !== null && pages !== undefined;
  } catch {
    return false;
  }
}
