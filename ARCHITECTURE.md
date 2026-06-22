# Todo App Architecture - PostgreSQL + Redis

## Overview
The Todo app now uses a **hybrid database architecture**:
- **PostgreSQL**: Primary database for persistent todo data
- **Redis**: Session storage and caching layer

## Architecture Diagram

```
┌─────────────────────────────────────────┐
│       Real-Time Todo App (Node.js)      │
│   Express + Socket.io + Features:       │
│   - Dark/Light Mode                     │
│   - Priority Levels (High/Med/Low)      │
│   - Real-time sync via Socket.io        │
└──────────────┬──────────────┬───────────┘
               │              │
        ┌──────▼──────┐  ┌────▼─────┐
        │ PostgreSQL  │  │  Redis   │
        │  (Primary)  │  │ (Cache)  │
        │             │  │          │
        │ • Todos     │  │ Sessions │
        │ • Queries   │  │ Adapters │
        │ • Backups   │  │ Caching  │
        └─────────────┘  └──────────┘
```

## Services

### PostgreSQL (Primary Database)
**Purpose**: Persistent data storage for todos

**Features**:
- ✅ ACID transactions
- ✅ Complex queries (sorting, filtering, pagination)
- ✅ Indexes for fast lookups
- ✅ Backup and recovery
- ✅ Data durability

**Schema**:
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

**Operations**:
- Add todo
- Get single todo
- Get all todos
- Update todo
- Toggle todo completion
- Delete todo
- Clear completed todos

### Redis (Cache & Sessions)
**Purpose**: Session management and Socket.io adapter

**Features**:
- ✅ User session storage
- ✅ Socket.io real-time adapter
- ✅ Fast in-memory caching
- ✅ Data persistence (AOF)

**Usage**:
- Express session store (express-session + connect-redis)
- Socket.io Redis adapter for multi-server support

## Environment Configuration

### Development (.env)
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

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Session
SESSION_SECRET=your-secret-key
```

### Docker Compose
```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: 5432:5432
    volumes: postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: 6379:6379
    volumes: redis-data:/data

  todo-app:
    depends_on:
      postgres: service_healthy
      redis: service_healthy
```

## Deployment

### Local Development
```bash
# Install dependencies
npm install

# Ensure .env is configured
cat .env

# Start services
docker-compose up -d

# Run app
npm start
```

### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f todo-app

# Stop all services
docker-compose down
```

### AWS Deployment

#### Option 1: Self-Hosted (EC2 + RDS + ElastiCache)
```bash
# EC2 instance
- OS: Ubuntu 22.04
- Instance: t2.micro (free tier)
- Security: Allow ports 3005, 22

# RDS PostgreSQL
- Instance: db.t2.micro (free tier)
- Database: todo_db
- Storage: 20GB free tier

# ElastiCache Redis
- Instance: cache.t2.micro (free tier)
- Engine: Redis 7
- Port: 6379
```

#### Option 2: Using AWS Services
```bash
# Commands to create services on AWS

# RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier todo-db \
  --db-instance-class db.t2.micro \
  --engine postgres \
  --master-username postgres \
  --allocated-storage 20

# ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id todo-redis \
  --cache-node-type cache.t2.micro \
  --engine redis
```

## Data Flow

### Adding a Todo
```
Client
  ↓
Socket.io (emit 'addTodo')
  ↓
Server (todoEvents handler)
  ↓
PostgreSQL (INSERT)
  ↓
Return todo object
  ↓
Socket.io (broadcast 'todoAdded')
  ↓
All connected clients receive update
```

### Session Management
```
Client Login
  ↓
Express Session Created
  ↓
Stored in Redis
  ↓
Session ID sent to client (cookie)
  ↓
Client includes session in requests
  ↓
Redis retrieves session for validation
```

## Features

### Dark/Light Mode
- Stored in localStorage (client-side)
- CSS variables adjust colors
- No server-side storage needed

### Priority Levels
- **High** (🔴 Red): Priority.priority = 'high'
- **Medium** (🟡 Orange): Priority.priority = 'medium'
- **Low** (🟢 Green): Priority.priority = 'low'
- Stored in PostgreSQL `priority` column
- Color-coded borders in UI

### Real-Time Updates
- Socket.io broadcasts to all connected clients
- Redis adapter enables multi-server support
- No polling needed

## Performance Considerations

### PostgreSQL Optimizations
- ✅ Indexes on: completed, priority, created_at
- ✅ TIMESTAMP auto-update for updated_at
- ✅ UUID primary key for scalability

### Redis Optimizations
- ✅ AOF persistence for durability
- ✅ Memory-efficient session storage
- ✅ Fast key-value operations

### Caching Strategy
1. Session data → Redis
2. Real-time updates → Socket.io + Redis adapter
3. Historical data → PostgreSQL

## Monitoring & Maintenance

### Health Checks
```bash
# PostgreSQL
curl http://localhost:3005/health

# Redis
redis-cli ping

# App status
curl http://localhost:3005/stats
```

### Backups
```bash
# PostgreSQL backup
pg_dump -U postgres -h localhost todo_db > backup.sql

# Redis backup
redis-cli --rdb /backup/dump.rdb
```

### Logs
```bash
# Docker logs
docker-compose logs -f postgres
docker-compose logs -f redis
docker-compose logs -f todo-app
```

## Scaling Considerations

### Vertical Scaling
- Increase EC2 instance size
- Increase RDS instance class
- Increase ElastiCache instance size

### Horizontal Scaling
- Multiple app instances behind load balancer
- Redis adapter enables Socket.io clustering
- Read replicas for PostgreSQL

## Security Best Practices

### Development
- Use strong SESSION_SECRET
- Enable .env in .gitignore
- Use environment variables for credentials

### Production
- Enable SSL/TLS for connections
- Use AWS Secrets Manager
- Enable encryption at rest for RDS
- Use security groups for network isolation
- Enable VPC for database access

## Troubleshooting

### PostgreSQL Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection string
DB_HOST=localhost DB_PORT=5432 DB_USER=postgres
```

### Redis Connection Failed
```bash
# Check if Redis is running
docker-compose ps

# Test Redis connection
redis-cli ping

# Check Redis logs
docker-compose logs redis
```

### Todos Not Persisting
```bash
# Check if table exists
docker-compose exec postgres psql -U postgres -d todo_db -c "\dt todos"

# Check data
docker-compose exec postgres psql -U postgres -d todo_db -c "SELECT * FROM todos;"
```

## Future Enhancements

- [ ] User authentication (JWT)
- [ ] Todo categories/tags
- [ ] Recurring todos
- [ ] Todo reminders (SQS + SNS)
- [ ] File attachments (S3)
- [ ] Advanced search (Elasticsearch)
- [ ] Analytics dashboard
- [ ] Mobile app support
