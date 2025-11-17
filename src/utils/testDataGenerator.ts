import { faker } from '@faker-js/faker';

export interface ArticleTestData {
  title: string;
  description: string;
  body: string;
  tags: string[];
}

export interface UserTestData {
  email: string;
  password: string;
  username: string;
  bio: string;
  image: string;
}

export class TestDataGenerator {
  /**
   * Generate random article data
   */
  static generateArticleData(): ArticleTestData {
    return {
      title: faker.lorem.sentence({ min: 3, max: 8 }).slice(0, 100),
      description: faker.lorem.sentence({ min: 5, max: 15 }),
      body: faker.lorem.paragraphs({ min: 2, max: 5 }),
      tags: [
        faker.word.noun(),
        faker.word.adjective(),
        faker.word.verb(),
      ].slice(0, faker.number.int({ min: 1, max: 3 })),
    };
  }

  /**
   * Generate random article data with specific tag
   */
  static generateArticleDataWithTag(tag: string): ArticleTestData {
    const data = this.generateArticleData();
    data.tags = [tag, ...data.tags.slice(0, 2)];
    return data;
  }

  /**
   * Generate random user credentials
   */
  static generateUserCredentials(): { email: string; password: string } {
    return {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12, memorable: false }),
    };
  }

  /**
   * Generate random signup data (username, email, password)
   */
  static generateSignupData(): { username: string; email: string; password: string } {
    return {
      username: faker.internet.userName().toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20),
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12, memorable: false }),
    };
  }

  /**
   * Generate random user data
   */
  static generateUserData(): UserTestData {
    return {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12, memorable: false }),
      username: faker.internet.userName().toLowerCase().replace(/[^a-z0-9]/g, ''),
      bio: faker.person.bio(),
      image: faker.image.avatar(),
    };
  }

  /**
   * Generate random tag
   */
  static generateTag(): string {
    return faker.word.noun();
  }

  /**
   * Generate random tags array
   */
  static generateTags(count: number = 3): string[] {
    return Array.from({ length: count }, () => this.generateTag());
  }

  /**
   * Generate random string
   */
  static generateString(length: number = 10): string {
    return faker.string.alphanumeric(length);
  }

  /**
   * Generate random number
   */
  static generateNumber(min: number = 1, max: number = 100): number {
    return faker.number.int({ min, max });
  }

  /**
   * Generate invalid email
   */
  static generateInvalidEmail(): string {
    const invalidEmails = [
      'invalid-email',
      'test@',
      '@test.com',
      'test..test@example.com',
      'test@test',
      '',
    ];
    return faker.helpers.arrayElement(invalidEmails);
  }

  /**
   * Generate short password (invalid)
   */
  static generateShortPassword(): string {
    return faker.string.alphanumeric({ length: { min: 1, max: 5 } });
  }

  /**
   * Generate empty string
   */
  static generateEmptyString(): string {
    return '';
  }

  /**
   * Generate very long string (for testing limits)
   */
  static generateLongString(length: number = 1000): string {
    return faker.string.alphanumeric(length);
  }
}


