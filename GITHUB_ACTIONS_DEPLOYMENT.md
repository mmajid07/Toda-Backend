# GitHub Actions & AWS Deployment Configuration

Complete CI/CD setup for automated deployment to AWS.

## 📁 Files Overview

### GitHub Workflows (`.github/workflows/`)

| File | Purpose | Triggers |
|------|---------|----------|
| `deploy.yml` | Main CI/CD pipeline | Push to main/develop, Pull requests, Manual |
| `test.yml` | Testing & linting | Push to main/develop, Pull requests |

### AWS Configuration (`.aws/`)

| File | Purpose |
|------|---------|
| `task-definition.json` | ECS task definition (Fargate) |

### Documentation

| File | Purpose |
|------|---------|
| `GITHUB_ACTIONS_AWS_SETUP.md` | Detailed step-by-step setup guide |
| `QUICK_DEPLOYMENT_GUIDE.md` | Quick reference and quick start |
| `GITHUB_ACTIONS_REFERENCE.md` | Workflow syntax and advanced features |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/setup-aws-github-actions.sh` | Automated AWS setup script |

## 🚀 Quick Start

### Option 1: Automated Setup (Recommended)

```bash
# Run setup script (requires AWS CLI configured)
chmod +x scripts/setup-aws-github-actions.sh
./scripts/setup-aws-github-actions.sh

# Follow prompts and add GitHub secrets
```

### Option 2: Manual Setup

Follow steps in `QUICK_DEPLOYMENT_GUIDE.md` or `GITHUB_ACTIONS_AWS_SETUP.md`

### Step 3: Push & Deploy

```bash
git add .
git commit -m "Setup GitHub Actions for AWS deployment"
git push origin main

# Monitor at GitHub → Actions tab
```

## 📋 Setup Checklist

- [ ] AWS CLI configured locally
- [ ] GitHub repository set up
- [ ] AWS IAM role created
- [ ] ECR repository created
- [ ] GitHub secrets added:
  - `AWS_ROLE_TO_ASSUME`
  - `AWS_ACCOUNT_ID`
  - (Optional) `SLACK_WEBHOOK_URL`
  - (Optional) `EC2_SSH_PRIVATE_KEY`
- [ ] Code pushed to GitHub
- [ ] Workflow triggered and monitoring

## 🔄 Workflow Execution Flow

```
Push to main/develop
        ↓
Build Job
├─ Checkout code
├─ Setup Node.js
├─ Install dependencies
├─ Run linter
├─ Run tests
├─ Build Docker image
└─ Push to ECR
        ↓
Deploy Job (on main branch only)
├─ Update task definition
└─ Deploy to ECS or EC2
        ↓
Slack Notification (optional)
└─ Send status to Slack
```

## 🎯 Deployment Options

### ECS Fargate (Recommended for Production)

**Advantages**: Auto-scaling, managed, serverless

**Setup**:
1. Create ECS cluster: `todo-app-cluster`
2. Create ECS service: `todo-app-service`
3. Update task definition: `.aws/task-definition.json`

**Cost**: ~$30-50/month

### EC2 (Recommended for Development)

**Advantages**: Full control, cheaper, flexible

**Setup**:
1. Launch EC2 instance (t3.micro free tier eligible)
2. Tag with `Name=todo-app-instance`
3. Add SSH key to GitHub secrets

**Cost**: ~$8/month (or free with free tier)

### App Runner (Easiest Setup)

**Advantages**: Simplest, auto HTTPS, load balanced

**Setup**:
1. Direct ECR → App Runner deployment
2. Configure only secrets and environment

**Cost**: ~$10-20/month

## 🔐 Security Features

- ✅ OIDC authentication (no long-lived credentials)
- ✅ Minimal IAM permissions
- ✅ Secrets in GitHub Secrets Manager
- ✅ Environment-specific configurations
- ✅ Encrypted data in transit

## 📊 Monitoring Deployments

### GitHub Actions
```
GitHub → Actions tab → Select workflow
```

### AWS CloudWatch
```bash
# View ECS logs
aws logs tail /ecs/todo-app --follow

