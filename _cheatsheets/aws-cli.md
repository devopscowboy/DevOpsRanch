---
title: AWS CLI
description: Profiles, identity, S3, EC2, logs, EKS, ECR, CloudFormation, and Parameter Store.
tags:
  - AWS
---

These commands are AWS CLI v2. v1 is missing several of them, including `aws logs tail`.

## Identity and profiles

```bash
aws --version
aws sts get-caller-identity
aws configure list
```

`get-caller-identity` works for users and for assumed roles. `aws iam get-user` only works when the credentials belong to an IAM user, so it is the wrong "who am I" check.

```bash
export AWS_PROFILE=dev
export AWS_REGION=us-east-1
aws sts get-caller-identity --profile prod
```

`--profile` and `--region` on the command win over the environment. `AWS_REGION` and the older `AWS_DEFAULT_REGION` both set the region. Environment credentials such as `AWS_ACCESS_KEY_ID` beat the shared credentials file. If a profile seems to be ignored, check for a stray access key in the environment.

```bash
aws configure
aws configure sso
aws sso login --profile dev
```

A profile that assumes a role, in `~/.aws/config`:

```ini
[profile dev]
region = us-east-1
output = json

[profile prod]
region = us-west-2
role_arn = arn:aws:iam::123456789012:role/Admin
source_profile = dev
```

## Output and query

```bash
aws s3api list-buckets --query 'Buckets[].Name' --output text
aws ec2 describe-instances --filters Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceId' --output text
```

`--output` accepts `json`, `text`, `table`, and `yaml`. `--query` is JMESPath and runs before the output formatter.

Names live in a tag. The backticks are JMESPath literal syntax, so the whole query stays in single quotes and the shell does not treat them as command substitution.

```bash
aws ec2 describe-instances \
  --filters Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[].{Id:InstanceId,Type:InstanceType,Name:Tags[?Key==`Name`]|[0].Value}' \
  --output table
```

```bash
aws ec2 describe-instances --no-paginate
aws s3api list-objects-v2 --bucket example-bucket --max-items 10
```

## S3

```bash
aws s3 ls
aws s3 ls s3://example-bucket/prefix/
aws s3 cp ./report.pdf s3://example-bucket/reports/report.pdf
aws s3 cp s3://example-bucket/reports/report.pdf .
aws s3 cp ./dist s3://example-bucket/web --recursive
aws s3 sync ./dist s3://example-bucket/web
aws s3 presign s3://example-bucket/reports/report.pdf --expires-in 900
```

`--expires-in` is seconds. 900 is fifteen minutes.

> `aws s3 sync ./dist s3://example-bucket/web --delete` deletes objects under that prefix that are not in `./dist`. A wrong local directory or a short prefix will remove objects you meant to keep. `aws s3 rm s3://example-bucket/old/ --recursive` and `aws s3 rb s3://example-bucket --force` are the same kind of one-way operation.

```bash
aws s3 mb s3://example-bucket
```

## Logs

```bash
aws logs tail /aws/eks/prod/cluster --since 1h
aws logs tail /aws/eks/prod/cluster --follow --since 10m
```

`--follow` keeps the command open. The log group name is the CloudWatch name, not a filename.

## EKS and ECR

```bash
aws eks list-clusters --region us-east-1
aws eks update-kubeconfig --name prod --region us-east-1 --alias prod
```

`--alias` is the kubeconfig context name. After this, `kubectl config use-context prod` selects the cluster.

```bash
aws ecr describe-repositories --query 'repositories[].repositoryUri' --output text
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com
```

Replace `123456789012` with the account id, and keep the region in the hostname aligned with `--region`. The username is the literal `AWS`.

## CloudFormation

```bash
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name network \
  --parameter-overrides Environment=prod \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset
aws cloudformation describe-stacks --stack-name network --query 'Stacks[0].Outputs' --output table
```

`deploy` creates the stack or updates it. `CAPABILITY_NAMED_IAM` is required when the template names IAM resources. `--no-fail-on-empty-changeset` makes a no-op deploy exit 0.

## SSM

```bash
aws ssm get-parameter --name /prod/api/DATABASE_URL --with-decryption --query Parameter.Value --output text
aws ssm start-session --target i-0123456789abcdef0
```

`--with-decryption` is what returns a `SecureString` instead of ciphertext. `start-session` needs the Session Manager plugin installed on the machine running the CLI, and the instance needs the SSM agent plus an instance role that allows the session.
