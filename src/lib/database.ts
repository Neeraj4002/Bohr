/**
 * Centralized Database Service
 * Single source of truth for all database operations
 */
import Database from '@tauri-apps/plugin-sql';

let dbInstance: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

/**
 * Get the database instance (singleton pattern)
 * Ensures only one connection is created and reused
 */
export async function getDatabase(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Prevent multiple simultaneous initialization attempts
  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = Database.load('sqlite:app.db').then((db) => {
    dbInstance = db;
    return db;
  });

  return dbInitPromise;
}

/**
 * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
 */
export async function execute(query: string, params: any[] = []): Promise<void> {
  const db = await getDatabase();
  await db.execute(query, params);
}

/**
 * Execute a SELECT query and return results
 */
export async function select<T>(query: string, params: any[] = []): Promise<T[]> {
  const db = await getDatabase();
  return db.select<T[]>(query, params);
}

/**
 * Execute multiple queries in a transaction
 */
export async function transaction(queries: { query: string; params?: any[] }[]): Promise<void> {
  const db = await getDatabase();
  
  await db.execute('BEGIN TRANSACTION');
  try {
    for (const { query, params = [] } of queries) {
      await db.execute(query, params);
    }
    await db.execute('COMMIT');
  } catch (error) {
    await db.execute('ROLLBACK');
    throw error;
  }
}

/**
 * Helper to generate unique IDs
 */
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Export a db object for backward compatibility
export const db = {
  getDatabase,
  execute,
  select,
  transaction,
  generateId,
};

export default db;
