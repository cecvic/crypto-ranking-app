// Neon Serverless Database Client
import { neon, neonConfig, type NeonQueryFunction } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Enable connection caching for serverless environments
neonConfig.fetchConnectionCache = true;

// Lazy initialization to avoid build-time errors
let _sql: NeonQueryFunction<false, false> | null = null;
let _db: NeonHttpDatabase<typeof schema> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    _sql = neon(process.env.DATABASE_URL);
  }
  return _sql;
}

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    _db = drizzle(getSql(), { schema });
  }
  return _db;
}

// Convenience aliases for common usage
export const sql = getSql;
export const db = {
  get instance() {
    return getDb();
  },
  select: (...args: Parameters<NeonHttpDatabase<typeof schema>['select']>) =>
    getDb().select(...args),
  insert: <T extends Parameters<NeonHttpDatabase<typeof schema>['insert']>[0]>(table: T) =>
    getDb().insert(table),
  update: <T extends Parameters<NeonHttpDatabase<typeof schema>['update']>[0]>(table: T) =>
    getDb().update(table),
  delete: <T extends Parameters<NeonHttpDatabase<typeof schema>['delete']>[0]>(table: T) =>
    getDb().delete(table),
};

// Export schema for use in queries
export * from './schema';
