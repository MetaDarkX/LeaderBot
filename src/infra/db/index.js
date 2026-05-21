// ============================================================
//  infra/db/index.js
//  Entry point do módulo DB. Re-exporta o pool + repositórios
//  para que `import { ... } from '#infra/db'` funcione.
// ============================================================

export {
  getPool,
  query,
  withTransaction,
  probe,
  isReady,
  lastDbError,
  closePool,
} from './pool.js';

export { migrate } from './migrate.js';
