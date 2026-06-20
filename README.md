# 📝 Real-Time Todo App with Socket.io & Redis

A modern, real-time todo application built with Node.js, Express, Socket.io, and Redis for live updates and persistent data storage across multiple connected clients.

## ✨ Features

- ✅ **Real-Time Updates**: Changes instantly sync across all connected clients using Socket.io
- 📝 **Create, Read, Update, Delete**: Full CRUD operations for todos
- ✓ **Toggle Completion**: Mark todos as complete/incomplete
- 🏷️ **Add Descriptions**: Rich todo items with title and optional description
- 🔍 **Filter Todos**: View All, Active, or Completed todos
- 📊 **Live Statistics**: Real-time counter for total, completed, and pending todos
- 🗑️ **Bulk Actions**: Clear all completed todos at once
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔌 **Connection Status**: Visual indicator of server connection status
- 💾 **Persistent Storage**: All data saved in Redis
- 🛡️ **Session Management**: Express-session with Redis store
- 🚀 **Horizontally Scalable**: Socket.io Redis adapter for multiple server instances
- ⚡ **High Performance**: In-memory caching with Redis

## 📁 Folder Structure

```
.
├── src/
│   ├── server.js                 # Main Express + Socket.io + Redis server
│   ├── config/
│   │   └── app.config.js        # Application configuration
│   ├── models/
│   │   └── todo.js              # Todo model and RedisTodoStore
│   ├── socketHandlers/
│   │   └── todoEvents.js         # Socket.io event handlers
│   └── utils/
│       └── redisClient.js        # Redis client utilities
├── public/
│   ├── index.html               # Frontend HTML
│   ├── css/
│   │   └── style.css            # Styling
│   └── js/
│       └── client.js            # Socket.io client code
├── package.json
├── dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Redis 6+ (or use Docker)
- npm or yarn

### Local Development (with Redis)

#### Option 1: Using Docker Compose (Recommended)
```bash
# Clone/navigate to project
cd Learning\ Docker

# Build and start services
docker-compose up --build

# Open http://localhost:3005
```

#### Option 2: Manual Setup
```bash
# 1. Start Redis (if not already running)
redis-server

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env

# 4. Start the server
npm start

# 5. Open http://localhost:3005
```

### Development with Auto-Reload
```bash
npm install --save-dev nodemon
npm run dev
```

## 🔌 Redis Integration

### What Redis is Used For

1. **Data Persistence**: All todos are stored in Redis
   - Uses Redis Hash for each todo
   - Uses Redis List to maintain todo order
   - Auto-expiration after 7 days

2. **Session Management**: User sessions stored in Redis
   - Uses `express-session` with `connect-redis`
   - 24-hour session expiration
   - Secure cookies

3. **Horizontal Scaling**: Socket.io Redis Adapter
   - Enables multiple server instances
   - Broadcasting across servers
   - Shared state management

### Redis Data Structure

```
# Each todo stored as:
todo:{id} = {
  id: "uuid",
  title: "Todo title",
  description: "Description",
  completed: "true|false",
  createdAt: "ISO timestamp",
  updatedAt: "ISO timestamp"
}

# List of all todo IDs:
todos:list = [id1, id2, id3, ...]

# Session data:
sess:{sessionId} = {...session data...}
```

### Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3005

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Session
SESSION_SECRET=your-secret-key-change-in-production
```

## 📦 Dependencies

### Core
- `express` - Web framework
- `socket.io` - Real-time communication
- `uuid` - Unique ID generation

### Redis & Persistence
- `redis` - Redis client for Node.js
- `@socket.io/redis-adapter` - Socket.io horizontal scaling
- `express-session` - Session management
- `connect-redis` - Redis session store

### Development
- `nodemon` - Auto-reload development server
- `dotenv` - Environment variables

## 🎯 API Endpoints

### HTTP Routes
- `GET /` - Serve the main application
- `GET /health` - Health check (includes Redis status)
- `GET /stats` - Server statistics (connected clients, Redis info)

### Socket.io Events

#### Client → Server
- `getTodos` - Request all todos
- `addTodo` - Add a new todo
  - Payload: `{ title: string, description?: string }`
- `updateTodo` - Update an existing todo
  - Payload: `{ id: string, title: string, description?: string }`
- `toggleTodo` - Toggle completion status
  - Payload: `id: string`
- `deleteTodo` - Delete a todo
  - Payload: `id: string`
- `clearCompleted` - Delete all completed todos

#### Server → Client
- `todosList` - List of all todos
- `todoAdded` - Confirmation of added todo
- `todoUpdated` - Confirmation of updated todo
- `todoToggled` - Confirmation of toggled todo
- `todoDeleted` - Confirmation of deleted todo
- `completedCleared` - Confirmation of bulk delete
- `connected` - Connection confirmation
- `error` - Error message

## 🐳 Docker Deployment

### Single Container
```bash
docker build -t todo-app .
docker run -p 3005:3005 -e REDIS_HOST=redis-host todo-app
```

### Docker Compose (Full Stack)
```bash
# Build and start
docker-compose up --build

# Stop
docker-compose down

# View logs
docker-compose logs -f todo-app

# Scale multiple instances
docker-compose up --build --scale todo-app=3
```

### Production Deployment
```env
NODE_ENV=production
REDIS_HOST=redis.example.com
REDIS_PASSWORD=secure-password
SESSION_SECRET=generate-secure-random-secret
```

## 🛠️ Technologies

- **Backend**: Node.js, Express.js, Socket.io, Redis
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Containerization**: Docker, Docker Compose
- **Data Store**: Redis (with persistence)
- **Session Store**: Redis

## 📊 Monitoring & Debugging

### Health Check
```bash
curl http://localhost:3005/health
```

### Stats Endpoint
```bash
curl http://localhost:3005/stats
```

### Redis CLI (Inside Docker)
```bash
docker exec -it todo-redis redis-cli
> KEYS *
> HGETALL todo:{id}
> LRANGE todos:list 0 -1
> DBSIZE
```

### View Logs
```bash
docker-compose logs -f todo-app
```

## 🌟 Features to Enhance

- [ ] User authentication & multi-user support
- [ ] Todo categories/tags
- [ ] Due dates and reminders
- [ ] Collaborative features (shared lists)
- [ ] Dark mode toggle
- [ ] Export/Import functionality
- [ ] Undo/Redo functionality
- [ ] Full-text search with Redis
- [ ] Real-time notifications
- [ ] Offline support with Service Workers

## 📝 Development Notes

- Todos are stored in Redis with 7-day auto-expiration
- Sessions stored in Redis with 24-hour expiration
- Socket.io Redis adapter enables horizontal scaling
- All operations are async/await based
- Connection pooling handled by redis client

## 🐛 Troubleshooting

### Redis Connection Error
```
❌ Redis connection failed: ECONNREFUSED
```
- Ensure Redis is running: `redis-server`
- Or use Docker: `docker-compose up redis`

### Session Not Persisting
- Check Redis is running
- Verify `REDIS_HOST` and `REDIS_PORT` in `.env`
- Clear browser cookies and restart

### Port Already in Use
```bash
# Kill process on port 3005
lsof -ti:3005 | xargs kill -9
```

## 🤝 Contributing

Feel free to fork, modify, and improve this project!

## 📄 License

ISC

## 🎓 Learning Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [Express.js Guide](https://expressjs.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Node.js Redis Client](https://github.com/redis/node-redis)
