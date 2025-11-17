export const TEST_CONFIG = {
  BASE_URL: 'https://conduit.bondaracademy.com',
  API_BASE_URL: 'https://conduit.bondaracademy.com/api',
  DEFAULT_TIMEOUT: 30000,
  NAVIGATION_TIMEOUT: 30000,
  ACTION_TIMEOUT: 30000,
};

export const TEST_CREDENTIALS = {
  // Test credentials for Conduit application
  VALID_EMAIL: process.env.TEST_EMAIL || 'nuruddinkawsar1995@gmail.com',
  VALID_PASSWORD: process.env.TEST_PASSWORD || '1234kawsar@',
};

export const SELECTORS = {
  // Common selectors
  ARTICLE_PREVIEW: '.article-preview',
  ARTICLE_TITLE: '.article-preview h1, .article-preview a',
  TAG_PILL: '.tag-pill',
  POPULAR_TAGS: '.sidebar .tag-list .tag-pill',

  // Login
  EMAIL_INPUT: 'input[type="email"]',
  PASSWORD_INPUT: 'input[type="password"]',
  SIGN_IN_BUTTON: 'button:has-text("Sign in")',

  // Article Editor
  TITLE_INPUT: 'input[placeholder*="Article Title"], input[formcontrolname="title"]',
  DESCRIPTION_INPUT: 'input[placeholder*="What\'s this article about?"], input[formcontrolname="description"]',
  BODY_INPUT: 'textarea[placeholder*="Write your article"], textarea[formcontrolname="body"]',
  TAGS_INPUT: 'input[placeholder*="Enter tags"], input[formcontrolname="tagList"]',
  PUBLISH_BUTTON: 'button:has-text("Publish Article"), button[type="submit"]',

  // Article View
  EDIT_BUTTON: 'a:has-text("Edit Article"), button:has-text("Edit")',
  DELETE_BUTTON: 'button:has-text("Delete Article"), button.btn-outline-danger',

  // Settings
  USERNAME_INPUT: 'input[placeholder*="Your username"], input[formcontrolname="username"]',
  BIO_INPUT: 'textarea[placeholder*="Short bio"], textarea[formcontrolname="bio"]',
  UPDATE_BUTTON: 'button:has-text("Update Settings"), button[type="submit"]',
};


