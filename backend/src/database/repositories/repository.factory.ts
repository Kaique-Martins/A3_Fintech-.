/**
 * Repository Factory
 * Allows switching between different implementations without changing application code
 *
 * Usage:
 * const repo = RepositoryFactory.create('json');  // or 'database'
 */

import { IRepository } from '../interfaces/repository.interface';
import { JsonRepository } from './json.repository';
import { DatabaseRepository } from './database.repository';

export type RepositoryType = 'json' | 'database' | 'auto';

export class RepositoryFactory {
  /**
   * Create a repository instance based on type
   * @param type - 'json' for file-based, 'database' for database implementation, 'auto' for environment-based
   * @returns Repository instance implementing IRepository interface
   */
  static create(type: RepositoryType = 'auto'): IRepository {
    let repositoryType = type;

    // Auto-detect from environment variable
    if (type === 'auto') {
      const env =
        process.env.REPOSITORY_TYPE || process.env.DATABASE_URL
          ? 'database'
          : 'json';
      repositoryType = env as any;
      console.log(
        `[RepositoryFactory] Auto-detected repository type: ${repositoryType}`,
      );
    }

    switch (repositoryType) {
      case 'json':
        console.log(
          '[RepositoryFactory] Creating JsonRepository (File-based persistence)',
        );
        return new JsonRepository();

      case 'database':
        console.log(
          '[RepositoryFactory] Creating DatabaseRepository (Database persistence)',
        );
        console.warn(
          '⚠️  DatabaseRepository not yet implemented. Switch to "json" or implement database connection.',
        );
        return new DatabaseRepository();

      default:
        console.log(
          '[RepositoryFactory] Unknown type, defaulting to JsonRepository',
        );
        return new JsonRepository();
    }
  }

  /**
   * Get available repository types
   */
  static getAvailableTypes(): RepositoryType[] {
    return ['json', 'database'];
  }

  /**
   * Check if a type is available
   */
  static isAvailable(type: RepositoryType): boolean {
    return this.getAvailableTypes().includes(type);
  }
}
