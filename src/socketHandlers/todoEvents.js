const { RedisTodoStore } = require('../models/todo');

let todoStore;

function setupTodoStore(redisClient) {
  console.log('[setupTodoStore] Creating RedisTodoStore...');
  todoStore = new RedisTodoStore(redisClient);
  console.log('[setupTodoStore] Done');
  return todoStore;
}

function setupTodoEvents(io, socket) {
  console.log(`[setupTodoEvents] Registering events for socket: ${socket.id}`);

  socket.on('getTodos', async () => {
    console.log(`[getTodos] Request from socket: ${socket.id}`);
    try {
      const todos = await todoStore.getAllTodos();
      console.log(`[getTodos] Sending ${todos.length} todo(s) to ${socket.id}`);
      socket.emit('todosList', todos);
    } catch (error) {
      console.error('[getTodos] ERROR:', error.message);
      socket.emit('error', 'Failed to fetch todos');
    }
  });

  socket.on('addTodo', async (data) => {
    console.log(`[addTodo] Request from socket: ${socket.id} | data:`, data);
    try {
      const { title, description, priority } = data;
      if (!title || title.trim() === '') {
        console.warn('[addTodo] Rejected - empty title');
        socket.emit('error', 'Todo title cannot be empty');
        return;
      }

      console.log('[addTodo] Calling todoStore.addTodo...');
      const todo = await todoStore.addTodo(title, description || '', priority || 'medium');
      console.log(`[addTodo] Broadcasting todoAdded to all clients | id: ${todo.id}`);
      io.emit('todoAdded', todo.toJSON());
    } catch (error) {
      console.error('[addTodo] ERROR:', error.message);
      socket.emit('error', 'Failed to add todo');
    }
  });

  socket.on('updateTodo', async (data) => {
    console.log(`[updateTodo] Request from socket: ${socket.id} | id: ${data.id}`);
    try {
      const { id, title, description } = data;
      if (!title || title.trim() === '') {
        console.warn('[updateTodo] Rejected - empty title');
        socket.emit('error', 'Todo title cannot be empty');
        return;
      }

      const todo = await todoStore.updateTodo(id, title, description || '');
      if (todo) {
        console.log(`[updateTodo] Broadcasting todoUpdated | id: ${id}`);
        io.emit('todoUpdated', todo.toJSON());
      } else {
        console.warn(`[updateTodo] Todo not found: ${id}`);
        socket.emit('error', 'Todo not found');
      }
    } catch (error) {
      console.error('[updateTodo] ERROR:', error.message);
      socket.emit('error', 'Failed to update todo');
    }
  });

  socket.on('toggleTodo', async (id) => {
    console.log(`[toggleTodo] Request from socket: ${socket.id} | id: ${id}`);
    try {
      const todo = await todoStore.toggleTodo(id);
      if (todo) {
        console.log(`[toggleTodo] Broadcasting todoToggled | id: ${id} | completed: ${todo.completed}`);
        io.emit('todoToggled', todo.toJSON());
      } else {
        console.warn(`[toggleTodo] Todo not found: ${id}`);
        socket.emit('error', 'Todo not found');
      }
    } catch (error) {
      console.error('[toggleTodo] ERROR:', error.message);
      socket.emit('error', 'Failed to toggle todo');
    }
  });

  socket.on('deleteTodo', async (id) => {
    console.log(`[deleteTodo] Request from socket: ${socket.id} | id: ${id}`);
    try {
      const deleted = await todoStore.deleteTodo(id);
      if (deleted) {
        console.log(`[deleteTodo] Broadcasting todoDeleted | id: ${id}`);
        io.emit('todoDeleted', { id });
      } else {
        console.warn(`[deleteTodo] Todo not found: ${id}`);
        socket.emit('error', 'Todo not found');
      }
    } catch (error) {
      console.error('[deleteTodo] ERROR:', error.message);
      socket.emit('error', 'Failed to delete todo');
    }
  });

  socket.on('clearCompleted', async () => {
    console.log(`[clearCompleted] Request from socket: ${socket.id}`);
    try {
      const deletedIds = await todoStore.clearCompleted();
      console.log(`[clearCompleted] Broadcasting completedCleared | count: ${deletedIds.length}`);
      io.emit('completedCleared', { deletedIds });
    } catch (error) {
      console.error('[clearCompleted] ERROR:', error.message);
      socket.emit('error', 'Failed to clear completed');
    }
  });

  console.log(`[setupTodoEvents] All events registered for socket: ${socket.id}`);
  socket.emit('connected', { message: 'Connected to todo server', id: socket.id });

  socket.on('disconnect', () => {
    console.log(`[disconnect] Socket disconnected: ${socket.id}`);
  });
}

module.exports = { setupTodoEvents, setupTodoStore };
