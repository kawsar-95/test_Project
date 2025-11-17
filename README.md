# Conduit Playwright Testing Framework

A comprehensive end-to-end testing framework built with Playwright and TypeScript for testing the Conduit application at https://conduit.bondaracademy.com/.

## Features

- ✅ **Comprehensive Test Coverage**: Positive and negative test cases for all major scenarios
- ✅ **Session Management**: Reusable authenticated sessions to optimize test execution
- ✅ **Page Object Model**: Clean separation of page objects, utilities, and test data
- ✅ **Dynamic Test Data**: Randomized test data generation using Faker.js
- ✅ **API Integration**: Pre-condition setup via API for efficient test execution
- ✅ **Cross-Browser Testing**: Support for Chromium, Firefox, and WebKit
- ✅ **Parallel Execution**: Optimized for parallel test runs
- ✅ **Detailed Reporting**: Allure and HTML reports with screenshots and traces
- ✅ **CI/CD Integration**: GitHub Actions workflow for automated testing
- ✅ **Resilient Tests**: Flexible locators and retry mechanisms

## Test Scenarios

### Positive Test Cases

1. **Create New Article** - Create and publish a new article with validation
2. **Edit Article** - Edit an existing article (created via API pre-condition)
3. **Delete Article** - Delete an existing article (created via API pre-condition)
4. **Filter Articles by Tag** - Filter articles using tag filters
5. **Update User Settings** - Update user profile settings

### Negative Test Cases

Each scenario includes negative test cases covering:
- Empty/invalid inputs
- Validation errors
- Edge cases
- Error handling

## Project Structure

```
.
├── src/
│   ├── pages/              # Page Object Models
│   │   ├── BasePage.ts
│   │   ├── LoginPage.ts
│   │   ├── HomePage.ts
│   │   ├── ArticlePage.ts
│   │   └── SettingsPage.ts
│   ├── utils/              # Utilities
│   │   ├── apiHelper.ts    # API interaction helpers
│   │   ├── testDataGenerator.ts  # Dynamic test data
│   │   ├── sessionManager.ts      # Session management
│   │   └── constants.ts           # Constants
│   └── fixtures/           # Playwright fixtures
│       └── authFixture.ts  # Authentication fixture
├── tests/                  # Test files
│   ├── create-article.spec.ts
│   ├── edit-article.spec.ts
│   ├── delete-article.spec.ts
│   ├── filter-articles-by-tag.spec.ts
│   └── update-user-settings.spec.ts
├── .github/
│   └── workflows/
│       └── playwright.yml  # CI/CD pipeline
├── playwright.config.ts    # Playwright configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies

```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd TEST
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

4. *(Recommended)* Bootstrap a reusable test user once:
```bash
npm run bootstrap:user
```
This registers a dedicated Conduit account, saves the storage state in `.auth/user.json`, and stores the generated credentials in `.auth/credentials.json`. Subsequent `npx playwright test` runs reuse that session instead of signing up a new user on every worker. Use `FORCE_BOOTSTRAP=true npm run bootstrap:user` to regenerate the account.

4. Set up environment variables:
   
   **Option 1: Create a `.env` file** (not tracked in git):
   ```bash
   TEST_EMAIL=your-test-email@example.com
   TEST_PASSWORD=your-test-password
   ```
   
   **Option 2: Set environment variables in your shell:**
   ```bash
   export TEST_EMAIL=your-test-email@example.com
   export TEST_PASSWORD=your-test-password
   ```
   
   **Note:** You need valid test account credentials for the Conduit application at https://conduit.bondaracademy.com/

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in headed mode
```bash
npm run test:headed
```

### Run tests with UI mode
```bash
npm run test:ui
```

### Run tests for specific browser
```bash
npm run test:chromium
npm run test:firefox
npm run test:webkit
```

### Run specific test file
```bash
npx playwright test tests/create-article.spec.ts
```

### Run tests in debug mode
```bash
npm run test:debug
```

## Test Reports

### HTML Report
After running tests, view the HTML report:
```bash
npm run test:report
```

### Allure Report
Generate and view Allure report:
```bash
# Generate report
npm run test:allure:generate

# Serve report (opens in browser)
npm run test:allure:serve
```

## CI/CD Integration

The framework includes a GitHub Actions workflow (`.github/workflows/playwright.yml`) that:

- Runs tests on push and pull requests
- Tests across all browsers (Chromium, Firefox, WebKit)
- Generates and uploads test reports
- Captures screenshots and traces on failure
- Generates Allure reports

### Setting up GitHub Secrets

For CI/CD to work, add the following secrets to your GitHub repository:

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `TEST_EMAIL`: Your test account email
   - `TEST_PASSWORD`: Your test account password

## Best Practices Implemented

1. **Page Object Model**: All page interactions are abstracted into page objects
2. **Separation of Concerns**: Utilities, fixtures, and test data are separated
3. **Session Reuse**: Authenticated sessions are saved and reused
4. **Dynamic Data**: Test data is generated dynamically to avoid conflicts
5. **Resilient Locators**: Multiple selector strategies for reliability
6. **Comprehensive Assertions**: Both UI and functional validations
7. **Error Handling**: Proper error handling and cleanup in tests
8. **Test Isolation**: Each test is independent with proper setup/teardown

## Configuration

### Playwright Configuration

The `playwright.config.ts` file includes:
- Base URL configuration
- Timeout settings
- Retry configuration
- Reporter configuration
- Cross-browser project setup
- Screenshot and trace capture on failure

### Test Data Generation

The framework uses `@faker-js/faker` for generating:
- Article titles, descriptions, and bodies
- User credentials and profile data
- Tags and other dynamic content
- Invalid data for negative testing

## Troubleshooting

### Tests are flaky
- Increase timeout values in `playwright.config.ts`
- Check network conditions
- Verify selectors are stable

### Authentication issues
- Verify test credentials are correct
- Check if session storage is being saved correctly
- Ensure API endpoints are accessible

### Browser installation issues
```bash
npx playwright install --force
```

## Contributing

1. Follow the existing code structure
2. Add appropriate assertions
3. Include both positive and negative test cases
4. Update documentation as needed

## License

ISC

