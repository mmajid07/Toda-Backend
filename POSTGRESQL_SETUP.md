# PostgreSQL Integration - Setup Guide

## Quick Start

### Using Docker Compose (Recommended)
```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# Run app
npm start

# Access app
http://localhost:3005
```

## Environment Configuration

Create `.env` file:
```bash
# Server
NODE_ENV=development
PORT=3005

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=todo_db
DB_USER=postgres
DB_PASSWORD=postgres

# Redis (for sessions & caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Session
SESSION_SECRET=your-secret-key-change-this
```

## Architecture

```
Todo App (Node.js/Express)
    ↓
    ├─→ PostgreSQL (Primary Data Store)
    │   └─ Todos table with full CRUD
    │
    └─→ Redis (Sessions & Real-time)
        ├─ Express sessions
        └─ Socket.io adapter
```

## Database Schema

PostgreSQL creates this table automatically:

```sql
CREATE TABLE todos (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes
- `completed` - Fast filtering active/completed todos
- `priority` - Fast filtering by priority level
- `created_at` - Fast sorting by date

## Redis Usage

Redis is used for:
1. **Express Sessions** - User session storage
2. **Socket.io Adapter** - Real-time sync across server instances
3. **Future Caching** - Cache frequently accessed data

## Data Persistence

### PostgreSQL
- ✅ Persistent storage (survives restart)
- ✅ ACID transactions
- ✅ Backup & recovery
- ✅ Complex queries

### Redis
- ✅ Session data (expires after 24 hours)
- ✅ Real-time broadcast adapter
- ✅ AOF (Append Only File) persistence

## Docker Compose Services

```yaml
postgres:
  - Image: postgres:16-alpine
  - Port: 5432
  - Database: todo_db
  - User: postgres
  - Password: postgres
  - Volume: postgres-data (persistent)
  - Health Check: pg_isready

redis:
  - Image: redis:7-alpine
  - Port: 6379
  - Volume: redis-data (persistent)
  - Command: redis-server --appendonly yes
  - Health Check: redis-cli ping

todo-app:
  - Depends on: postgres + redis (healthy)
  - Ports: 3005:3005
  - Environment: DB_* and REDIS_* vars
```

## Verification

### Check Services Running
```bash
docker-compose ps
```

### Test Database Connection
```bash
curl http://localhost:3005/health
# Expected: {"status":"OK","redis":"connected",...}
```

### Test Adding a Todo
1. Open http://localhost:3005
2. Add a todo with priority
3. Check it persists in database:
```bash
docker-compose exec postgres psql -U postgres -d todo_db -c "SELECT * FROM todos LIMIT 1;"
```

### Test Redis
```bash
docker-compose exec redis redis-cli ping
# Expected: PONG
```

## Common Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove all data (WARNING!)
docker-compose down -v

# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d todo_db

# Access Redis CLI
docker-compose exec redis redis-cli

# Restart service
docker-compose restart postgres

# View service stats
docker-compose stats
```

## Features Now Enabled

✅ **Dark/Light Mode** - Persisted in localStorage
✅ **Priority Levels** - Stored in PostgreSQL
✅ **Real-time Sync** - Via Socket.io + Redis
✅ **Data Persistence** - PostgreSQL database
✅ **Session Management** - Redis sessions
✅ **Multiple Connections** - Redis adapter for clustering

## Next: AWS Deployment

For AWS, use:
- **RDS PostgreSQL** (db.t2.micro - free tier)
- **ElastiCache Redis** (cache.t2.micro - free tier)
- **EC2** (t2.micro - free tier)

See ARCHITECTURE.md for AWS setup instructions.
