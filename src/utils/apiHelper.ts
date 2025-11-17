import { APIRequestContext, APIResponse } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

export interface UserCredentials {
  email: string;
  password: string;
}

export interface ArticleData {
  title: string;
  description: string;
  body: string;
  tagList: string[];
}

export interface UserSettings {
  email?: string;
  username?: string;
  bio?: string;
  image?: string;
  password?: string;
}

export class ApiHelper {
  private request: APIRequestContext;
  private baseURL: string;
  private authToken: string | null = null;

  constructor(request: APIRequestContext, baseURL: string = 'https://conduit.bondaracademy.com/api') {
    this.request = request;
    this.baseURL = baseURL;
  }

  /**
   * Authenticate user and store token
   * Returns the full user object from the API response
   */
  async login(credentials: UserCredentials): Promise<any> {
    try {
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required for login');
      }

      // Retry logic for network issues
      let lastError: Error | null = null;
      const maxRetries = 3;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await this.request.post(`${this.baseURL}/users/login`, {
            data: {
              user: {
                email: credentials.email,
                password: credentials.password,
              },
            },
            timeout: 30000 + (attempt * 10000), // Increase timeout with each retry
          });

          if (!response.ok()) {
            let errorBody = '';
            try {
              errorBody = await response.text();
            } catch {
              errorBody = 'Unable to read error response';
            }

            const errorMessage = `Login failed: ${response.status()} ${response.statusText()}`;
            const detailedError = errorBody ? `${errorMessage} - ${errorBody}` : errorMessage;
            throw new Error(detailedError);
          }

          let body;
          try {
            body = await response.json();
          } catch (parseError) {
            throw new Error(`Failed to parse login response: ${parseError}`);
          }

          if (!body.user || !body.user.token) {
            throw new Error('Login response missing user token');
          }

          this.authToken = body.user.token;
          console.log('✅ Login successful');
          return body; // Return full response including user object
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));

          // If it's not a network error or last attempt, throw immediately
          if (attempt === maxRetries - 1) {
            break;
          }

          // Wait before retry with exponential backoff
          const waitTime = 1000 * Math.pow(2, attempt);
          console.warn(`Login attempt ${attempt + 1} failed, retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      // All retries exhausted
      throw lastError || new Error('Login failed after retries');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Login failed with unknown error: ${error}`);
    }
  }

  /**
   * Get current authentication token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string): void {
    this.authToken = token;
  }

  /**
   * Get headers with authentication
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Token ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Create a new article via API
   */
  async createArticle(articleData: ArticleData): Promise<any> {
    try {
      if (!this.authToken) {
        throw new Error('Authentication required to create article');
      }

      if (!articleData.title || !articleData.body) {
        throw new Error('Article title and body are required');
      }

      const response = await this.request.post(`${this.baseURL}/articles`, {
        headers: this.getAuthHeaders(),
        data: {
          article: articleData,
        },
        timeout: 30000,
      });

      if (!response.ok()) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = 'Unable to read error response';
        }

        const errorMessage = `Failed to create article: ${response.status()} ${response.statusText()}`;
        const detailedError = errorBody ? `${errorMessage} - ${errorBody}` : errorMessage;
        throw new Error(detailedError);
      }

      let body;
      try {
        body = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse create article response: ${parseError}`);
      }

      console.log('✅ Article created successfully');
      return body;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to create article: ${error}`);
    }
  }

  /**
   * Get article by slug
   */
  async getArticle(slug: string): Promise<any> {
    try {
      if (!slug || slug.trim().length === 0) {
        throw new Error('Article slug is required');
      }

      const response = await this.request.get(`${this.baseURL}/articles/${slug}`, {
        headers: this.getAuthHeaders(),
        timeout: 30000,
      });

      if (!response.ok()) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = 'Unable to read error response';
        }

        const errorMessage = `Failed to get article: ${response.status()} ${response.statusText()}`;
        const detailedError = errorBody ? `${errorMessage} - ${errorBody}` : errorMessage;
        throw new Error(detailedError);
      }

      let body;
      try {
        body = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse get article response: ${parseError}`);
      }

      return body;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to get article: ${error}`);
    }
  }

  /**
   * Update article by slug
   */
  async updateArticle(slug: string, articleData: Partial<ArticleData>): Promise<any> {
    try {
      if (!this.authToken) {
        throw new Error('Authentication required to update article');
      }

      if (!slug || slug.trim().length === 0) {
        throw new Error('Article slug is required');
      }

      const response = await this.request.put(`${this.baseURL}/articles/${slug}`, {
        headers: this.getAuthHeaders(),
        data: {
          article: articleData,
        },
        timeout: 30000,
      });

      if (!response.ok()) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = 'Unable to read error response';
        }

        const errorMessage = `Failed to update article: ${response.status()} ${response.statusText()}`;
        const detailedError = errorBody ? `${errorMessage} - ${errorBody}` : errorMessage;
        throw new Error(detailedError);
      }

      let body;
      try {
        body = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse update article response: ${parseError}`);
      }

      console.log('✅ Article updated successfully');
      return body;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to update article: ${error}`);
    }
  }

  /**
   * Delete article by slug
   */
  async deleteArticle(slug: string): Promise<void> {
    try {
      if (!this.authToken) {
        throw new Error('Authentication required to delete article');
      }

      if (!slug || slug.trim().length === 0) {
        throw new Error('Article slug is required');
      }

      const response = await this.request.delete(`${this.baseURL}/articles/${slug}`, {
        headers: this.getAuthHeaders(),
        timeout: 30000,
      });

      if (!response.ok()) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = 'Unable to read error response';
        }

        const errorMessage = `Failed to delete article: ${response.status()} ${response.statusText()}`;
        const detailedError = errorBody ? `${errorMessage} - ${errorBody}` : errorMessage;
        throw new Error(detailedError);
      }

      console.log('✅ Article deleted successfully');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to delete article: ${error}`);
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/user`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok()) {
      throw new Error(`Failed to get current user: ${response.status()} ${response.statusText()}`);
    }

    return await response.json();
  }

  /**
   * Update user settings
   */
  async updateUserSettings(settings: UserSettings): Promise<any> {
    try {
      if (!this.authToken) {
        throw new Error('Authentication required to update user settings');
      }

      if (Object.keys(settings).length === 0) {
        throw new Error('At least one setting field is required');
      }

      const response = await this.request.put(`${this.baseURL}/user`, {
        headers: this.getAuthHeaders(),
        data: {
          user: settings,
        },
        timeout: 30000,
      });

      if (!response.ok()) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = 'Unable to read error response';
        }

        const errorMessage = `Failed to update user settings: ${response.status()} ${response.statusText()}`;
        const detailedError = errorBody ? `${errorMessage} - ${errorBody}` : errorMessage;
        throw new Error(detailedError);
      }

      let body;
      try {
        body = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse update user settings response: ${parseError}`);
      }

      console.log('✅ User settings updated successfully');
      return body;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to update user settings: ${error}`);
    }
  }

  /**
   * Get articles by tag
   */
  async getArticlesByTag(tag: string, limit: number = 10, offset: number = 0): Promise<any> {
    try {
      if (!tag || tag.trim().length === 0) {
        throw new Error('Tag is required');
      }

      if (limit < 1 || limit > 100) {
        throw new Error('Limit must be between 1 and 100');
      }

      if (offset < 0) {
        throw new Error('Offset must be non-negative');
      }

      const response = await this.request.get(
        `${this.baseURL}/articles?tag=${encodeURIComponent(tag)}&limit=${limit}&offset=${offset}`,
        {
          headers: this.getAuthHeaders(),
          timeout: 30000,
        }
      );

      if (!response.ok()) {
        let errorBody = '';
        try {
          errorBody = await response.text();
        } catch {
          errorBody = 'Unable to read error response';
        }

        const errorMessage = `Failed to get articles by tag: ${response.status()} ${response.statusText()}`;
        const detailedError = errorBody ? `${errorMessage} - ${errorBody}` : errorMessage;
        throw new Error(detailedError);
      }

      let body;
      try {
        body = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse get articles by tag response: ${parseError}`);
      }

      return body;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to get articles by tag: ${error}`);
    }
  }

  /**
   * Generate slug from title
   */
  static generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}


