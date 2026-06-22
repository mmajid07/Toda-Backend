const { v4: uuidv4 } = require('uuid');

class Todo {
  constructor(title, description = '', priority = 'medium') {
    this.id = uuidv4();
    this.title = title;
    this.description = description;
    this.priority = priority;
    this.completed = false;
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  complete() {
    this.completed = true;
    this.updatedAt = new Date().toISOString();
  }

  update(title, description) {
    this.title = title;
    this.description = description;
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      priority: this.priority,
      completed: this.completed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toRedis() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      priority: this.priority,
      completed: String(this.completed),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

class RedisTodoStore {
  constructor(redisClient) {
    this.redis = redisClient;
    this.prefix = 'todo:';
    this.listKey = 'todos:list';
    console.log('[TodoStore] Initialized with Redis client');
  }

  async addTodo(title, description, priority = 'medium') {
    const todo = new Todo(title, description, priority);
    const todoKey = `${this.prefix}${todo.id}`;
    console.log(`[addTodo] START - title: "${title}" | priority: "${priority}" | key: ${todoKey}`);

    try {
      console.log('[addTodo] Step 1 - Saving to Redis hash...');
      await this.redis.hSet(todoKey, todo.toRedis());
      console.log('[addTodo] Step 2 - Adding ID to list...');
      await this.redis.lPush(this.listKey, todo.id);
      console.log('[addTodo] Step 3 - Setting expiry (7 days)...');
      await this.redis.expire(todoKey, 7 * 24 * 60 * 60);
      console.log(`[addTodo] SUCCESS - id: ${todo.id}`);
      return todo;
    } catch (error) {
      console.error('[addTodo] FAILED:', error.message);
      throw error;
    }
  }

  async getTodo(id) {
    const todoKey = `${this.prefix}${id}`;
    console.log(`[getTodo] Fetching key: ${todoKey}`);
    try {
      const data = await this.redis.hGetAll(todoKey);
      if (!data || Object.keys(data).length === 0) {
        console.warn(`[getTodo] Not found: ${id}`);
        return null;
      }
      const todo = new Todo();
      Object.assign(todo, {
        ...data,
        completed: data.completed === 'true'
      });
      console.log(`[getTodo] Found: "${todo.title}" | completed: ${todo.completed}`);
      return todo;
    } catch (error) {
      console.error('[getTodo] FAILED:', error.message);
      throw error;
    }
  }

  async getAllTodos() {
    console.log('[getAllTodos] Fetching all todo IDs from list...');
    try {
      const todoIds = await this.redis.lRange(this.listKey, 0, -1);
      console.log(`[getAllTodos] Found ${todoIds.length} ID(s):`, todoIds);
      const todos = [];
      for (const id of todoIds) {
        const todo = await this.getTodo(id);
        if (todo) todos.push(todo.toJSON());
      }
      console.log(`[getAllTodos] Returning ${todos.length} todo(s)`);
      return todos;
    } catch (error) {
      console.error('[getAllTodos] FAILED:', error.message);
      throw error;
    }
  }

  async updateTodo(id, title, description) {
    const todoKey = `${this.prefix}${id}`;
    console.log(`[updateTodo] START - id: ${id} | title: "${title}"`);
    try {
      const exists = await this.redis.exists(todoKey);
      if (!exists) {
        console.warn(`[updateTodo] Not found: ${id}`);
        return null;
      }
      const todo = await this.getTodo(id);
      todo.update(title, description);
      await this.redis.hSet(todoKey, todo.toRedis());
      console.log(`[updateTodo] SUCCESS - id: ${id}`);
      return todo;
    } catch (error) {
      console.error('[updateTodo] FAILED:', error.message);
      throw error;
    }
  }

  async toggleTodo(id) {
    const todoKey = `${this.prefix}${id}`;
    console.log(`[toggleTodo] START - id: ${id}`);
    try {
      const exists = await this.redis.exists(todoKey);
      if (!exists) {
        console.warn(`[toggleTodo] Not found: ${id}`);
        return null;
      }
      const todo = await this.getTodo(id);
      todo.completed = !todo.completed;
      todo.updatedAt = new Date().toISOString();
      await this.redis.hSet(todoKey, todo.toRedis());
      console.log(`[toggleTodo] SUCCESS - id: ${id} | completed: ${todo.completed}`);
      return todo;
    } catch (error) {
      console.error('[toggleTodo] FAILED:', error.message);
      throw error;
    }
  }

  async deleteTodo(id) {
    const todoKey = `${this.prefix}${id}`;
    console.log(`[deleteTodo] START - id: ${id}`);
    try {
      const deleted = await this.redis.del(todoKey);
      if (deleted) {
        await this.redis.lRem(this.listKey, 0, id);
        console.log(`[deleteTodo] SUCCESS - id: ${id}`);
      } else {
        console.warn(`[deleteTodo] Key not found: ${todoKey}`);
      }
      return deleted > 0;
    } catch (error) {
      console.error('[deleteTodo] FAILED:', error.message);
      throw error;
    }
  }

  async clearCompleted() {
    console.log('[clearCompleted] START');
    try {
      const todos = await this.getAllTodos();
      const completedIds = todos.filter(t => t.completed).map(t => t.id);
      console.log(`[clearCompleted] Deleting ${completedIds.length} completed todo(s)`);
      for (const id of completedIds) {
        await this.deleteTodo(id);
      }
      console.log('[clearCompleted] SUCCESS');
      return completedIds;
    } catch (error) {
      console.error('[clearCompleted] FAILED:', error.message);
      throw error;
    }
  }

  async clearAll() {
    console.log('[clearAll] START');
    try {
      const todoIds = await this.redis.lRange(this.listKey, 0, -1);
      console.log(`[clearAll] Deleting ${todoIds.length} todo(s)`);
      for (const id of todoIds) {
        await this.redis.del(`${this.prefix}${id}`);
      }
      await this.redis.del(this.listKey);
      console.log('[clearAll] SUCCESS');
    } catch (error) {
      console.error('[clearAll] FAILED:', error.message);
      throw error;
    }
  }
}

module.exports = { Todo, RedisTodoStore };
