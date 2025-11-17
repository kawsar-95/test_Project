import { chromium } from '@playwright/test';
import path from 'path';
import * as fs from 'fs';
import { SignupPage } from '../src/pages/SignupPage';
import { TestDataGenerator } from '../src/utils/testDataGenerator';
import { SessionManager } from '../src/utils/sessionManager';

const DEFAULT_BASE_URL = 'https://conduit.bondaracademy.com';

const getBaseUrl = (): string => {
  const envUrl = process.env.BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  return DEFAULT_BASE_URL;
};

async function bootstrapUser(): Promise<void> {
  SessionManager.ensureStorageDirectory();
  const forceBootstrap = process.env.FORCE_BOOTSTRAP === 'true';
  const existingState = SessionManager.storageStateExists();
  const storedCredentials = SessionManager.getStoredCredentials();

  if (existingState && storedCredentials && !forceBootstrap) {
    console.log('ℹ️  Existing authentication state detected. Use FORCE_BOOTSTRAP=true to recreate.');
    return;
  }

  if (forceBootstrap) {
    SessionManager.deleteStorageState();
  }

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const signupPage = new SignupPage(page);
    const signupData = TestDataGenerator.generateSignupData();
    const baseUrl = getBaseUrl();

    await page.goto(`${baseUrl}/register`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });

    await signupPage.signUp(signupData.username, signupData.email, signupData.password);
    await page.waitForTimeout(3000);

    await context.storageState({ path: SessionManager.getStorageStatePath() });
    SessionManager.saveCredentials({
      email: signupData.email,
      password: signupData.password,
    });

    fs.writeFileSync(
      path.join(process.cwd(), '.auth', 'metadata.json'),
      JSON.stringify(
        {
          username: signupData.username,
          email: signupData.email,
          generatedAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    console.log(`✅ Bootstrapped reusable test user: ${signupData.email}`);
  } finally {
    await browser.close();
  }
}

bootstrapUser().catch((error) => {
  console.error('❌ Failed to bootstrap test user:', error);
  process.exit(1);
});



