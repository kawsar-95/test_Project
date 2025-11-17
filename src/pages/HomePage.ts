import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  readonly newArticleLink: Locator;
  readonly settingsLink: Locator;
  readonly userProfileLink: Locator;
  readonly articlePreview: Locator;
  readonly tagFilter: Locator;
  readonly popularTags: Locator;
  readonly articleTitle: Locator;
  readonly articleAuthor: Locator;
  readonly articleDate: Locator;
  readonly articleTags: Locator;

  constructor(page: Page) {
    super(page);
    this.newArticleLink = page.locator('a[href*="/editor"]');
    this.settingsLink = page.locator('a[href*="/settings"]');
    this.userProfileLink = page.locator('a[href*="/profile/"]');
    this.articlePreview = page.locator('.article-preview');
    this.tagFilter = page.locator('.tag-list .tag-pill');
    this.popularTags = page.locator('.sidebar .tag-list .tag-pill');
    this.articleTitle = page.locator('.article-preview h1, .article-preview a');
    this.articleAuthor = page.locator('.article-preview .article-meta .author');
    this.articleDate = page.locator('.article-preview .article-meta .date');
    this.articleTags = page.locator('.article-preview .tag-list .tag-pill');
  }

  async clickNewArticle(): Promise<void> {
    await this.newArticleLink.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(300);
    await this.newArticleLink.click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
    await this.page.waitForTimeout(500);
  }

  async clickSettings(): Promise<void> {
    await this.settingsLink.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(300);
    await this.settingsLink.click();
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
    await this.page.waitForTimeout(500);
  }

  async clickTag(tagName: string): Promise<void> {
    // Try multiple tag locations - sidebar popular tags or article tags
    const tag = this.page.locator(`.tag-pill:has-text("${tagName}"), .tag-default:has-text("${tagName}")`).first();
    await tag.waitFor({ state: 'visible', timeout: 15000 });
    await this.page.waitForTimeout(300);
    await tag.click();
    // Wait for navigation to filtered page
    // await this.page.waitForURL((url) => url.toString().includes('tag=') || url.toString().includes(tagName), { timeout: 20000 }).catch(() => { });
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { });
    await this.page.waitForTimeout(1000);
  }

  async clickArticle(title: string): Promise<void> {
    const article = this.page.locator(`.article-preview:has-text("${title}")`).first();
    await article.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getArticleTitles(): Promise<string[]> {
    const titles = await this.page.locator('.article-preview h1, .article-preview a').allTextContents();
    return titles;
  }

  async getPopularTags(): Promise<string[]> {
    const tags = await this.popularTags.allTextContents();
    return tags;
  }

  async isArticleVisible(title: string): Promise<boolean> {
    try {
      const article = this.page.locator(`.article-preview:has-text("${title}")`);
      return await article.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  async getFilteredTag(): Promise<string> {
    try {
      const activeTag = this.page.locator('.tag-list .tag-pill.tag-outline.active, .tag-pill.active').first();
      return await activeTag.textContent({ timeout: 3000 }) || '';
    } catch {
      // If no active tag found, return empty string
      return '';
    }
  }
}


