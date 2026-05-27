/**
 * Database module barrel export
 * Exports all repository interfaces and implementations
 */

export {
  IRepository,
  PersistedDecision,
  DecisionAggregate,
  RepositoryQuery,
} from './interfaces/repository.interface';
export { JsonRepository } from './repositories/json.repository';
export { DatabaseRepository } from './repositories/database.repository';
export {
  RepositoryFactory,
  type RepositoryType,
} from './repositories/repository.factory';
export { DatabaseService } from './database.service';
