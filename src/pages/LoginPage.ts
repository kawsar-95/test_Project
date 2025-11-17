import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { UIAssertions } from '../utils/uiAssertions';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    // Use formcontrolname for Angular forms, with fallback to type
    this.emailInput = page.locator('input[formcontrolname="email"], input[type="email"], input[placeholder="Email"]');
    this.passwordInput = page.locator('input[formcontrolname="password"], input[type="password"]');
    this.signInButton = page.locator('button:has-text("Sign in"), button.btn-primary');
    this.errorMessage = page.locator('.error-messages');
  }

  async login(email: string, password: string): Promise<void> {
    try {
      if (!email || email.trim().length === 0) {
        throw new Error('Email is required for login');
      }
      if (!password || password.trim().length === 0) {
        throw new Error('Password is required for login');
      }

      // UI Assertion: Verify form inputs are ready
      await UIAssertions.assertFormInputReady(this.emailInput, 'Email input');
      await UIAssertions.assertFormInputReady(this.passwordInput, 'Password input');
      
      await this.emailInput.fill(email);
      await this.page.waitForTimeout(300);
      await UIAssertions.assertFormFieldValue(this.emailInput, email, 'Email');
      
      await this.passwordInput.fill(password);
      await this.page.waitForTimeout(300);
      
      // Wait for button to be enabled (Angular forms disable button until valid)
      await this.signInButton.waitFor({ state: 'visible', timeout: 15000 });
      await this.page.waitForTimeout(500);
      
      // UI Assertion: Verify button is ready
      await UIAssertions.assertButtonReady(this.signInButton, 'Sign in button');
      
      // Wait for Angular form validation to enable the button
      let attempts = 0;
      while (await this.signInButton.isDisabled() && attempts < 20) {
        await this.page.waitForTimeout(300);
        attempts++;
      }
      await this.page.waitForTimeout(500);
      
      // Click the sign in button
      await this.signInButton.click();
      
      // Wait for navigation away from login page (successful login redirects)
      try {
        await this.page.waitForURL((url) => !url.toString().includes('/login'), { timeout: 10000 });
        
        // UI Assertion: Verify navigation away from login page
        await UIAssertions.assertPageNavigation(this.page, (url) => !url.toString().includes('/login'), 10000);
        
        await this.page.waitForLoadState('networkidle');
        console.log('✅ Login successful');
      } catch {
        // If still on login page, check for error message
        const errorMsg = await this.getErrorMessage();
        if (errorMsg) {
          // UI Assertion: Verify error message is displayed
          await UIAssertions.assertErrorMessage(this.page, this.errorMessage);
          throw new Error(`Login failed: ${errorMsg}`);
        }
        throw new Error('Login failed - still on login page');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Login failed: ${error}`);
    }
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      // Check if user is logged in by looking for:
      // 1. User profile link in navigation
      // 2. Settings link (only visible when logged in)
      // 3. New Article link (only visible when logged in)
      // 4. Absence of Sign in/Sign up links
      const userProfile = this.page.locator('a[href*="/profile/"]');
      const settingsLink = this.page.locator('a[href*="/settings"]');
      const newArticleLink = this.page.locator('a[href*="/editor"]');
      const signInLink = this.page.locator('a[href="/login"]');
      
      // Wait a bit for page to load
      await this.page.waitForTimeout(1000);
      
      // Check if logged in indicators exist
      const hasProfile = await userProfile.isVisible({ timeout: 3000 }).catch(() => false);
      const hasSettings = await settingsLink.isVisible({ timeout: 3000 }).catch(() => false);
      const hasNewArticle = await newArticleLink.isVisible({ timeout: 3000 }).catch(() => false);
      const hasSignIn = await signInLink.isVisible({ timeout: 3000 }).catch(() => false);
      
      // If we see profile/settings/new article, or don't see sign in, we're logged in
      return (hasProfile || hasSettings || hasNewArticle) && !hasSignIn;
    } catch {
      return false;
    }
  }

  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() || '';
  }
}


