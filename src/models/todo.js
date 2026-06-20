const { v4: uuidv4 } = require('uuid');

class Todo {
  constructor(title, description = '') {
    this.id = uuidv4();
    this.title = title;
    this.description = description;
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
      completed: this.completed,
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
  }

  async addTodo(title, description) {
    const todo = new Todo(title, description);
    const todoKey = `${this.prefix}${todo.id}`;
    
    try {
      // Store todo as hash in Redis
      await this.redis.hSet(todoKey, todo.toJSON());
      // Add todo ID to list
      await this.redis.lPush(this.listKey, todo.id);
      // Set expiration
      await this.redis.expire(todoKey, 7 * 24 * 60 * 60); // 7 days
      
      return todo;
    } catch (error) {
      console.error('Error adding todo:', error);
      throw error;
    }
  }

  async getTodo(id) {
    const todoKey = `${this.prefix}${id}`;
    try {
      const data = await this.redis.hGetAll(todoKey);
      if (!data || Object.keys(data).length === 0) {
        return null;
      }
      
      const todo = new Todo();
      Object.assign(todo, {
        ...data,
        completed: data.completed === 'true'
      });
      return todo;
    } catch (error) {
      console.error('Error getting todo:', error);
      throw error;
    }
  }

  async getAllTodos() {
    try {
      const todoIds = await this.redis.lRange(this.listKey, 0, -1);
      const todos = [];
      
      for (const id of todoIds) {
        const todo = await this.getTodo(id);
        if (todo) {
          todos.push(todo.toJSON());
        }
      }
      
      return todos;
    } catch (error) {
      console.error('Error getting all todos:', error);
      throw error;
    }
  }

  async updateTodo(id, title, description) {
    const todoKey = `${this.prefix}${id}`;
    try {
      const exists = await this.redis.exists(todoKey);
      if (!exists) {
        return null;
      }
      
      const todo = await this.getTodo(id);
      todo.update(title, description);
      
      await this.redis.hSet(todoKey, todo.toJSON());
      return todo;
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  async toggleTodo(id) {
    const todoKey = `${this.prefix}${id}`;
    try {
      const exists = await this.redis.exists(todoKey);
      if (!exists) {
        return null;
      }
      
      const todo = await this.getTodo(id);
      todo.completed = !todo.completed;
      todo.updatedAt = new Date().toISOString();
      
      await this.redis.hSet(todoKey, todo.toJSON());
      return todo;
    } catch (error) {
      console.error('Error toggling todo:', error);
      throw error;
    }
  }

  async deleteTodo(id) {
    const todoKey = `${this.prefix}${id}`;
    try {
      const deleted = await this.redis.del(todoKey);
      if (deleted) {
        await this.redis.lRem(this.listKey, 0, id);
      }
      return deleted > 0;
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  async clearCompleted() {
    try {
      const todos = await this.getAllTodos();
      const completedIds = todos
        .filter(t => t.completed)
        .map(t => t.id);
      
      for (const id of completedIds) {
        await this.deleteTodo(id);
      }
      
      return completedIds;
    } catch (error) {
      console.error('Error clearing completed:', error);
      throw error;
    }
  }

  async clearAll() {
    try {
      const todoIds = await this.redis.lRange(this.listKey, 0, -1);
      
      for (const id of todoIds) {
        await this.redis.del(`${this.prefix}${id}`);
      }
      
      await this.redis.del(this.listKey);
    } catch (error) {
      console.error('Error clearing all todos:', error);
      throw error;
    }
  }
}

module.exports = { Todo, RedisTodoStore };
