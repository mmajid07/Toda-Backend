# Realtime Todo App — Project Report

## Overview

A real-time collaborative Todo application where multiple users can add, update, delete, and toggle todos simultaneously. All changes are instantly reflected across all open browser tabs without page refresh.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express 5 |
| Real-time | Socket.io 4.7 |
| Database | Redis 7 (via Docker) |
| Session | express-session + connect-redis |
| Container | Docker + Docker Compose |
| Registry | AWS ECR |
| Server | AWS EC2 (Amazon Linux 2023) |
| CI/CD | GitHub Actions |
| Deployment | AWS SSM (no SSH required) |

---

## Architecture

```
Browser
   ↕ Socket.io (WebSocket)
Express Server (port 3005)
   ↕ redis v4 client
Redis (port 6379)
   ├── Todo data (Hash + List)
   └── Session store
```

---

## Features

- Add, edit, delete and toggle todos in real-time
- Filter todos by All / Active / Completed
- Stats counter (total, completed, pending)
- Multi-tab sync via Socket.io + Redis Adapter
- Session persistence via Redis store
- Health check endpoint (`/health`)
- Stats endpoint (`/stats`)

---

## CI/CD Pipeline

```
git push → main
     ↓
GitHub Actions
     ↓
Build Docker image
     ↓
Push to AWS ECR
     ↓
SSM sends commands to EC2:
  - Install docker-compose (if missing)
  - Login to ECR
  - Download docker-compose.prod.yml
  - Pull latest image
  - Remove old containers
  - Start new containers
     ↓
App live at http://54.89.69.1:3005
```

---

## Project Structure

```
├── src/
│   ├── server.js                  # Express + Socket.io + Redis setup
│   ├── models/todo.js             # Todo model + Redis store
│   ├── socketHandlers/
│   │   └── todoEvents.js          # All socket event handlers
│   └── config/app.config.js
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/client.js               # Socket.io client
├── .aws/
│   └── task-definition.json       # ECS task (app + Redis sidecar)
├── .github/
│   └── workflows/
│       ├── deploy.yml             # CI/CD pipeline
│       └── test.yml
├── docker-compose.yml             # Local development
├── docker-compose.prod.yml        # EC2 production
├── dockerfile
└── REPORT.md
```

---

## AWS Infrastructure

| Resource | Value |
|---|---|
| ECR Repository | todo-app |
| EC2 Instance | t3.micro, Amazon Linux 2023 |
| EC2 Public IP | 54.89.69.1 |
| IAM User | m-majid (GitHub Actions) |
| IAM Role (EC2) | ec2-ecr-role (ECR + SSM access) |
| Security Group | Ports 22, 80, 443, 3005 open |
| Region | us-east-1 (N. Virginia) |

---

## Key Bugs Fixed

| Bug | Root Cause | Fix |
|---|---|---|
| Redis warnings spam | Missing `.on('error')` handlers | Added error handlers on all 3 Redis clients |
| Todos not saving | Redis v4 rejects boolean in `hSet` | Added `toRedis()` method to stringify all values |
| Intermittent todo failure | `redisClient` used as both subscriber and command client | Created dedicated `subClient` for Socket.io adapter |
| ECR push failed | Repository did not exist | Created repository manually in AWS Console |
| EC2 deploy conflict | Manually started container blocked compose | Added `docker rm -f` before `docker-compose up` |
| SSH deploy failed | Leaked private key, no valid key in GitHub secrets | Switched to AWS SSM (no SSH key needed) |
| Redis connection refused on ECS | Redis container missing from task definition | Added Redis as sidecar container in ECS task definition |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | App port | `3005` |
| `NODE_ENV` | Environment | `production` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | `undefined` |
| `SESSION_SECRET` | Express session secret | `your-secret-key` |

---

## Local Development

```bash
# Start app + Redis
docker-compose up --build

# Open app
http://localhost:3005

# Check logs
docker logs -f todo-app
```

## Production Deployment

Every push to `main` branch triggers automatic deployment:

```bash
git add .
git commit -m "your message"
git push origin main
```

GitHub Actions handles everything from build to deployment automatically.
