import { BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { LoginPage } from '../pages/LoginPage';
import { ApiHelper, UserCredentials } from './apiHelper';

export class SessionManager {
  private static readonly STORAGE_STATE_PATH = path.join(process.cwd(), '.auth', 'user.json');
  private static readonly STORAGE_DIR = path.dirname(SessionManager.STORAGE_STATE_PATH);
  private static readonly CREDENTIALS_PATH = path.join(process.cwd(), '.auth', 'credentials.json');

  /**
   * Create authenticated session and save to file
   */
  static async createAuthenticatedSession(
    context: BrowserContext,
    credentials: UserCredentials
  ): Promise<void> {
    const page = await context.newPage();
    const loginPage = new LoginPage(page);

    try {
      // First, navigate to home page to check if already logged in
      await page.goto('https://conduit.bondaracademy.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      // Check if already logged in
      const isAlreadyLoggedIn = await loginPage.isLoggedIn();
      if (isAlreadyLoggedIn) {
        // Already authenticated, just save the state
        await context.storageState({ path: SessionManager.STORAGE_STATE_PATH });
        return;
      }
      
      // Not logged in, proceed with login
      await page.goto('https://conduit.bondaracademy.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Wait for page to be ready
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(2000);
      
      // Check current URL to ensure we're on login page
      const currentUrl = page.url();
      if (!currentUrl.includes('/login')) {
        // If redirected (maybe already logged in), check again
        const isLoggedInNow = await loginPage.isLoggedIn();
        if (isLoggedInNow) {
          await context.storageState({ path: SessionManager.STORAGE_STATE_PATH });
          return;
        }
        // If not logged in and not on login page, navigate to login
        await page.goto('https://conduit.bondaracademy.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
      }
      
      // Wait for login form to be ready - use locator instead of waitForSelector for better compatibility
      const emailInput = page.locator('input[formcontrolname="email"], input[type="email"], input[placeholder="Email"]').first();
      
      // Wait for email input with retry logic
      try {
        await emailInput.waitFor({ state: 'visible', timeout: 15000 });
      } catch (error) {
        // If email input not found, check if we're already logged in (redirected)
        const isLoggedInCheck = await loginPage.isLoggedIn();
        if (isLoggedInCheck) {
          await context.storageState({ path: SessionManager.STORAGE_STATE_PATH });
          return;
        }
        // If still not logged in and form not visible, throw error
        throw new Error(`Login form not found. Current URL: ${page.url()}. Error: ${error}`);
      }
      
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
        // If networkidle times out, continue anyway
      });
      await page.waitForTimeout(1000);
      
      await loginPage.login(credentials.email, credentials.password);

      // Wait for successful login - check if we're redirected
      await page.waitForTimeout(3000);
      
      // Navigate to home to verify login
      await page.goto('https://conduit.bondaracademy.com', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      // Verify login was successful
      const isLoggedIn = await loginPage.isLoggedIn();
      if (!isLoggedIn) {
        // Check if there's an error message
        const errorMsg = await loginPage.getErrorMessage();
        throw new Error(`Login failed - user not authenticated. ${errorMsg ? `Error: ${errorMsg}` : ''}`);
      }

      // Save authenticated state
      await context.storageState({ path: SessionManager.STORAGE_STATE_PATH });
    } finally {
      await page.close();
    }
  }

  /**
   * Create authenticated session using API and save to file
   */
  static async createAuthenticatedSessionViaAPI(
    context: BrowserContext,
    apiHelper: ApiHelper,
    credentials: UserCredentials
  ): Promise<void> {
    // Authenticate via API
    const loginResponse = await apiHelper.login(credentials);
    const token = apiHelper.getAuthToken();
    const userData = loginResponse?.user; // Get user data from login response

    if (!token) {
      throw new Error('Failed to obtain authentication token');
    }

    // Create a page and set the token in localStorage/cookies
    const page = await context.newPage();
    
    try {
      await page.goto('https://conduit.bondaracademy.com');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Set authentication token and user data in localStorage
      // Angular apps typically store the full user object
      await page.evaluate(({ token, user }: { token: string | null; user: Record<string, unknown> | null }) => {
        // Browser context - localStorage and sessionStorage are available
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storage = (globalThis as any).localStorage;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = (globalThis as any).sessionStorage;
        
        if (token && storage) {
          storage.setItem('token', token);
        }
        if (user && storage) {
          storage.setItem('user', JSON.stringify(user));
        }
        // Also try setting in sessionStorage
        if (token && session) {
          session.setItem('token', token);
        }
        if (user && session) {
          session.setItem('user', JSON.stringify(user));
        }
      }, { 
        token, 
        user: userData || { token } 
      });

      // Reload page to apply authentication
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Wait a bit for Angular to process the auth state
      await page.waitForTimeout(2000);

      // Save authenticated state (this captures cookies and localStorage)
      await context.storageState({ path: SessionManager.STORAGE_STATE_PATH });
    } finally {
      await page.close();
    }
  }

  /**
   * Check if storage state file exists
   */
  static storageStateExists(): boolean {
    return fs.existsSync(SessionManager.STORAGE_STATE_PATH);
  }

  /**
   * Get storage state path
   */
  static getStorageStatePath(): string {
    return SessionManager.STORAGE_STATE_PATH;
  }

  /**
   * Delete storage state file
   */
  static deleteStorageState(): void {
    if (fs.existsSync(SessionManager.STORAGE_STATE_PATH)) {
      fs.unlinkSync(SessionManager.STORAGE_STATE_PATH);
    }
    SessionManager.deleteStoredCredentials();
  }

  /**
   * Ensure storage directory exists
   */
  static ensureStorageDirectory(): void {
    if (!fs.existsSync(SessionManager.STORAGE_DIR)) {
      fs.mkdirSync(SessionManager.STORAGE_DIR, { recursive: true });
    }
  }

  /**
   * Persist credentials for re-use across test runs
   */
  static saveCredentials(credentials: UserCredentials): void {
    SessionManager.ensureStorageDirectory();
    fs.writeFileSync(SessionManager.CREDENTIALS_PATH, JSON.stringify(credentials, null, 2));
  }

  /**
   * Load credentials saved by bootstrap script
   */
  static getStoredCredentials(): UserCredentials | null {
    if (!fs.existsSync(SessionManager.CREDENTIALS_PATH)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(SessionManager.CREDENTIALS_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<UserCredentials>;
      if (parsed.email && parsed.password) {
        return {
          email: parsed.email,
          password: parsed.password,
        };
      }
    } catch (error) {
      console.warn('⚠️  Failed to read stored credentials:', error);
    }

    return null;
  }

  /**
   * Remove stored credential file
   */
  static deleteStoredCredentials(): void {
    if (fs.existsSync(SessionManager.CREDENTIALS_PATH)) {
      fs.unlinkSync(SessionManager.CREDENTIALS_PATH);
    }
  }

  /**
   * Path to saved credentials
   */
  static getCredentialsPath(): string {
    return SessionManager.CREDENTIALS_PATH;
  }
}

