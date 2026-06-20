# Quick Deployment Guide - GitHub Actions to AWS

## 🚀 5-Minute Quick Start

### Prerequisites Checklist
```bash
✓ GitHub repository created and code pushed
✓ AWS Account with CLI configured
✓ GitHub account with admin access to repo
```

### Quick Setup Commands

```bash
# 1. Configure AWS CLI (if not done)
aws configure

# 2. Run automated setup script
chmod +x scripts/setup-aws-github-actions.sh
./scripts/setup-aws-github-actions.sh

# 3. Go to GitHub → Settings → Secrets
# Add secrets shown in script output

# 4. Push changes to trigger workflow
git add .
git commit -m "Setup GitHub Actions for AWS deployment"
git push origin main

# 5. Monitor at: GitHub → Actions tab
```

## 📋 Manual Setup (Step-by-Step)

### Step 1: Create IAM Role (5 min)

```bash
# 1a. Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "Your Account ID: $ACCOUNT_ID"

# 1b. Create role
aws iam create-role \
  --role-name github-actions-todo-app \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::'$ACCOUNT_ID':oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:ref:refs/heads/main"
        }
      }
    }]
  }'
```

Replace `YOUR_ORG` and `YOUR_REPO` with your GitHub details.

### Step 2: Attach Policies (3 min)

```bash
# ECR Policy
aws iam put-role-policy \
  --role-name github-actions-todo-app \
  --policy-name ecr-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:CreateRepository"
      ],
      "Resource": "*"
    }]
  }'

# ECS Policy  
aws iam put-role-policy \
  --role-name github-actions-todo-app \
  --policy-name ecs-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:RegisterTaskDefinition"
      ],
      "Resource": "*"
    }, {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": "*"
    }]
  }'
```

### Step 3: Create ECR Repository (2 min)

```bash
aws ecr create-repository --repository-name todo-app
```

### Step 4: Add GitHub Secrets (2 min)

1. Go to: `GitHub → Settings → Secrets and variables → Actions`
2. Click `New repository secret`
3. Add these secrets:

| Name | Value |
|------|-------|
| `AWS_ROLE_TO_ASSUME` | `arn:aws:iam::ACCOUNT_ID:role/github-actions-todo-app` |
| `AWS_ACCOUNT_ID` | `ACCOUNT_ID` |

Replace `ACCOUNT_ID` with your AWS Account ID from Step 1.

### Step 5: Deploy (1 min)

```bash
git add .
git commit -m "Add GitHub Actions workflow"
git push origin main
```

Monitor at: `GitHub → Actions tab`

## 📊 Deployment Options

### Option A: ECS Fargate (Recommended)

Best for: Managed, scalable, serverless

```bash
# Create cluster
aws ecs create-cluster --cluster-name todo-app-cluster

# Create ECS service (requires Fargate VPC setup)
# See GITHUB_ACTIONS_AWS_SETUP.md for detailed steps
```

**Advantages**:
- ✅ Auto-scaling
- ✅ Load balancing
- ✅ No server management
- ✅ Pay per use

### Option B: EC2

Best for: Full control, flexible, cost-effective for steady usage

```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.micro \
  --key-name YOUR_KEY_PAIR

# Add SSH key to GitHub secrets
# See GITHUB_ACTIONS_AWS_SETUP.md for EC2_SSH_PRIVATE_KEY
```

**Advantages**:
- ✅ Full control
- ✅ Can run on free tier
- ✅ Direct SSH access

### Option C: App Runner

Best for: Simple, quick, container-friendly

```bash
# AWS App Runner auto-deploys from ECR
# Minimal setup required
```

**Advantages**:
- ✅ Easiest setup
- ✅ Auto-HTTPS
- ✅ Load balanced

## 🔍 Verify Setup

### Check IAM Role
```bash
aws iam get-role --role-name github-actions-todo-app
```

### Check ECR Repository
```bash
aws ecr describe-repositories --repository-names todo-app
```

### Check Workflow Status
```
GitHub → Actions → Latest Workflow Run
```

## 🚨 Troubleshooting

### Workflow Failed: ECR Login
```bash
# Verify role
aws iam get-role --role-name github-actions-todo-app

# Verify permissions
aws iam get-role-policy \
  --role-name github-actions-todo-app \
  --policy-name ecr-policy
```

### Workflow Failed: ECS Deployment
```bash
# Check ECS service
aws ecs describe-services \
  --cluster todo-app-cluster \
  --services todo-app-service

# Check task definition
aws ecs describe-task-definition --task-definition todo-app-task
```

### Check GitHub Actions Logs
1. Go to `Actions` tab
2. Click on failed workflow
3. Click on job name
4. Scroll to view logs

## 📈 Monitoring Deployments

### View Workflow Runs
```
GitHub → Actions → Select Workflow
```

### View CloudWatch Logs (ECS)
```bash
aws logs tail /ecs/todo-app --follow
```

### View ECR Images
```bash
aws ecr describe-images --repository-name todo-app
```

## 🔐 Security Checklist

- ✅ Use IAM role (not IAM user key)
- ✅ Minimal permissions (principle of least privilege)
- ✅ Rotate secrets regularly
- ✅ Use branch protection rules
- ✅ Require status checks before merge
- ✅ Keep dependencies updated

## 📚 Full Documentation

For detailed setup, see:
- `GITHUB_ACTIONS_AWS_SETUP.md` - Comprehensive setup guide
- `SETUP_GUIDE.md` - Project deployment options
- GitHub Actions docs: https://docs.github.com/en/actions

## ✅ Completed Steps

- ✅ Code pushed to GitHub
- ✅ GitHub Actions workflows created (.github/workflows/)
- ✅ AWS task definition created (.aws/task-definition.json)
- ✅ Setup script provided (scripts/setup-aws-github-actions.sh)

## 🎯 Next Actions

1. [ ] Run setup script or follow manual steps
2. [ ] Add GitHub secrets
3. [ ] Push code to trigger workflow
4. [ ] Monitor Actions tab
5. [ ] Verify deployment on AWS
6. [ ] Update DNS/Load balancer if needed

---

**Total Setup Time**: ~15 minutes ⏱️

**Questions?** Check the detailed guides or GitHub Actions documentation.
