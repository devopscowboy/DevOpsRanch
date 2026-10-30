---
title: Terraform
description: Format, plan, state, import, and the S3 backend settings that keep apply from stepping on itself.
tags:
  - Terraform
---

Commands are Terraform 1.5 or newer unless a section says otherwise. Run them from the directory that contains the `.tf` files, or pass `-chdir`.

```bash
terraform -chdir=infra/network plan
```

## Format, init, validate

```bash
terraform version
terraform fmt -recursive
terraform fmt -check -diff -recursive
terraform init
terraform validate
```

`fmt` rewrites files. `-check` only reports which files would change, which is what CI should run. `validate` checks syntax and types and needs `terraform init` first so providers and modules are installed.

```bash
terraform init -upgrade
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64
```

Commit `.terraform.lock.hcl`. Do not commit the `.terraform/` directory or `terraform.tfstate`. State often contains secrets and resource ids.

## Plan and apply

```bash
terraform plan -out=tfplan
terraform show tfplan
terraform apply tfplan
```

Applying a saved plan does not prompt, and it refuses to run if the state changed after the plan was created. `terraform show tfplan` prints the plan again so you can read it without re-planning.

> A `.tfplan` file can contain sensitive values. Do not commit it. `terraform apply -auto-approve` skips the prompt when you did not save a plan. Leave it off when a person is at the keyboard.

```bash
terraform plan -destroy -out=tfplan
terraform destroy
```

`plan -destroy` is the reviewable version. `terraform destroy` asks for confirmation and then destroys what is in state.

Replace one resource instead of tainting it. `terraform taint` is obsolete.

```bash
terraform apply -replace='aws_instance.web'
```

## State

```bash
terraform state list
terraform state show aws_instance.web
terraform state pull
```

> `terraform state pull` prints the state, secrets included. Do not redirect it into the repository.

```bash
terraform state rm aws_s3_bucket.logs
```

`state rm` forgets the object. It does not delete it in the cloud. If the configuration still declares that resource, the next apply will try to create it again.

`terraform force-unlock LOCK_ID` clears a stuck lock. Only run it when you are sure no apply is still writing.

## Import

The resource block has to exist in configuration before a classic import, or the next plan will want to destroy the imported object.

```bash
terraform import aws_s3_bucket.logs example-prod-logs
```

Terraform 1.5 and newer can declare the import and generate configuration.

```hcl
import {
  to = aws_s3_bucket.logs
  id = "example-prod-logs"
}
```

```bash
terraform plan -generate-config-out=generated.tf
```

Read `generated.tf` before trusting it. Generated arguments often need a pass to match the style of the rest of the module.

## Variables and outputs

```hcl
variable "region" {
  type        = string
  description = "AWS region for this stack."
  default     = "us-east-1"
}

output "bucket" {
  value = aws_s3_bucket.logs.bucket
}
```

```bash
terraform plan -var='region=us-west-2' -var-file=prod.tfvars
export TF_VAR_region=us-east-1
terraform output
terraform output -raw bucket
```

Highest precedence wins: `-var` and `-var-file`, then `*.auto.tfvars`, then `terraform.tfvars`, then `TF_VAR_` environment variables, then the variable's `default`. `output -raw` is for string outputs. It prints the value with no extra quotes.

> `prod.tfvars` and `*.auto.tfvars` are loaded from disk. Do not commit a tfvars file that holds secrets. `terraform.tfvars` is a common local-only file.

## Workspaces

```bash
terraform workspace list
terraform workspace show
terraform workspace new staging
terraform workspace select staging
```

A workspace is a separate state name on the same backend. It is not, by itself, an account boundary or a permissions boundary.

## Backend

On Terraform 1.10 and newer, lock state in S3 itself. `dynamodb_table` still works and is deprecated.

```hcl
terraform {
  required_version = ">= 1.10.0"

  backend "s3" {
    bucket       = "example-tf-state"
    key          = "prod/network/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

Changing backend settings means running `terraform init` again. Terraform will offer to copy existing state when it can.

## A small resource

```hcl
resource "aws_s3_bucket" "logs" {
  bucket = "example-prod-logs"
}
```

Bucket names are global. An `example-` prefix will collide with someone else's bucket; use a name you own.
