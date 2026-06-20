# Reference: GitHub Actions Workflow Details

## Workflow Files Structure

```
.github/
├── workflows/
│   ├── deploy.yml      # Main CI/CD pipeline (Build → Test → Deploy)
│   └── test.yml        # Testing workflow
```

## Deploy Workflow (`deploy.yml`)

### Trigger Events

```yaml
on:
  push:
    branches: [main, develop]    # Runs on push to main/develop
  pull_request:
    branches: [main]             # Runs on PR to main
  workflow_dispatch:             # Manual trigger
```

### Jobs

#### 1. **Build Job**
Runs on every trigger event.

```yaml
Steps:
1. Checkout code
2. Setup Node.js 20
3. Install dependencies
4. Run linter (optional)
5. Run tests (optional)
6. Setup Docker Buildx
7. Configure AWS credentials (OIDC)
8. Login to ECR
9. Build & push Docker image
```

**Output**:
- Docker image in ECR: `ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/todo-app:COMMIT_SHA`

#### 2. **Deploy to ECS Job** (Conditional)
Runs only on `main` branch push after build succeeds.

```yaml
Steps:
1. Checkout code
2. Configure AWS credentials
3. Login to ECR
4. Fill task definition with new image
5. Deploy to ECS service
6. Wait for service stability
```

**Requirements**:
- ECS Cluster: `todo-app-cluster`
- ECS Service: `todo-app-service`
- Task Definition: `todo-app-task`

#### 3. **Deploy to EC2 Job** (Optional)
Runs only on `main` branch push after build succeeds.

```yaml
Steps:
1. Checkout code
2. Configure AWS credentials
3. Get EC2 instance IP (by tag)
4. Create SSH key file
5. SSH into instance
6. Pull latest code
7. Pull latest Docker image
8. Restart containers
9. Clean up SSH key
```

**Requirements**:
- EC2 instance tagged with `Name=todo-app-instance`
- SSH private key in GitHub secrets

#### 4. **Slack Notification Job** (Optional)
Runs after all jobs (success or failure).

```yaml
Sends build status to Slack with:
- Build result (success/failure)
- Commit SHA
- Branch name
- Link to workflow run
```

## Test Workflow (`test.yml`)

Runs on every push and pull request.

```yaml
Services:
- Redis 7-alpine (for testing)

Jobs:
1. test         - Run Jest/Mocha tests
2. lint         - Run ESLint
3. docker-build - Build Docker image (no push)
```

## Environment Variables

### Set in `.env` file
```env
NODE_ENV=development
PORT=3005
REDIS_HOST=localhost
REDIS_PORT=6379
SESSION_SECRET=your-secret-key
```

### Set in GitHub Secrets
```
AWS_ROLE_TO_ASSUME=arn:aws:iam::ACCOUNT_ID:role/github-actions-todo-app
AWS_ACCOUNT_ID=ACCOUNT_ID
SLACK_WEBHOOK_URL=https://hooks.slack.com/... (optional)
EC2_SSH_PRIVATE_KEY=-----BEGIN RSA... (optional)
```

### Injected by GitHub Actions
```
GITHUB_SHA=commit-sha
GITHUB_REF=refs/heads/main
GITHUB_REF_NAME=main
GITHUB_REPOSITORY=org/repo
```

## Workflow Syntax Reference

### Conditions

```yaml
# Run only on main branch push
if: github.ref == 'refs/heads/main' && github.event_name == 'push'

# Run on PR only
if: github.event_name == 'pull_request'

# Always run
if: always()

# Never skip, even on failure
if: failure()
```

### Secrets Usage

```yaml
# In workflow file
with:
  role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}

# In shell
env:
  AWS_ROLE_TO_ASSUME: ${{ secrets.AWS_ROLE_TO_ASSUME }}
```

### Outputs

```yaml
# Set output
- id: login-ecr
  uses: aws-actions/amazon-ecr-login@v2

# Use output
image: ${{ steps.login-ecr.outputs.registry }}/todo-app:latest
```

## Performance Optimization

### Docker Layer Caching
```yaml
cache-from: type=gha     # Read cache from GitHub Actions
cache-to: type=gha,mode=max  # Write cache to GitHub Actions
```

### Node Dependencies Caching
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'  # Caches node_modules
```

## Status Checks

### GitHub Status Check Requirements

For production, require these checks before merge:
1. ✅ Build successful
2. ✅ Tests passing
3. ✅ Linter passing
4. ✅ Docker build successful

Set in: `Settings → Branch protection rules → Require status checks`

## Logs & Debugging

### View Workflow Logs

1. Go to `Actions` tab
2. Select workflow run
3. Select job
4. View step output

### Debug Commands

```bash
# List GitHub Actions environment variables
github.event_name        # Event type (push, pull_request, etc)
github.ref               # Full ref (refs/heads/main)
github.ref_name          # Short ref (main)
github.sha               # Commit SHA
github.repository        # org/repo
github.actor             # User who triggered
```

### Troubleshooting Mode

Add debug output:
```yaml
- name: Debug
  run: |
    echo "Ref: ${{ github.ref }}"
    echo "Event: ${{ github.event_name }}"
    echo "SHA: ${{ github.sha }}"
    docker images
```

## Costs

### GitHub Actions Pricing

- **Public repos**: Free (unlimited)
- **Private repos**: 2,000 minutes/month free, then $0.008/minute

### AWS Pricing (Estimates)

- **ECR**: $0.10 per GB transferred + $0.006 per GB stored
- **ECS Fargate**: $0.04732 per vCPU-hour + $0.00520 per GB-hour
- **EC2 t3.micro**: ~$8/month (free tier eligible)
- **ElastiCache Redis**: ~$15/month

## Security Best Practices

### OIDC (Instead of IAM Keys)
✅ No long-lived credentials stored  
✅ Credentials expire after job  
✅ Fine-grained permissions  

### Secrets Management
✅ Use GitHub secrets, not hardcoded  
✅ Rotate secrets regularly  
✅ Use masked values in logs  

### Branch Protection
✅ Require status checks  
✅ Dismiss reviews on new push  
✅ Require signed commits  
✅ Restrict who can push  

## Advanced Features

### Matrix Builds
Test on multiple Node versions:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 22.x]
```

### Conditional Steps
```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
  run: ./deploy.sh
```

### Artifacts
Save build outputs:
```yaml
- name: Upload artifacts
  uses: actions/upload-artifact@v3
  with:
    name: build
    path: dist/
```

### Notifications
Slack, Teams, Discord, Email, etc:
```yaml
- name: Notify Slack
  uses: slackapi/slack-github-action@v1
```

## Common Recipes

### Docker Build & Push
```yaml
- uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: |
      myregistry.azurecr.io/myimage:latest
      myregistry.azurecr.io/myimage:${{ github.sha }}
```

### Deploy with Terraform
```yaml
- uses: hashicorp/setup-terraform@v2
- run: terraform init
- run: terraform plan
- run: terraform apply -auto-approve
```

### Run on Schedule
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

## Resources

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [AWS Actions](https://github.com/aws-actions)
- [Docker Actions](https://github.com/docker/build-push-action)
