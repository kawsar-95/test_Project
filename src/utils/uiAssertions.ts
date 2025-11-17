import { Page, Locator, expect } from '@playwright/test';

export class UIAssertions {
  /**
   * Asserts that a form input is ready for interaction
   * @param locator - The locator for the form input element
   * @param name - The name/description of the input for error messages
   */
  static async assertFormInputReady(locator: Locator, name: string): Promise<void> {
    await expect(locator).toBeVisible({ timeout: 10000 });
    await expect(locator).toBeEnabled({ timeout: 5000 });
  }

  /**
   * Asserts that a form field has the expected value
   * @param locator - The locator for the form field element
   * @param expectedValue - The expected value in the field
   * @param fieldName - The name/description of the field for error messages
   */
  static async assertFormFieldValue(locator: Locator, expectedValue: string, fieldName: string): Promise<void> {
    const actualValue = await locator.inputValue();
    expect(actualValue).toBe(expectedValue);
  }

  /**
   * Asserts that a button is ready for interaction
   * @param locator - The locator for the button element
   * @param name - The name/description of the button for error messages
   */
  static async assertButtonReady(locator: Locator, name: string): Promise<void> {
    await expect(locator).toBeVisible({ timeout: 10000 });
    await expect(locator).toBeEnabled({ timeout: 5000 });
  }

  /**
   * Asserts that page navigation occurred based on a condition
   * @param page - The Playwright page object
   * @param condition - A function that checks if the URL matches the expected navigation (receives URL string or URL object)
   * @param timeout - Maximum time to wait for navigation (default: 10000ms)
   */
  static async assertPageNavigation(
    page: Page,
    condition: string | RegExp | ((url: URL | string) => boolean),
    timeout: number = 10000
  ): Promise<void> {
    await page.waitForURL(condition as any, { timeout });
  }

  /**
   * Asserts that an error message is displayed on the page
   * @param page - The Playwright page object
   * @param errorMessageLocator - The locator for the error message element
   */
  static async assertErrorMessage(page: Page, errorMessageLocator: Locator): Promise<void> {
    await expect(errorMessageLocator).toBeVisible({ timeout: 5000 });
    const errorText = await errorMessageLocator.textContent();
    expect(errorText).toBeTruthy();
    expect(errorText?.trim().length).toBeGreaterThan(0);
  }
}

