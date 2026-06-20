# GitHub Actions & AWS Deployment Setup

## Prerequisites

### GitHub Repository Setup

1. ✅ Push code to GitHub (done)
2. ✅ Create `.github/workflows` directory (done)

### AWS Account Requirements

- AWS Account with appropriate permissions
- AWS CLI installed locally
- IAM user/role with ECR, ECS, EC2 access

## Step-by-Step Setup Guide

### Step 1: Create IAM Role for GitHub Actions

```bash
# Create trust policy file: trust-policy.json
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_ORG/todo-app:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF

# Replace ACCOUNT_ID and YOUR_GITHUB_ORG with your values
```

#### Create the role:
```bash
aws iam create-role \
  --role-name github-actions-todo-app \
  --assume-role-policy-document file://trust-policy.json \
  --region us-east-1
```

### Step 2: Attach IAM Policies

#### Create ECR policy file:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:CreateRepository"
      ],
      "Resource": "arn:aws:ecr:us-east-1:ACCOUNT_ID:repository/todo-app"
    },
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    }
  ]
}
```

#### Create ECS policy file:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:DescribeTasks",
        "ecs:ListTasks",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": [
        "arn:aws:ecs:us-east-1:ACCOUNT_ID:service/todo-app-cluster/todo-app-service",
        "arn:aws:ecs:us-east-1:ACCOUNT_ID:task-definition/todo-app-task:*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
        "arn:aws:iam::ACCOUNT_ID:role/ecsTaskRole"
      ]
    }
  ]
}
```

#### Attach policies:
```bash
# Save policies to files
aws iam put-role-policy \
  --role-name github-actions-todo-app \
  --policy-name ecr-policy \
  --policy-document file://ecr-policy.json

aws iam put-role-policy \
  --role-name github-actions-todo-app \
  --policy-name ecs-policy \
  --policy-document file://ecs-policy.json
```

### Step 3: Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name todo-app \
  --region us-east-1
```

### Step 4: Add GitHub Secrets

Go to: **Settings → Secrets and variables → Actions**

Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `AWS_ROLE_TO_ASSUME` | `arn:aws:iam::ACCOUNT_ID:role/github-actions-todo-app` |
| `AWS_ACCOUNT_ID` | Your AWS Account ID |
| `SLACK_WEBHOOK_URL` | (Optional) Slack webhook URL |
| `EC2_SSH_PRIVATE_KEY` | (Optional) SSH private key for EC2 |

```bash
# Get your account ID
aws sts get-caller-identity --query Account --output text
```

### Step 5: Create ECS Cluster & Service (if using ECS)

```bash
# Create cluster
aws ecs create-cluster --cluster-name todo-app-cluster --region us-east-1

# Create service
aws ecs create-service \
  --cluster todo-app-cluster \
  --service-name todo-app-service \
  --task-definition todo-app-task:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --region us-east-1
```

### Step 6: Update AWS Task Definition

Replace placeholders in `.aws/task-definition.json`:

```bash
# Replace ACCOUNT_ID with your AWS Account ID
sed -i 's/ACCOUNT_ID/YOUR_ACCOUNT_ID/g' .aws/task-definition.json
```

### Step 7: Create EC2 Instance (if using EC2)

```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name your-key-pair \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=todo-app-instance}]' \
  --region us-east-1

# Add security group rules
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 3005 \
  --cidr 0.0.0.0/0 \
  --region us-east-1
```

### Step 8: Create Redis Cluster (ElastiCache)

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id todo-app-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --region us-east-1
```

## GitHub Actions Workflow

### Trigger Events

Workflows run on:
- ✅ Push to `main` branch
- ✅ Push to `develop` branch
- ✅ Pull requests to `main`
- ✅ Manual trigger (workflow_dispatch)

### Workflow Stages

1. **Build** (Always)
   - Code checkout
   - Dependencies install
   - Linting
   - Testing
   - Docker image build & push to ECR

2. **Deploy to ECS** (On main push)
   - Update task definition
   - Deploy to ECS cluster
   - Wait for service stability

3. **Deploy to EC2** (On main push - Optional)
   - SSH to instance
   - Pull latest code
   - Update Docker containers

4. **Slack Notification** (Always)
   - Send status to Slack

## Viewing Workflow Runs

1. Go to **Actions** tab on GitHub
2. Click on a workflow to see details
3. Click on a job to see logs

## Testing the Workflow

```bash
# Push to main branch to trigger workflow
git add .
git commit -m "Setup GitHub Actions"
git push origin main

# Or manually trigger
# Go to Actions tab → Deploy → Run workflow
```

## Common Issues & Solutions

### ECR Login Failed
```bash
# Verify IAM permissions
aws iam get-role --role-name github-actions-todo-app

# Check ECR repository exists
aws ecr describe-repositories --repository-names todo-app
```

### ECS Deployment Failed
```bash
# Check task definition
aws ecs describe-task-definition --task-definition todo-app-task

# Check service status
aws ecs describe-services --cluster todo-app-cluster --services todo-app-service
```

### EC2 Connection Failed
```bash
# Verify security group allows SSH (port 22)
aws ec2 describe-security-groups --group-ids sg-xxx

# Test SSH connection manually
ssh -i key.pem ec2-user@INSTANCE_IP
```

## Monitoring & Logs

### CloudWatch Logs
```bash
# View ECS logs
aws logs tail /ecs/todo-app --follow

# View specific log stream
aws logs tail /ecs/todo-app --follow --log-stream-names ecs/todo-app-service/TASK_ID
```

### ECR Images
```bash
# List images
aws ecr describe-images --repository-name todo-app

# View image details
aws ecr describe-images --repository-name todo-app --image-ids imageTag=latest
```

## Environment Variables for ECS

Update `.aws/task-definition.json` with your environment:

```json
"environment": [
  {"name": "NODE_ENV", "value": "production"},
  {"name": "PORT", "value": "3005"},
  {"name": "REDIS_HOST", "value": "todo-app-redis.xxxxx.ng.0001.use1.cache.amazonaws.com"},
  {"name": "REDIS_PORT", "value": "6379"}
]
```

## Security Best Practices

✅ Use IAM roles with minimal permissions  
✅ Store secrets in AWS Secrets Manager  
✅ Use OIDC for GitHub Actions (no long-lived credentials)  
✅ Enable ECR image scanning  
✅ Use encryption for data in transit (HTTPS/TLS)  
✅ Restrict security group access  
✅ Use private subnets for database  
✅ Enable VPC endpoints for AWS services  

## Next Steps

1. ✅ Create IAM role and policies
2. ✅ Add GitHub secrets
3. ✅ Create ECR repository
4. ✅ Create ECS cluster (optional)
5. ✅ Create Redis cluster
6. ✅ Push code to trigger workflow
7. ✅ Monitor deployment

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS CodeBuild](https://docs.aws.amazon.com/codebuild/)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/best-practices.html)
- [GitHub Actions - AWS](https://github.com/actions?q=aws)
