require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const { setupTodoEvents, setupTodoStore } = require('./socketHandlers/todoEvents');
const { createAdapter } = require('@socket.io/redis-adapter');
const db = require('./utils/database');

const app = express();
const server = http.createServer(app);

// Redis Setup
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
console.log(`[Redis] Connecting to ${REDIS_HOST}:${REDIS_PORT}`);

const redisClient = createClient({
  socket: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
  password: process.env.REDIS_PASSWORD || undefined
});

redisClient.on('error', (err) => console.error('[Redis] client error:', err.message));
redisClient.on('connect', () => console.log('[Redis] main client connecting...'));
redisClient.on('ready', () => console.log('[Redis] main client ready'));

const pubClient = redisClient.duplicate();
pubClient.on('error', (err) => console.error('[Redis] pub client error:', err.message));
pubClient.on('ready', () => console.log('[Redis] pub client ready'));

const subClient = redisClient.duplicate();
subClient.on('error', (err) => console.error('[Redis] sub client error:', err.message));
subClient.on('ready', () => console.log('[Redis] sub client ready'));

// Connect to Redis
console.log('[Redis] Starting all 3 client connections...');
Promise.all([redisClient.connect(), pubClient.connect(), subClient.connect()])
  .then(() => {
    console.log('✅ Redis all 3 clients connected successfully');
  })
  .catch((err) => {
    console.error('❌ Redis connection failed:', err.message);
    process.exit(1);
  });

// Express Session Setup
const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

app.use(sessionMiddleware);

// Socket.io Setup with Redis Adapter
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  adapter: createAdapter(pubClient, subClient)
});

// Share session between Express and Socket.io
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Database
db.connect()
  .then(() => db.initializeSchema())
  .then(() => {
    console.log('✅ Database initialized successfully');
  })
  .catch((err) => {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  });

// Setup todo store
setupTodoStore();

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const redisHealth = await redisClient.ping();
    res.json({
      status: 'OK',
      message: 'Todo server is running',
      redis: redisHealth === 'PONG' ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Todo server health check failed',
      redis: 'disconnected',
      error: error.message
    });
  }
});

// Stats endpoint
app.get('/stats', async (req, res) => {
  try {
    const info = await redisClient.info();
    const connectedClients = io.engine.clientsCount;
    
    res.json({
      connectedClients,
      redis: info.split('\r\n').slice(0, 5).join('; ')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);
  console.log(`📊 Connected clients: ${io.engine.clientsCount}`);

  // Setup todo events
  setupTodoEvents(io, socket);

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.close(async () => {
    await db.close();
    await redisClient.quit();
    await pubClient.quit();
    await subClient.quit();
    console.log('✅ Server shutdown complete');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
  console.log(`🚀 Todo server running on http://localhost:${PORT}`);
  console.log(`📊 Open multiple tabs to see real-time updates!`);
  console.log(`💾 Using Redis for data persistence and session storage`);
});