# View EC2 logs
ssh -i key.pem ec2-user@INSTANCE_IP
docker-compose logs -f
```

### Application Monitoring
- Health check: `http://DEPLOYMENT_URL/health`
- Stats: `http://DEPLOYMENT_URL/stats`

## 🛠️ Configuration

### Environment Variables

**In `.env` file** (local development):
```env
NODE_ENV=development
PORT=3005
REDIS_HOST=localhost
REDIS_PORT=6379
```

**In GitHub Secrets** (CI/CD):
```
AWS_ROLE_TO_ASSUME
AWS_ACCOUNT_ID
```

**In `.aws/task-definition.json`** (ECS deployment):
```json
"environment": [
  {"name": "REDIS_HOST", "value": "redis.internal"},
  {"name": "REDIS_PORT", "value": "6379"}
]
```

## 📝 Common Tasks

### Update Deployment Settings

1. Edit workflow: `.github/workflows/deploy.yml`
2. Edit task definition: `.aws/task-definition.json`
3. Commit and push to trigger

### Add Slack Notifications

1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Add to GitHub secrets: `SLACK_WEBHOOK_URL`
3. Notification happens automatically

### Deploy to EC2

1. Create EC2 instance
2. Install Docker & Docker Compose
3. Add SSH key to GitHub secrets: `EC2_SSH_PRIVATE_KEY`
4. Uncomment EC2 deployment job in `deploy.yml`

### Manual Deployment Trigger

1. Go to `Actions` tab
2. Select `CI/CD - Build and Deploy to AWS`
3. Click `Run workflow`
4. Select branch and click `Run`

## 🐛 Troubleshooting

### Build Failed

**Check**:
- Dockerfile builds locally: `docker build .`
- Dependencies install: `npm ci`
- Tests pass: `npm test`

**Logs**: GitHub Actions → Failed workflow → View logs

### Deployment Failed

**Check**:
- AWS credentials valid
- IAM role has permissions
- ECS cluster/service exists
- Task definition valid

**Logs**: 
- GitHub Actions: View step output
- AWS CloudWatch: `aws logs tail /ecs/todo-app`

### Secrets Not Found

**Check**:
- Secrets added to repository
- Correct secret name in workflow
- Secret value not empty

**Fix**: Settings → Secrets → Review and update

## 📚 Documentation

- [QUICK_DEPLOYMENT_GUIDE.md](./QUICK_DEPLOYMENT_GUIDE.md) - Fast setup (5-15 min)
- [GITHUB_ACTIONS_AWS_SETUP.md](./GITHUB_ACTIONS_AWS_SETUP.md) - Comprehensive setup
- [GITHUB_ACTIONS_REFERENCE.md](./GITHUB_ACTIONS_REFERENCE.md) - Syntax reference
- [README.md](./README.md) - Project overview

## 🔗 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/best-practices.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)

## ⏱️ Time Estimates

- Automated setup: 10 minutes
- Manual setup: 30 minutes
- First deployment: 5-10 minutes
- Subsequent deployments: 2-3 minutes

## 💡 Tips & Tricks

### Speed Up Builds
- Use Docker layer caching (configured)
- Use npm cache (configured)
- Parallelize independent jobs

### Reduce Costs
- Use free tier services
- Leverage GitHub Actions free tier
- Use t3.micro for EC2
- Schedule expensive tasks during off-hours

### Improve Reliability
- Add health checks
- Use circuit breakers
- Implement gradual rollouts
- Monitor error rates

## 🎉 Next Steps

1. [ ] Complete setup using Quick Start Guide
2. [ ] Push code to GitHub
3. [ ] Monitor first deployment
4. [ ] Configure monitoring & alerts
5. [ ] Set up auto-scaling (if using ECS)
6. [ ] Document deployment runbook

---

**Status**: ✅ All files ready for deployment!

**Support**: See documentation files for detailed help.
