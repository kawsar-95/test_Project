import { test as base, Page } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { SignupPage } from '../pages/SignupPage';
import { ApiHelper, UserCredentials } from '../utils/apiHelper';
import { TEST_CREDENTIALS } from '../utils/constants';
import { SessionManager } from '../utils/sessionManager';
import { TestDataGenerator } from '../utils/testDataGenerator';

type AuthFixtures = {
  authenticatedPage: Page;
  apiHelper: ApiHelper;
  testCredentials: UserCredentials;
};

const CONDUIT_BASE_URL = 'https://conduit.bondaracademy.com';
const isCI = process.env.CI === 'true';
const skipApiBootstrap = process.env.SKIP_API_BOOTSTRAP === 'true';
const useApiBootstrap = !isCI && !skipApiBootstrap;

export const test = base.extend<AuthFixtures>({
  // API Helper fixture
  apiHelper: async ({ request }, use) => {
    const apiHelper = new ApiHelper(request);
    await use(apiHelper);
  },

  // Test credentials fixture - creates new user via signup if needed
  testCredentials: async ({ browser }, use) => {
    SessionManager.ensureStorageDirectory();
    const storedCredentials = SessionManager.getStoredCredentials();
    const forceNewUser = process.env.FORCE_NEW_USER === 'true';
    const useExistingFlag = process.env.USE_EXISTING_CREDENTIALS === 'true';

    let credentials: UserCredentials;

    if (storedCredentials && !forceNewUser) {
      credentials = storedCredentials;
    } else if (useExistingFlag) {
      credentials = {
        email: TEST_CREDENTIALS.VALID_EMAIL,
        password: TEST_CREDENTIALS.VALID_PASSWORD,
      };
    } else {
      // Generate new user and sign up
      const signupData = TestDataGenerator.generateSignupData();
      credentials = {
        email: signupData.email,
        password: signupData.password,
      };

      // Sign up the new user
      let context = await browser.newContext();
      let page = await context.newPage();
      let signupPage = new SignupPage(page);

      let signupRetries = 0;
      const maxSignupRetries = 3;
      let signupSuccess = false;

      while (!signupSuccess && signupRetries < maxSignupRetries) {
        try {
          // Ensure page is not closed before operations
          if (page.isClosed()) {
            await context.close().catch(() => { });
            context = await browser.newContext();
            page = await context.newPage();
            signupPage = new SignupPage(page);
          }

          await page.goto('https://conduit.bondaracademy.com/register', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => { });
          await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => { });

          // Safe wait - check if page is closed
          try {
            if (!page.isClosed()) {
              await page.waitForTimeout(1000);
            }
          } catch (waitError) {
            // Page might be closed, recreate
            await context.close().catch(() => { });
            context = await browser.newContext();
            page = await context.newPage();
            signupPage = new SignupPage(page);
          }

          await signupPage.signUp(signupData.username, signupData.email, signupData.password);

          // Wait a bit for account to be fully created
          try {
            if (!page.isClosed()) {
              await page.waitForTimeout(3000);
            }
          } catch (waitError) {
            // Ignore wait errors after signup
          }
          console.log(`Created new test user: ${signupData.email}`);
          signupSuccess = true;
        } catch (error) {
          signupRetries++;
          console.warn(`Signup attempt ${signupRetries} failed:`, error);
          if (signupRetries < maxSignupRetries) {
            // Safe wait with page validation
            try {
              if (!page.isClosed()) {
                await page.waitForTimeout(2000 * signupRetries); // Exponential backoff
              } else {
                // Page is closed, recreate
                await context.close().catch(() => { });
                context = await browser.newContext();
                page = await context.newPage();
                signupPage = new SignupPage(page);
              }
            } catch (waitError) {
              // If wait fails, recreate context/page
              await context.close().catch(() => { });
              context = await browser.newContext();
              page = await context.newPage();
              signupPage = new SignupPage(page);
            }
          } else {
            console.warn('Failed to create new user via signup after retries, using existing credentials');
            // Fallback to existing credentials
            credentials = {
              email: TEST_CREDENTIALS.VALID_EMAIL,
              password: TEST_CREDENTIALS.VALID_PASSWORD,
            };
          }
        }
      }

      await context.close().catch(() => { });
      SessionManager.saveCredentials(credentials);
    }

    await use(credentials);
  },

  // Authenticated page fixture
  authenticatedPage: async ({ browser, apiHelper, testCredentials }, use) => {
    SessionManager.ensureStorageDirectory();

    const bootstrapStorageState = async () => {
      let bootstrapContext = await browser.newContext();
      try {
        if (useApiBootstrap) {
          await SessionManager.createAuthenticatedSessionViaAPI(
            bootstrapContext,
            apiHelper,
            testCredentials
          );
        } else {
          await SessionManager.createAuthenticatedSession(
            bootstrapContext,
            testCredentials
          );
        }
      } catch (error) {
        if (useApiBootstrap) {
          console.warn('API session creation failed, falling back to UI login...', error);
          await bootstrapContext.close().catch(() => { });
          bootstrapContext = await browser.newContext();
          await SessionManager.createAuthenticatedSession(
            bootstrapContext,
            testCredentials
          );
        } else {
          throw error;
        }
      } finally {
        await bootstrapContext.close().catch(() => { });
      }
    };

    const ensureStorageState = async () => {
      const forceRefresh = process.env.REFRESH_STORAGE_STATE === 'true';
      if (!SessionManager.storageStateExists() || forceRefresh) {
        if (forceRefresh) {
          SessionManager.deleteStorageState();
        }
        await bootstrapStorageState();
      }
    };

    const createContextWithState = async () => {
      return browser.newContext({
        storageState: SessionManager.storageStateExists()
          ? SessionManager.getStorageStatePath()
          : undefined,
      });
    };

    await ensureStorageState();

    let context = await createContextWithState();
    let page = await context.newPage();

    const verifyAuthentication = async () => {
      const maxAttempts = 2;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const loginPage = new LoginPage(page);

        await page.goto(CONDUIT_BASE_URL, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        }).catch(() => { });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });

        const loggedIn = await loginPage.isLoggedIn().catch(() => false);

        if (loggedIn) {
          return;
        }

        const refreshMode = useApiBootstrap ? 'API' : 'UI';
        console.warn(`Stored session is invalid (attempt ${attempt}), recreating via ${refreshMode} login...`);
        await context.close().catch(() => { });
        SessionManager.deleteStorageState();
        await ensureStorageState();

        context = await createContextWithState();
        page = await context.newPage();
      }

      throw new Error('Failed to verify authenticated session after refreshing storage state.');
    };

    await verifyAuthentication();

    await use(page);

    await context.close().catch(() => { });
  },
});

export { expect } from '@playwright/test';

