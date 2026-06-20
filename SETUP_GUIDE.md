# 📋 Project Structure & Setup

## Final Project Structure

```
Learning Docker/
├── src/
│   ├── server.js                    # Main Express + Socket.io + Redis server
│   ├── config/
│   │   └── app.config.js           # Configuration management
│   ├── models/
│   │   └── todo.js                 # Todo class & RedisTodoStore
│   ├── socketHandlers/
│   │   └── todoEvents.js           # Socket.io event handlers
│   └── utils/
│       └── redisClient.js          # Redis client utilities
├── public/
│   ├── index.html                   # Frontend UI
│   ├── css/
│   │   └── style.css               # Responsive styling
│   └── js/
│       └── client.js               # Socket.io client & UI logic
├── package.json                     # Dependencies & scripts
├── dockerfile                       # Docker container config
├── docker-compose.yml               # Multi-container orchestration
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore rules
├── README.md                        # Main documentation
└── REDIS_INTEGRATION.md             # Redis detailed guide
```

## ✅ What's Included

### Backend Architecture

✅ **Express Server**
- Static file serving
- Health check endpoint
- Stats endpoint

✅ **Socket.io Integration**
- Real-time bidirectional communication
- Redis adapter for scaling
- Session sharing with Express

✅ **Redis Integration**
- Persistent todo storage with expiration
- Session management
- Horizontal scaling support

✅ **Error Handling**
- Graceful shutdown
- Connection error handling
- Async/await error catching

### Frontend Features

✅ **Real-Time UI Updates**
- Live todo synchronization
- Connection status indicator
- Instant feedback on actions

✅ **Full CRUD Operations**
- Create, read, update, delete todos
- Toggle completion status
- Clear completed todos

✅ **Responsive Design**
- Mobile-friendly layout
- Touch-friendly buttons
- Smooth animations

## 🚀 Quick Start Commands

### Development Setup
```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env

# 3. Start Redis (separate terminal)
redis-server

# 4. Start app
npm start

# 5. Open browser
# http://localhost:3005
```

### Docker Setup (Recommended)
```bash
# Build and start all services
docker-compose up --build

# Scale to multiple instances
docker-compose up --build --scale todo-app=3

# Stop services
docker-compose down

# View logs
docker-compose logs -f todo-app
docker-compose logs -f redis
```

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^5.2.1 | Web framework |
| socket.io | ^4.7.2 | Real-time communication |
| redis | ^4.6.12 | Redis client |
| @socket.io/redis-adapter | ^8.1.0 | Horizontal scaling |
| express-session | ^1.17.3 | Session management |
| connect-redis | ^7.1.0 | Redis session store |
| uuid | ^9.0.1 | ID generation |
| dotenv | ^16.3.1 | Environment variables |

## 🔌 Environment Variables

### Required (.env file)
```env
NODE_ENV=development
PORT=3005
REDIS_HOST=localhost
REDIS_PORT=6379
SESSION_SECRET=your-secret-key
```

### Docker Override
```env
REDIS_HOST=redis         # Docker service name
REDIS_PORT=6379
```

### Production
```env
NODE_ENV=production
REDIS_HOST=redis.prod.com
REDIS_PASSWORD=strong-password
SESSION_SECRET=secure-random-key
```

## 📊 Data Flow

### Adding a Todo

```
Client Input
    ↓
Socket.emit('addTodo')
    ↓
Server Event Handler
    ↓
RedisTodoStore.addTodo()
    ↓
Redis Hash Storage
    ↓
Redis List Update
    ↓
io.emit('todoAdded')
    ↓
All Clients Update
```

### Real-Time Sync

```
Client A Updates
    ↓
Socket Event
    ↓
Server Handler
    ↓
Redis Update
    ↓
Redis Adapter
    ↓
All Connected Clients (via Socket.io)
    ↓
UI Updates
```

## 🐛 Debugging Tips

### Enable Verbose Logging
```bash
DEBUG=* npm start
```

### Redis Monitoring
```bash
docker exec -it todo-redis redis-cli
> MONITOR        # Watch all commands
> KEYS *         # List all keys
> DBSIZE         # Count keys
```

### Socket.io Debugging
```javascript
// In client.js
socket.on('*', (eventName, args) => {
  console.log('Socket event:', eventName, args);
});
```

### Health Status
```bash
curl http://localhost:3005/health
curl http://localhost:3005/stats
```

## 🎯 Testing Checklist

- [ ] App starts without errors
- [ ] Can create todos via UI
- [ ] Can see todos in Redis: `KEYS todo:*`
- [ ] Multiple tabs sync in real-time
- [ ] Refresh page preserves todos
- [ ] Filter buttons work correctly
- [ ] Edit functionality works
- [ ] Delete removes from Redis
- [ ] Clear completed works
- [ ] Health check returns OK

## 🚀 Deployment Options

### Docker Compose
Best for: Local development, small deployments
```bash
docker-compose up -d
```

### Kubernetes
Best for: Enterprise, high availability
```bash
kubectl apply -f k8s-deployment.yaml
```

### Cloud Platforms

**Heroku**
```bash
heroku create your-app
git push heroku main
```

**AWS EC2**
```bash
# SSH into instance
docker-compose up -d
```

**Google Cloud Run**
```bash
gcloud run deploy todo-app --source .
```

## 📝 Important Notes

1. **Data Persistence**
   - All todos stored in Redis automatically
   - No data lost on app restart (unlike in-memory)

2. **Session Management**
   - Sessions shared across multiple instances
   - Cookies stored securely

3. **Scalability**
   - Socket.io Redis adapter enables horizontal scaling
   - Can run multiple app instances

4. **Security**
   - Change SESSION_SECRET in production
   - Use Redis authentication for remote connections
   - Enable HTTPS in production

## 🔧 Common Tasks

### Clear All Data
```bash
docker exec todo-redis redis-cli FLUSHDB
```

### Restart Services
```bash
docker-compose restart redis todo-app
```

### View Redis Memory Usage
```bash
docker exec todo-redis redis-cli INFO memory
```

### Export Todo Data
```bash
docker exec todo-redis redis-cli --rdb /tmp/dump.rdb
docker cp todo-redis:/tmp/dump.rdb ./backup/
```

## 📚 Additional Resources

- [Project README](./README.md) - Main documentation
- [Redis Integration Guide](./REDIS_INTEGRATION.md) - Detailed Redis info
- [Redis Docs](https://redis.io/documentation)
- [Socket.io Docs](https://socket.io/docs/)
- [Express Docs](https://expressjs.com/)
- [Docker Docs](https://docs.docker.com/)
