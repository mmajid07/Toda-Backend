const { RedisTodoStore } = require('../models/todo');

let todoStore;

function setupTodoStore(redisClient) {
  todoStore = new RedisTodoStore(redisClient);
  return todoStore;
}

function setupTodoEvents(io, socket) {
  // Get all todos on connection
  socket.on('getTodos', async () => {
    try {
      const todos = await todoStore.getAllTodos();
      socket.emit('todosList', todos);
    } catch (error) {
      console.error('Error fetching todos:', error);
      socket.emit('error', 'Failed to fetch todos');
    }
  });

  // Add new todo
  socket.on('addTodo', async (data) => {
    try {
      const { title, description } = data;
      if (!title || title.trim() === '') {
        socket.emit('error', 'Todo title cannot be empty');
        return;
      }

      const todo = await todoStore.addTodo(title, description || '');
      
      // Broadcast to all connected clients
      io.emit('todoAdded', todo.toJSON());
    } catch (error) {
      console.error('Error adding todo:', error);
      socket.emit('error', 'Failed to add todo');
    }
  });

  // Update todo
  socket.on('updateTodo', async (data) => {
    try {
      const { id, title, description } = data;
      if (!title || title.trim() === '') {
        socket.emit('error', 'Todo title cannot be empty');
        return;
      }

      const todo = await todoStore.updateTodo(id, title, description || '');
      if (todo) {
        io.emit('todoUpdated', todo.toJSON());
      } else {
        socket.emit('error', 'Todo not found');
      }
    } catch (error) {
      console.error('Error updating todo:', error);
      socket.emit('error', 'Failed to update todo');
    }
  });

  // Toggle todo completion
  socket.on('toggleTodo', async (id) => {
    try {
      const todo = await todoStore.toggleTodo(id);
      if (todo) {
        io.emit('todoToggled', todo.toJSON());
      } else {
        socket.emit('error', 'Todo not found');
      }
    } catch (error) {
      console.error('Error toggling todo:', error);
      socket.emit('error', 'Failed to toggle todo');
    }
  });

  // Delete todo
  socket.on('deleteTodo', async (id) => {
    try {
      const deleted = await todoStore.deleteTodo(id);
      if (deleted) {
        io.emit('todoDeleted', { id });
      } else {
        socket.emit('error', 'Todo not found');
      }
    } catch (error) {
      console.error('Error deleting todo:', error);
      socket.emit('error', 'Failed to delete todo');
    }
  });

  // Clear completed todos
  socket.on('clearCompleted', async () => {
    try {
      const deletedIds = await todoStore.clearCompleted();
      io.emit('completedCleared', { deletedIds });
    } catch (error) {
      console.error('Error clearing completed:', error);
      socket.emit('error', 'Failed to clear completed');
    }
  });

  // User connected notification
  console.log(`✅ Client connected: ${socket.id}`);
  socket.emit('connected', { message: 'Connected to todo server', id: socket.id });

  // User disconnected
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
}

module.exports = { setupTodoEvents, setupTodoStore };
