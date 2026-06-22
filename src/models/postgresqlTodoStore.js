const { v4: uuidv4 } = require('uuid');
const db = require('../utils/database');

class PostgreSQLTodoStore {
  constructor() {
    console.log('[PostgreSQLTodoStore] Initialized');
  }

  async addTodo(title, description, priority = 'medium') {
    const id = uuidv4();
    const query = `
      INSERT INTO todos (id, title, description, priority)
      VALUES ($1, $2, $3, $4)
      RETURNING id, title, description, priority, completed, created_at as "createdAt", updated_at as "updatedAt"
    `;

    console.log(`[addTodo] START - title: "${title}" | priority: "${priority}"`);
    try {
      const result = await db.query(query, [id, title, description, priority]);
      const todo = result.rows[0];
      console.log(`[addTodo] SUCCESS - id: ${id}`);
      return this.formatTodo(todo);
    } catch (error) {
      console.error('[addTodo] FAILED:', error.message);
      throw error;
    }
  }

  async getTodo(id) {
    const query = `
      SELECT id, title, description, priority, completed, created_at as "createdAt", updated_at as "updatedAt"
      FROM todos WHERE id = $1
    `;

    console.log(`[getTodo] Fetching id: ${id}`);
    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        console.warn(`[getTodo] Not found: ${id}`);
        return null;
      }
      const todo = result.rows[0];
      console.log(`[getTodo] Found: "${todo.title}"`);
      return this.formatTodo(todo);
    } catch (error) {
      console.error('[getTodo] FAILED:', error.message);
      throw error;
    }
  }

  async getAllTodos() {
    const query = `
      SELECT id, title, description, priority, completed, created_at as "createdAt", updated_at as "updatedAt"
      FROM todos
      ORDER BY created_at DESC
    `;

    console.log('[getAllTodos] Fetching all todos...');
    try {
      const result = await db.query(query);
      const todos = result.rows.map(row => this.formatTodo(row));
      console.log(`[getAllTodos] Returning ${todos.length} todo(s)`);
      return todos;
    } catch (error) {
      console.error('[getAllTodos] FAILED:', error.message);
      throw error;
    }
  }

  async updateTodo(id, title, description) {
    const query = `
      UPDATE todos
      SET title = $1, description = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, title, description, priority, completed, created_at as "createdAt", updated_at as "updatedAt"
    `;

    console.log(`[updateTodo] START - id: ${id} | title: "${title}"`);
    try {
      const result = await db.query(query, [title, description, id]);
      if (result.rows.length === 0) {
        console.warn(`[updateTodo] Not found: ${id}`);
        return null;
      }
      const todo = result.rows[0];
      console.log(`[updateTodo] SUCCESS - id: ${id}`);
      return this.formatTodo(todo);
    } catch (error) {
      console.error('[updateTodo] FAILED:', error.message);
      throw error;
    }
  }

  async toggleTodo(id) {
    const query = `
      UPDATE todos
      SET completed = NOT completed, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, title, description, priority, completed, created_at as "createdAt", updated_at as "updatedAt"
    `;

    console.log(`[toggleTodo] START - id: ${id}`);
    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        console.warn(`[toggleTodo] Not found: ${id}`);
        return null;
      }
      const todo = result.rows[0];
      console.log(`[toggleTodo] SUCCESS - id: ${id} | completed: ${todo.completed}`);
      return this.formatTodo(todo);
    } catch (error) {
      console.error('[toggleTodo] FAILED:', error.message);
      throw error;
    }
  }

  async deleteTodo(id) {
    const query = `DELETE FROM todos WHERE id = $1`;

    console.log(`[deleteTodo] START - id: ${id}`);
    try {
      const result = await db.query(query, [id]);
      const deleted = result.rowCount > 0;
      if (deleted) {
        console.log(`[deleteTodo] SUCCESS - id: ${id}`);
      } else {
        console.warn(`[deleteTodo] Not found: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error('[deleteTodo] FAILED:', error.message);
      throw error;
    }
  }

  async clearCompleted() {
    const query = `
      DELETE FROM todos WHERE completed = true
      RETURNING id
    `;

    console.log('[clearCompleted] START');
    try {
      const result = await db.query(query);
      const deletedIds = result.rows.map(row => row.id);
      console.log(`[clearCompleted] SUCCESS - deleted ${deletedIds.length} todo(s)`);
      return deletedIds;
    } catch (error) {
      console.error('[clearCompleted] FAILED:', error.message);
      throw error;
    }
  }

  async clearAll() {
    const query = `DELETE FROM todos`;

    console.log('[clearAll] START');
    try {
      const result = await db.query(query);
      console.log(`[clearAll] SUCCESS - deleted ${result.rowCount} todo(s)`);
    } catch (error) {
      console.error('[clearAll] FAILED:', error.message);
      throw error;
    }
  }

  formatTodo(row) {
    return {
      id: row.id,
      title: row.title,
      description: row.description || '',
      priority: row.priority || 'medium',
      completed: row.completed,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

module.exports = PostgreSQLTodoStore;
