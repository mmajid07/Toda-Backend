#!/bin/bash

# GitHub Actions & AWS Deployment Setup Script
# Run this script to automate AWS setup for GitHub Actions CI/CD

set -e

echo "🚀 Todo App - GitHub Actions & AWS Setup"
echo "=========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI.${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq not found. Please install jq.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites satisfied${NC}"

# Get AWS Account ID
echo -e "\n${YELLOW}Getting AWS Account ID...${NC}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}Account ID: $ACCOUNT_ID${NC}"

# Get GitHub details
echo -e "\n${YELLOW}Enter GitHub details:${NC}"
read -p "GitHub Organization/Username: " GITHUB_ORG
read -p "GitHub Repository Name: " GITHUB_REPO
read -p "GitHub Branch (default: main): " GITHUB_BRANCH
GITHUB_BRANCH=${GITHUB_BRANCH:-main}

AWS_REGION="us-east-1"
read -p "AWS Region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

# Step 1: Create Trust Policy
echo -e "\n${YELLOW}Step 1: Creating Trust Policy...${NC}"

cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::$ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:$GITHUB_ORG/$GITHUB_REPO:ref:refs/heads/$GITHUB_BRANCH"
        }
      }
    }
  ]
}
EOF

echo -e "${GREEN}✅ Trust policy created${NC}"

# Step 2: Create IAM Role
echo -e "\n${YELLOW}Step 2: Creating IAM Role...${NC}"

aws iam create-role \
  --role-name github-actions-todo-app \
  --assume-role-policy-document file:///tmp/trust-policy.json \
  --region $AWS_REGION 2>/dev/null || echo "Role already exists"

echo -e "${GREEN}✅ IAM Role created/exists${NC}"

# Step 3: Create and attach ECR policy
echo -e "\n${YELLOW}Step 3: Creating ECR Policy...${NC}"

cat > /tmp/ecr-policy.json << EOF
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
      "Resource": "arn:aws:ecr:$AWS_REGION:$ACCOUNT_ID:repository/todo-app"
    },
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name github-actions-todo-app \
  --policy-name ecr-policy \
  --policy-document file:///tmp/ecr-policy.json

echo -e "${GREEN}✅ ECR policy attached${NC}"

# Step 4: Create and attach ECS policy
echo -e "\n${YELLOW}Step 4: Creating ECS Policy...${NC}"

cat > /tmp/ecs-policy.json << EOF
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
        "arn:aws:ecs:$AWS_REGION:$ACCOUNT_ID:service/todo-app-cluster/todo-app-service",
        "arn:aws:ecs:$AWS_REGION:$ACCOUNT_ID:task-definition/todo-app-task:*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskExecutionRole",
        "arn:aws:iam::$ACCOUNT_ID:role/ecsTaskRole"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name github-actions-todo-app \
  --policy-name ecs-policy \
  --policy-document file:///tmp/ecs-policy.json

echo -e "${GREEN}✅ ECS policy attached${NC}"

# Step 5: Create ECR Repository
echo -e "\n${YELLOW}Step 5: Creating ECR Repository...${NC}"

aws ecr create-repository \
  --repository-name todo-app \
  --region $AWS_REGION 2>/dev/null || echo "Repository already exists"

echo -e "${GREEN}✅ ECR repository created/exists${NC}"

# Step 6: Update task definition
echo -e "\n${YELLOW}Step 6: Updating Task Definition...${NC}"

sed -i.bak "s/ACCOUNT_ID/$ACCOUNT_ID/g" .aws/task-definition.json
rm -f .aws/task-definition.json.bak

echo -e "${GREEN}✅ Task definition updated${NC}"

# Display next steps
echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "1. Add GitHub Secrets (Settings → Secrets and variables → Actions):"
echo -e "   - ${GREEN}AWS_ROLE_TO_ASSUME${NC}: arn:aws:iam::$ACCOUNT_ID:role/github-actions-todo-app"
echo -e "   - ${GREEN}AWS_ACCOUNT_ID${NC}: $ACCOUNT_ID"
echo -e "   - ${GREEN}SLACK_WEBHOOK_URL${NC} (optional): Your Slack webhook URL"

echo -e "\n2. Commit and push changes:"
echo "   git add .github/ .aws/"
echo "   git commit -m 'Setup GitHub Actions and AWS deployment'"
echo "   git push origin main"

echo -e "\n3. Monitor workflow:"
echo "   - Go to GitHub Actions tab"
echo "   - Watch the workflow run"

echo -e "\n${YELLOW}Important:${NC}"
echo "- Update REDIS_HOST in .aws/task-definition.json with your Redis endpoint"
echo "- Create ElastiCache Redis cluster or use self-managed Redis"
echo "- Create ECS Cluster and Service for ECS deployment"
echo "- For EC2 deployment, add SSH_PRIVATE_KEY secret"

echo -e "\n${GREEN}Documentation:${NC}"
echo "- See GITHUB_ACTIONS_AWS_SETUP.md for detailed setup guide"
echo "- See SETUP_GUIDE.md for project deployment options"

# Cleanup
rm -f /tmp/trust-policy.json /tmp/ecr-policy.json /tmp/ecs-policy.json

echo -e "\n${GREEN}Happy deploying! 🚀${NC}"
