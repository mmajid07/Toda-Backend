# 📚 Redis Integration Guide

## Overview

Redis has been integrated into the todo app for:
1. **Data Persistence** - Persistent storage of all todos
2. **Session Management** - User session storage
3. **Horizontal Scaling** - Socket.io Redis adapter for multiple server instances

## Installation & Setup

### Using Docker Compose (Recommended)
```bash
docker-compose up --build
```

This automatically:
- Starts Redis container
- Starts Todo app container
- Connects them via Docker network

### Manual Setup

#### Install Redis
```bash
# macOS
brew install redis

# Ubuntu/Debian
sudo apt-get install redis-server

# Windows (using WSL2 or Docker)
docker run -d -p 6379:6379 redis:7-alpine
```

#### Start Redis
```bash
redis-server
```

#### Verify Connection
```bash
redis-cli ping
# Should output: PONG
```

## Configuration

### Environment Variables
Create `.env` file in project root:

```env
# Redis Connection
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=           # Leave empty for no authentication

# Session
SESSION_SECRET=your-secret-key
```

### Production Settings
```env
NODE_ENV=production
REDIS_HOST=redis.production.com
REDIS_PORT=6379
REDIS_PASSWORD=secure-production-password
SESSION_SECRET=generate-secure-random-key
```

## Data Storage

### Todo Storage

Each todo is stored as a Redis Hash:

```redis
HSET todo:{uuid} id {uuid} title "Buy groceries" description "Milk, eggs" completed false createdAt "2024-06-20T10:00:00Z" updatedAt "2024-06-20T10:00:00Z"
```

### Todo List

All todo IDs are stored in a Redis List:

```redis
LPUSH todos:list {uuid1} {uuid2} {uuid3}
```

### Example Operations

```bash
# View all todo IDs
LRANGE todos:list 0 -1

# Get a specific todo
HGETALL todo:{uuid}

# Delete a todo
DEL todo:{uuid}
LREM todos:list 0 {uuid}

# Count total todos
LLEN todos:list

# Get all todos with pattern
KEYS todo:*
```

## Session Storage

### Session Data

```redis
HSET sess:{sessionId} data {...session_data...} cookie {...cookie_data...}
```

### Session Expiration

Sessions automatically expire after 24 hours:

```redis
EXPIRE sess:{sessionId} 86400  # 24 hours in seconds
```

## Socket.io Redis Adapter

### What It Does

Enables Socket.io to work across multiple server instances:

```
┌─────────────┐       ┌──────────┐       ┌─────────────┐
│  Server 1   ├───┬───┤  Redis   ├───┬───┤  Server 2   │
├─────────────┤   │   └──────────┘   │   ├─────────────┤
│ Socket.io   │   │                  │   │ Socket.io   │
│ Adapter     │───┴──────────────────┴───│ Adapter     │
└─────────────┘                          └─────────────┘
```

### Benefits

- Messages broadcasted across all servers
- Session data shared across servers
- Horizontal scaling support

## Monitoring Redis

### Redis CLI Commands

```bash
# Connect to Redis
redis-cli

# Basic commands
PING                    # Check connection
INFO                    # Get server information
DBSIZE                  # Number of keys
FLUSHDB                 # Clear current database
FLUSHALL                # Clear all databases

# Key commands
KEYS *                  # List all keys
KEYS todo:*             # List all todos
KEYS sess:*             # List all sessions
EXISTS key              # Check if key exists
TTL key                 # Get expiration time
EXPIRE key 3600         # Set expiration
PERSIST key             # Remove expiration

# Data inspection
HGETALL key             # Get all hash fields
LRANGE key 0 -1         # List all items
STRLEN key              # String length
LLEN key                # List length
HLEN key                # Hash field count
```

### Inside Docker

```bash
# Connect to Redis container
docker exec -it todo-redis redis-cli

# Monitor live commands
MONITOR

# Continuous stats
INFO STATS
```

### Using Redis GUI Tools

Popular GUI clients:
- **Redis Desktop Manager** (Windows, macOS, Linux)
- **Another Redis Desktop Manager** (Cross-platform)
- **RedisInsight** (Official Redis GUI)
- **VSCode Redis Extension**

## Performance Optimization

### Connection Pooling

Redis client automatically handles connection pooling:

```javascript
// Single client instance used throughout app
const client = createClient({...});
```

### Command Batching

For bulk operations, Redis pipeline is used:

```javascript
// Efficient for multiple operations
await Promise.all([
  client.del(key1),
  client.del(key2),
  client.del(key3)
]);
```

### Expiration Strategy

- Todos expire after 7 days
- Sessions expire after 24 hours
- Prevents unlimited data growth

## Troubleshooting

### Connection Issues

**Error**: `ECONNREFUSED 127.0.0.1:6379`

Solutions:
```bash
# Check if Redis is running
ps aux | grep redis

# Start Redis
redis-server

# Using Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Performance Issues

**Monitor Redis memory:**
```bash
redis-cli INFO memory
```

**Clear old data:**
```bash
redis-cli FLUSHDB
```

**Check active connections:**
```bash
redis-cli INFO clients
```

### Docker Issues

**Redis container not running:**
```bash
docker-compose ps
docker-compose restart redis
docker-compose logs redis
```

**Port conflicts:**
```bash
lsof -i :6379
kill -9 <PID>
```

## Security Best Practices

### Authentication

```env
REDIS_PASSWORD=strong-password-123
```

### Network Isolation

```yaml
networks:
  todo-network:  # Only accessible within this network
    driver: bridge
```

### Connection Security

For production, use:
- TLS/SSL connections
- Network firewall rules
- VPC restrictions
- Redis ACL (Redis 6+)

### Data Protection

```bash
# Enable AOF (Append Only File)
redis-server --appendonly yes

# Enable RDB snapshots
redis-server --save 60 1000
```

## Scaling & High Availability

### Horizontal Scaling

Scale multiple instances:
```bash
docker-compose up --scale todo-app=3
```

All instances share state via Redis.

### Redis Cluster

For high availability:
```bash
redis-server --cluster-enabled yes
```

### Redis Sentinel

Monitor and failover:
```yaml
sentinel:
  image: redis:7-alpine
  command: redis-sentinel /etc/redis/sentinel.conf
```

## Backup & Recovery

### Backup Data

```bash
# RDB snapshot
redis-cli BGSAVE

# Copy dump.rdb
docker cp todo-redis:/data/dump.rdb ./backup/

# AOF file (continuous)
docker cp todo-redis:/data/appendonly.aof ./backup/
```

### Restore Data

```bash
# Copy backup file
docker cp ./backup/dump.rdb todo-redis:/data/

# Restart container
docker-compose restart redis
```

## Integration Examples

### Read Todo from Redis

```javascript
const todo = await todoStore.getTodo(id);
// Internally uses: HGETALL todo:{id}
```

### Save Session to Redis

```javascript
// Automatically handled by express-session + connect-redis
req.session.userId = 123;
// Internally uses: HSET sess:{sessionId} ...
```

### Broadcast via Socket.io Adapter

```javascript
// Message sent to all connected servers
io.emit('todoAdded', todo);
// Redis adapter distributes to all servers
```

## References

- [Redis Official Documentation](https://redis.io/documentation)
- [Node Redis Client](https://github.com/redis/node-redis)
- [Express-session](https://github.com/expressjs/session)
- [Socket.io Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [Redis Commands](https://redis.io/commands/)
- [Redis Best Practices](https://redis.io/topics/security)
