const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'todo_db',
    });

    this.pool.on('error', (err) => {
      console.error('[Database] Unexpected error on idle client', err);
    });
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      console.log('[Database] ✅ Connected to PostgreSQL');
      client.release();
    } catch (err) {
      console.error('[Database] ❌ Connection failed:', err.message);
      throw err;
    }
  }

  async initializeSchema() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS todos (
        id UUID PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_completed ON todos(completed);
      CREATE INDEX IF NOT EXISTS idx_priority ON todos(priority);
      CREATE INDEX IF NOT EXISTS idx_created_at ON todos(created_at);
    `;

    try {
      await this.pool.query(createTableQuery);
      console.log('[Database] ✅ Schema initialized');
    } catch (err) {
      console.error('[Database] ❌ Schema initialization failed:', err.message);
      throw err;
    }
  }

  async query(text, params) {
    try {
      const result = await this.pool.query(text, params);
      return result;
    } catch (err) {
      console.error('[Database] Query error:', err.message);
      throw err;
    }
  }

  async close() {
    await this.pool.end();
    console.log('[Database] ✅ Connection pool closed');
  }
}

module.exports = new Database();
