import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SignupPage extends BasePage {
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signUpButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    // Use formcontrolname for Angular forms, with fallback to placeholder
    this.usernameInput = page.locator('input[formcontrolname="username"], input[placeholder*="Username"], input[placeholder*="username"]');
    this.emailInput = page.locator('input[formcontrolname="email"], input[type="email"], input[placeholder="Email"]');
    this.passwordInput = page.locator('input[formcontrolname="password"], input[type="password"]');
    this.signUpButton = page.locator('button:has-text("Sign up"), button.btn-primary');
    this.errorMessage = page.locator('.error-messages');
  }

  async signUp(username: string, email: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);

    // Wait for button to be enabled (Angular forms disable button until valid)
    await this.signUpButton.waitFor({ state: 'visible' });

    // Wait for Angular form validation to enable the button
    let attempts = 0;
    while (await this.signUpButton.isDisabled() && attempts < 10) {
      await this.page.waitForTimeout(200);
      attempts++;
    }

    // Click the sign up button
    await this.signUpButton.click();

    // Wait for navigation away from signup page (successful signup redirects)
    try {
      await this.page.waitForURL((url) => !url.toString().includes('/register'), { timeout: 10000 });
    } catch {
      // If still on signup page, check for error message
      const errorMsg = await this.getErrorMessage();
      if (errorMsg) {
        throw new Error(`Signup failed: ${errorMsg}`);
      }
    }

    await this.page.waitForLoadState('networkidle');
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }
}

