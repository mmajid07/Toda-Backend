// Socket.io Client
const socket = io();

// DOM Elements
const todoInput = document.getElementById('todoTitle');
const descriptionInput = document.getElementById('todoDescription');
const addBtn = document.getElementById('addBtn');
const todosList = document.getElementById('todosList');
const emptyState = document.getElementById('emptyState');
const connectionStatus = document.getElementById('connectionStatus');
const statusText = document.getElementById('statusText');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const filterButtons = document.querySelectorAll('.filter-btn');
const totalTodosEl = document.getElementById('totalTodos');
const completedTodosEl = document.getElementById('completedTodos');
const pendingTodosEl = document.getElementById('pendingTodos');

// State
let todos = [];
let currentFilter = 'all';

// Socket Connection Events
socket.on('connect', () => {
  updateConnectionStatus(true);
  socket.emit('getTodos');
});

socket.on('disconnect', () => {
  updateConnectionStatus(false);
});

socket.on('connected', (data) => {
  console.log('✅ Connected:', data);
});

socket.on('error', (error) => {
  console.error('Error:', error);
  showNotification(error, 'error');
});

// Todo Events
socket.on('todosList', (todoList) => {
  todos = todoList;
  renderTodos();
  updateStats();
});

socket.on('todoAdded', (todo) => {
  todos.push(todo);
  renderTodos();
  updateStats();
  clearInputs();
  showNotification('✅ Todo added!', 'success');
});

socket.on('todoUpdated', (todo) => {
  const index = todos.findIndex(t => t.id === todo.id);
  if (index !== -1) {
    todos[index] = todo;
    renderTodos();
    updateStats();
    showNotification('✏️ Todo updated!', 'success');
  }
});

socket.on('todoToggled', (todo) => {
  const index = todos.findIndex(t => t.id === todo.id);
  if (index !== -1) {
    todos[index] = todo;
    renderTodos();
    updateStats();
  }
});

socket.on('todoDeleted', (data) => {
  todos = todos.filter(t => t.id !== data.id);
  renderTodos();
  updateStats();
  showNotification('🗑️ Todo deleted!', 'success');
});

socket.on('completedCleared', (data) => {
  todos = todos.filter(t => !data.deletedIds.includes(t.id));
  renderTodos();
  updateStats();
  showNotification('🧹 Completed todos cleared!', 'success');
});

// Event Listeners
addBtn.addEventListener('click', addTodo);
todoInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && todoInput.value.trim()) {
    addTodo();
  }
});

clearCompletedBtn.addEventListener('click', () => {
  if (todos.some(t => t.completed)) {
    socket.emit('clearCompleted');
  }
});

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTodos();
  });
});

// Functions
function addTodo() {
  const title = todoInput.value.trim();
  const description = descriptionInput.value.trim();

  if (!title) {
    showNotification('Please enter a todo title', 'error');
    return;
  }

  socket.emit('addTodo', { title, description });
}

function editTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;

  const todoItem = document.getElementById(`todo-${id}`);
  if (!todoItem) return;

  // Check if already in edit mode
  if (todoItem.classList.contains('edit-mode')) {
    return;
  }

  todoItem.classList.add('edit-mode');
  todoItem.innerHTML = `
    <input type="text" class="edit-input" value="${escapeHtml(todo.title)}" id="edit-title-${id}">
    <textarea class="edit-textarea" id="edit-desc-${id}" rows="2">${escapeHtml(todo.description)}</textarea>
    <div class="edit-actions">
      <button class="todo-btn todo-btn-edit" onclick="saveTodo('${id}')">Save</button>
      <button class="todo-btn todo-btn-delete" onclick="cancelEdit('${id}')">Cancel</button>
    </div>
  `;

  document.getElementById(`edit-title-${id}`).focus();
}

function saveTodo(id) {
  const title = document.getElementById(`edit-title-${id}`).value.trim();
  const description = document.getElementById(`edit-desc-${id}`).value.trim();

  if (!title) {
    showNotification('Todo title cannot be empty', 'error');
    return;
  }

  socket.emit('updateTodo', { id, title, description });
}

function cancelEdit(id) {
  renderTodos();
}

function deleteTodo(id) {
  if (confirm('Are you sure you want to delete this todo?')) {
    socket.emit('deleteTodo', id);
  }
}

function toggleTodo(id) {
  socket.emit('toggleTodo', id);
}

function getFilteredTodos() {
  switch (currentFilter) {
    case 'active':
      return todos.filter(t => !t.completed);
    case 'completed':
      return todos.filter(t => t.completed);
    default:
      return todos;
  }
}

function renderTodos() {
  const filtered = getFilteredTodos();

  if (filtered.length === 0) {
    todosList.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  todosList.innerHTML = filtered.map(todo => `
    <div class="todo-item ${todo.completed ? 'completed' : ''}" id="todo-${todo.id}">
      <input 
        type="checkbox" 
        class="todo-checkbox" 
        ${todo.completed ? 'checked' : ''} 
        onchange="toggleTodo('${todo.id}')"
      >
      <div class="todo-content">
        <div class="todo-title">${escapeHtml(todo.title)}</div>
        ${todo.description ? `<div class="todo-description">${escapeHtml(todo.description)}</div>` : ''}
        <div class="todo-meta">
          Created: ${formatDate(new Date(todo.createdAt))}
        </div>
      </div>
      <div class="todo-actions">
        <button class="todo-btn todo-btn-edit" onclick="editTodo('${todo.id}')">Edit</button>
        <button class="todo-btn todo-btn-delete" onclick="deleteTodo('${todo.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function updateStats() {
  const completed = todos.filter(t => t.completed).length;
  const pending = todos.length - completed;

  totalTodosEl.textContent = todos.length;
  completedTodosEl.textContent = completed;
  pendingTodosEl.textContent = pending;

  clearCompletedBtn.disabled = completed === 0;
}

function updateConnectionStatus(connected) {
  if (connected) {
    connectionStatus.classList.remove('disconnected');
    connectionStatus.classList.add('connected');
    statusText.textContent = '🟢 Connected';
  } else {
    connectionStatus.classList.remove('connected');
    connectionStatus.classList.add('disconnected');
    statusText.textContent = '🔴 Disconnected';
  }
}

function clearInputs() {
  todoInput.value = '';
  descriptionInput.value = '';
  todoInput.focus();
}

function formatDate(date) {
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function showNotification(message, type = 'info') {
  // Simple notification (can be enhanced with a toast library)
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  clearInputs();
});
