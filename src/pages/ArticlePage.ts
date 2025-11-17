import { Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ArticlePage extends BasePage {
  readonly titleInput: Locator;
  readonly descriptionInput: Locator;
  readonly bodyInput: Locator;
  readonly tagsInput: Locator;
  readonly publishButton: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly articleTitle: Locator;
  readonly articleBody: Locator;
  readonly articleTags: Locator;
  readonly articleAuthor: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    super(page);
    // Editor page elements
    this.titleInput = page.locator('input[placeholder*="Article Title"], input[formcontrolname="title"]');
    this.descriptionInput = page.locator('input[placeholder*="What\'s this article about?"], input[formcontrolname="description"]');
    this.bodyInput = page.locator('textarea[placeholder*="Write your article"], textarea[formcontrolname="body"]');
    this.tagsInput = page.locator('input[placeholder*="Enter tags"], input[formcontrolname="tagList"]');
    this.publishButton = page.locator('button:has-text("Publish Article"), button[type="submit"]');

    // Article view page elements
    this.editButton = page.locator('a:has-text("Edit Article"), a:has-text("Edit"), button:has-text("Edit Article"), button:has-text("Edit")');
    this.deleteButton = page.locator('button:has-text("Delete Article"), button.btn-outline-danger, button:has-text("Delete")');
    this.articleTitle = page.locator('h1');
    this.articleBody = page.locator('.article-content p, .article-content, .article-body, [class*="article"] p').first();
    this.articleTags = page.locator('.tag-list .tag-pill, .tag-default');
    this.articleAuthor = page.locator('.article-meta .author, .author');
    this.successMessage = page.locator('.alert-success, .success-message');
    this.errorMessage = page.locator('.error-messages, .alert-danger');
  }

  async createArticle(title: string, description: string, body: string, tags: string[]): Promise<void> {
    // Wait for page to be fully loaded first
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => { });
    await this.page.waitForTimeout(500);

    // Wait for form inputs to be ready
    await this.titleInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.descriptionInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.bodyInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.tagsInput.waitFor({ state: 'visible', timeout: 15000 });

    // Wait for inputs to be enabled
    await this.titleInput.waitFor({ state: 'attached', timeout: 10000 });
    await this.page.waitForTimeout(300);

    // Clear and fill title
    await this.titleInput.clear();
    await this.page.waitForTimeout(200);
    await this.titleInput.fill(title);
    await this.page.waitForTimeout(300);

    // Clear and fill description
    await this.descriptionInput.clear();
    await this.page.waitForTimeout(200);
    await this.descriptionInput.fill(description);
    await this.page.waitForTimeout(300);

    // Clear and fill body
    await this.bodyInput.clear();
    await this.page.waitForTimeout(200);
    await this.bodyInput.fill(body);
    await this.page.waitForTimeout(500);

    // Add tags one by one
    for (const tag of tags) {
      await this.tagsInput.clear();
      await this.page.waitForTimeout(200);
      await this.tagsInput.fill(tag);
      await this.page.waitForTimeout(200);
      await this.tagsInput.press('Enter');
      // Wait for tag to appear in the tag list
      await this.page.waitForTimeout(500);
    }

    // Wait for publish button to be enabled and visible
    await this.publishButton.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(500);

    // Wait for button to be enabled (Angular forms may disable until valid)
    let attempts = 0;
    while (await this.publishButton.isDisabled() && attempts < 30) {
      await this.page.waitForTimeout(300);
      attempts++;
    }

    // Additional wait for form validation
    await this.page.waitForTimeout(500);

    // Verify button is enabled before clicking
    const isDisabled = await this.publishButton.isDisabled();
    if (isDisabled) {
      throw new Error('Publish button is disabled - form validation may have failed');
    }

    // Click publish button and wait for navigation
    await Promise.all([
      this.page.waitForURL(/.*\/article\/.*/, { timeout: 30000 }),
      this.publishButton.click()
    ]).catch(async (error) => {
      // If navigation doesn't happen, check for errors
      await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
      await this.page.waitForTimeout(2000);
      const currentUrl = this.page.url();

      // Check for error messages
      const errorMsg = await this.getErrorMessage();
      if (errorMsg) {
        throw new Error(`Article creation failed with error: ${errorMsg}`);
      }

      if (!currentUrl.includes('/article/')) {
        throw new Error(`Article creation failed - still on editor page: ${currentUrl}. Original error: ${error}`);
      }
    });

    // Wait for article page to fully load
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
    await this.page.waitForTimeout(1000);
    await this.articleTitle.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(500);
  }

  async editArticle(newTitle: string, newDescription: string, newBody: string, newTags: string[]): Promise<void> {
    // Wait for edit button to be ready
    await this.editButton.first().waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(500);

    // Use first() to handle multiple edit buttons (strict mode violation)
    await this.editButton.first().click();

    // Wait for editor page to load
    await this.page.waitForURL(/.*\/editor\/.*/, { timeout: 20000 });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await this.page.waitForTimeout(1500); // Wait for form to populate

    // Wait for form inputs to be ready
    await this.titleInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.descriptionInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.bodyInput.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(500);

    // Clear existing values and fill new ones
    await this.titleInput.clear();
    await this.page.waitForTimeout(300);
    await this.titleInput.fill(newTitle);
    await this.page.waitForTimeout(300);

    await this.descriptionInput.clear();
    await this.page.waitForTimeout(300);
    await this.descriptionInput.fill(newDescription);
    await this.page.waitForTimeout(300);

    await this.bodyInput.clear();
    await this.page.waitForTimeout(300);
    await this.bodyInput.fill(newBody);
    await this.page.waitForTimeout(500);

    // Clear existing tags and add new ones
    try {
      const existingTags = this.page.locator('.tag-list .tag-pill .ion-close-round, .tag-list .tag-pill .ion-close, .tag-list .tag-pill button');
      await this.page.waitForTimeout(500);
      const tagCount = await existingTags.count();
      for (let i = tagCount - 1; i >= 0; i--) {
        await existingTags.nth(i).click();
        await this.page.waitForTimeout(500);
      }
    } catch {
      // If no existing tags or can't clear them, continue
    }

    // Add new tags
    for (const tag of newTags) {
      await this.tagsInput.clear();
      await this.page.waitForTimeout(200);
      await this.tagsInput.fill(tag);
      await this.page.waitForTimeout(200);
      await this.tagsInput.press('Enter');
      await this.page.waitForTimeout(600);
    }

    // Wait for publish button to be enabled
    await this.publishButton.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(500);

    // Wait for button to be enabled
    let attempts = 0;
    while (await this.publishButton.isDisabled() && attempts < 30) {
      await this.page.waitForTimeout(300);
      attempts++;
    }
    await this.page.waitForTimeout(500);

    await this.publishButton.click();
    // Wait for navigation back to article page
    await this.page.waitForURL(/.*\/article\/.*/, { timeout: 20000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    await this.page.waitForTimeout(1000);
  }

  async deleteArticle(): Promise<void> {
    // Wait for delete button to be ready
    await this.deleteButton.first().waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(500);

    // Use first() to handle multiple delete buttons (strict mode violation)
    await this.deleteButton.first().click();

    // Wait for dialog and deletion to complete
    await this.page.waitForTimeout(1000);
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
    await this.page.waitForTimeout(1000);
  }

  async getArticleTitle(): Promise<string> {
    return await this.articleTitle.textContent() || '';
  }

  async getArticleBody(): Promise<string> {
    // Try to get full body content - might be in multiple paragraphs
    const bodyElements = this.page.locator('.article-content p, .article-content, .article-body, [class*="article"] p');
    const count = await bodyElements.count();

    if (count > 0) {
      const allTexts = await bodyElements.allTextContents();
      return allTexts.join(' ').trim();
    }

    // Fallback to single element
    return await this.articleBody.textContent() || '';
  }

  async getArticleDescription(): Promise<string> {
    const description = this.page.locator('.article-content p:first-of-type, .article-preview p, [class*="description"]').first();
    return await description.textContent() || '';
  }

  async getArticleAuthor(): Promise<string> {
    // Use first() to handle multiple author elements (strict mode violation)
    return await this.articleAuthor.first().textContent() || '';
  }

  async waitForArticlePage(): Promise<void> {
    await this.page.waitForURL(/.*\/article\/.*/, { timeout: 15000 });
    await this.articleTitle.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getArticleTags(): Promise<string[]> {
    const tags = await this.articleTags.allTextContents();
    return tags;
  }

  async getErrorMessage(): Promise<string> {
    try {
      return await this.errorMessage.textContent() || '';
    } catch {
      return '';
    }
  }

  async isEditButtonVisible(): Promise<boolean> {
    try {
      // Check for edit button in article actions area
      const editBtn = this.page.locator('a:has-text("Edit Article"), a:has-text("Edit"), button:has-text("Edit Article")').first();
      return await editBtn.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }

  async isDeleteButtonVisible(): Promise<boolean> {
    try {
      // Check for delete button in article actions area
      const deleteBtn = this.page.locator('button:has-text("Delete Article"), button.btn-outline-danger').first();
      return await deleteBtn.isVisible({ timeout: 3000 });
    } catch {
      return false;
    }
  }
}


