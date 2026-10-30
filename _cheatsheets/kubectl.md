---
title: Kubernetes (kubectl)
description: Contexts, workloads, logs, rollouts, and the debug commands that do not require a redeploy.
tags:
  - Kubernetes
  - kubectl
---

Most commands take `-n namespace`. `-A` on `kubectl get` is every namespace. Set a default so you stop typing it:

```bash
kubectl config set-context --current --namespace=prod
```

## Context

```bash
kubectl version --client
kubectl config current-context
kubectl config get-contexts
kubectl config use-context prod
```

`KUBECONFIG` can point at a file other than `~/.kube/config`.

```bash
KUBECONFIG=~/.kube/prod.yaml kubectl get nodes
```

Check what this identity is allowed to do before debugging a 403.

```bash
kubectl auth can-i create deployments -n prod
kubectl auth can-i --list -n prod
```

## Find resources

```bash
kubectl get nodes
kubectl get pods -A
kubectl get pods -n prod -o wide
kubectl get deploy,svc,ingress -n prod
kubectl get pods -n prod -l app=api
kubectl get pod api-0 -n prod -o yaml
kubectl api-resources
kubectl explain deploy.spec.replicas
```

`-o wide` adds node and IP columns. `-l` selects by label. `explain` prints the schema for a field, which is faster than guessing the key name.

```bash
kubectl get events -n prod --sort-by=.metadata.creationTimestamp
kubectl get events -n prod --field-selector involvedObject.name=api-0
```

## Logs and a shell

```bash
kubectl logs -n prod deploy/api --tail=100
kubectl logs -n prod deploy/api -f
kubectl logs -n prod pod/api-0 -c api --previous
kubectl exec -n prod -it deploy/api -- sh
```

`--previous` is the logs from the last crashed container, which is the one you want after a restart loop. `-c` picks a container when the pod has more than one. The `--` before `sh` ends kubectl's flags.

## Apply and delete

```bash
kubectl diff -f manifest.yaml
kubectl apply -f manifest.yaml
kubectl apply -f manifest.yaml --dry-run=server
kubectl delete -f manifest.yaml
```

`--dry-run=client` renders locally and does not talk to the API server. `--dry-run=server` sends the object for validation and does not save it. `diff` needs a local `diff` binary and shows what `apply` would change.

Generate a manifest without creating anything:

```bash
kubectl create deployment demo --image=nginx:alpine --dry-run=client -o yaml
kubectl create configmap api-config --from-literal=LOG_LEVEL=info --dry-run=client -o yaml
```

> A Secret manifest is not encrypted in git. `stringData` is only encoded when the API server stores it. Prefer your secrets manager, and if you must generate a manifest, do it with `--dry-run=client` so the command does not create the object while you are editing.

```bash
kubectl create secret generic db --from-literal=password='replace-me' --dry-run=client -o yaml
```

## Rollouts

```bash
kubectl rollout status deploy/api -n prod
kubectl rollout history deploy/api -n prod
kubectl rollout undo deploy/api -n prod
kubectl rollout restart deploy/api -n prod
kubectl scale deploy/api -n prod --replicas=3
```

`undo` returns to the previous ReplicaSet. Add `--to-revision=2` to pick one from `rollout history`. `restart` rolls the pods even when the spec did not change, which is the right move after a rotated secret or configmap that pods only read at start.

## Ports and metrics

```bash
kubectl port-forward -n prod svc/api 8080:80
kubectl top pods -n prod
kubectl top nodes
```

The ports are `local:remote`. `top` stays empty until metrics-server is installed.

## Debug

Ephemeral containers need a cluster that allows them (the feature is stable, and some managed clusters still block it).

```bash
kubectl debug -n prod -it pod/api-0 --image=busybox:1.36
```

`--target=api` shares the process namespace with the container named `api`, which is how you see that container's processes. Debugging a node uses the node name. That pod can see host processes, so treat it like a root shell on the machine.

```bash
kubectl debug node/node-1 -it --image=busybox:1.36
```

## Nodes

```bash
kubectl cordon node-1
kubectl drain node-1 --ignore-daemonsets --delete-emptydir-data
kubectl uncordon node-1
```

`cordon` stops new pods from landing. `drain` evicts the ones that can move. DaemonSets are skipped with `--ignore-daemonsets`. `--delete-emptydir-data` is required when a pod uses `emptyDir`, and that data is deleted with the pod.
