---
title: OpenShift (oc)
description: Projects, routes, builds, RBAC, SCCs, and the oc commands the kubectl sheet does not cover.
tags:
  - OpenShift
  - Kubernetes
  - EX280
updated: 2026-10-30
---

`oc` accepts the same resource verbs as `kubectl`. Get, describe, logs, apply, diff, rollout, scale, port-forward, top, cordon, and drain are on the [kubectl sheet](/cheatsheets/kubectl/). This page is what OpenShift adds, plus the EX280 admin tasks those verbs do not cover. `oc logs --previous` is `kubectl logs --previous`. `oc auth can-i` is `kubectl auth can-i`.

Verified against the OpenShift CLI developer reference (4.15), the administrator reference (4.22), and the 4.22 docs for routes, HTPasswd, and project self-provisioning.

## Log in and switch

```bash
oc login https://api.cluster.example.com:6443 -u developer
oc login --token=sha256~replace-me --server=https://api.cluster.example.com:6443
oc login https://api.cluster.example.com:6443 --web
oc whoami
oc whoami --show-server
oc whoami -t
oc new-project team-dev --display-name='Team Dev'
oc project team-dev
oc projects
```

`-u` prompts for the password. The token form is what "Copy login command" in the console prints. `--web` opens a browser so the token is never pasted. `oc whoami -t` prints the current token, which is what `podman login` and `curl` need. `new-project` creates a project and switches to it. `oc project` with no name prints the current one.

## What kubectl does not show

```bash
oc status --suggest
oc explain route.spec.tls
oc get route
oc get clusterversion
oc get clusteroperators
```

`oc status` is a project overview. `--suggest` adds warnings and the next command it thinks you need. `oc explain` is the same field help as `kubectl explain`, and `route.spec.tls` is the OpenShift field. `clusterversion` and `clusteroperators` are cluster health. A `Degraded=True` condition on a cluster operator is the first place to look when the platform itself is unhappy.

For pod columns, label selectors, and events sorted by time, use the kubectl sheet with `oc` in place of `kubectl`.

## Deploy an app

```bash
oc new-app --image=registry.access.redhat.com/ubi9/httpd-24 --name=web
oc new-app https://github.com/sclorg/nodejs-ex --name=api
oc new-app --list
oc process -f template.yaml NAME=web | oc apply -f -
oc new-app --template=my-template --param=MYSQL_USER=app
oc apply -k overlays/prod
```

`new-app --image` creates a deployment and a service. A git URL starts a source-to-image build and a deployment. `--list` prints the templates and image streams this project can see. `oc process` renders a template. Parameters are `KEY=VALUE` arguments, as in the 4.15 reference. `--local` renders without talking to the cluster. `oc apply -k` builds a Kustomize overlay and applies it. The same flag exists on kubectl and is not repeated on that sheet.

Helm is a separate binary. EX280 deploys charts with it.

```bash
helm upgrade --install web ./chart -n team-dev
helm list -n team-dev
helm uninstall web -n team-dev
```

> The sample template name `mysql-persistent` is not in a default OpenShift 4 catalog. `oc get templates -n openshift` shows the names this cluster actually has. `oc new-app --template` takes `--param`, not the `-p` that older notes used.

## Change a running deployment

`oc set` and `oc autoscale` match the kubectl verbs. They are here because the kubectl sheet does not list them, and EX280 uses them.

```bash
oc set env deployment/web LOG_LEVEL=debug
oc set env --from=secret/db deployment/web
oc set env deployment/web --list
oc set resources deployment/web --requests=cpu=100m,memory=128Mi --limits=memory=256Mi
oc set probe deployment/web --readiness --get-url=http://:8080/healthz
oc set volume deployment/web --add --name=web-config --type=configmap --configmap-name=web-config -m /etc/web
oc set image deployment/web web=quay.io/org/web:1.2
oc autoscale deployment/web --min=2 --max=5 --cpu-percent=80
```

`set env` changes the pod template, which starts a rollout. `--from=secret/db` maps every key in the secret to an environment variable of the same name. `--list` prints the variables without changing them. The empty host in `--get-url=http://:8080/healthz` means the pod IP. `set image` names the container (`web`) and the new image. `autoscale` creates a horizontal pod autoscaler.

## Routes and network policy

```bash
oc expose deployment/web --port=8080
oc expose service/web --hostname=web.apps.example.com
oc create route edge web-tls --service=web --hostname=web.apps.example.com
oc create route edge --service=web --cert=tls.crt --key=tls.key --hostname=web.apps.example.com
oc create route passthrough --service=web --hostname=web.apps.example.com
oc create route reencrypt --service=web --dest-ca-cert=ca.crt
oc get route web -o jsonpath='{.spec.host}'
oc create service loadbalancer db --tcp=5432:5432
```

`oc expose` on a deployment creates a service. `oc expose` on a service creates an HTTP route. Edge TLS terminates at the router. The certificate and key are PEM files, and the key cannot be password-protected. Passthrough forwards TLS to the pod. Reencrypt terminates at the router and opens a new TLS connection to the pod. `--dest-ca-cert` is the CA the router uses to check the pod. Omit it to use the service CA.

`oc create service loadbalancer` is the non-HTTP path. It publishes a port on the cluster's load balancer instead of a route.

There is no `oc create networkpolicy` shortcut. A deny-all policy and an allow-from-ingress policy are the usual pair. The ingress label is the one OpenShift documents for router traffic.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-openshift-ingress
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              network.openshift.io/policy-group: ingress
```

```bash
oc apply -f deny-all.yaml
oc apply -f allow-from-ingress.yaml
```

> A deny-all policy with no allow rule makes a running pod unreachable, including from the router. Apply the allow-from-ingress policy in the same project before you call the route a failure.

## Config maps and secrets

Creating a config map or a generic secret from a literal or a file is the same command as on the kubectl sheet, including `--dry-run=client -o yaml` when you do not want to create the object yet. These are the OpenShift-specific follow-ups.

```bash
oc create secret tls web-tls --cert=tls.crt --key=tls.key
oc extract secret/db --to=-
oc extract configmap/web-config --to=/tmp --keys=nginx.conf
oc set data secret/db password=new-value
oc set data secret/db password-
oc secrets link default my-pull-secret --for=pull
oc secrets unlink default my-pull-secret
```

`oc extract --to=-` prints decoded values to stdout. `--keys` limits which keys are written. `oc set data` updates one key in place. A trailing `-` on the key name deletes it. `oc secrets link --for=pull` attaches a pull secret to a service account, which is the fix for `ImagePullBackOff` on a private registry. `default` is the service account a deployment uses until you change it.

## Builds and images

```bash
oc new-build https://github.com/sclorg/nodejs-ex --name=api
oc start-build api --follow
oc start-build api --from-dir=. --follow
oc logs -f bc/api
oc import-image app --from=quay.io/org/app:1.0 --confirm
oc tag app:latest app:prod
oc image info quay.io/org/app:1.0
oc get is
```

`new-build` creates the BuildConfig and the image stream without a deployment. `new-app` on a git URL creates both. `--follow` streams the build log until it finishes and returns non-zero on failure. `--from-dir` uploads the local directory as the build source. `oc logs -f bc/api` is the latest build of that BuildConfig. `import-image --confirm` creates the image stream if it is missing and records the external tag. `oc tag app:latest app:prod` points the `prod` tag at whatever `latest` points at. `oc image info` prints the digest, the OS and architecture, and the layers.

## Debug a pod

```bash
oc rsh deployment/web
oc debug deployment/web
oc debug node/node1
oc rsync ./site/ web-1:/var/www/html
```

`oc rsh` is a shell in a running pod. `oc debug` starts a copy of the pod with a shell instead of the image entrypoint, which is how you inspect a `CrashLoopBackOff`. `oc debug node/node1` starts a privileged pod on that node. The host filesystem is mounted at `/host`. The next command is typed in that pod, not on your laptop:

```bash
chroot /host
```

`crictl ps` and `journalctl -u kubelet` then see the node. `oc rsync` copies a directory in or out. The source path needs a trailing slash when you mean the directory's contents.

> `oc rsh` and `oc rsync` need a shell, and `tar` or `rsync`, inside the image. `oc debug` does not. Logs from the crashed container are `oc logs -p`, which is `kubectl logs --previous` on the kubectl sheet.

## Users, RBAC, and SCCs

```bash
oc -n team-dev policy add-role-to-user edit alice
oc adm policy add-cluster-role-to-user cluster-admin admin
oc adm groups new devs alice bob
oc -n team-dev create rolebinding devs-view --clusterrole=view --group=devs
oc auth can-i create pods --as=alice -n team-dev
oc create serviceaccount app-sa
oc adm policy add-scc-to-user anyuid -z app-sa
oc set serviceaccount deployment/web app-sa
oc adm policy scc-subject-review -f deploy.yaml
```

`oc policy add-role-to-user` grants a role in one project. `-n` before the verb picks the project. `cluster-admin` is the whole cluster. `oc adm groups new` creates a group and can add users in the same command. The 4.22 administrator reference does not list `add-role-to-group`. `oc create rolebinding --group` is the documented way to give a group a role in one project.

`oc auth can-i --as` impersonates someone. More `can-i` forms are on the kubectl sheet. `-z app-sa` on `add-scc-to-user` means the service account in the current project. `anyuid` lets that account run as any uid, including root. `set serviceaccount` points the deployment at the account. `scc-subject-review -f` says which SCC would admit the pod in that file.

A service account in another project is a role binding, not a copy of the account:

```bash
oc -n team-dev create rolebinding app-edit --clusterrole=edit --serviceaccount=ns1:app-sa
```

Stopping users from creating their own projects is two patches. Removing the role alone is not enough: the binding is reconciled back. When `system:authenticated:oauth` is the only subject, which is the default, clear the subjects and turn autoupdate off.

```bash
oc describe clusterrolebinding.rbac self-provisioners
oc patch clusterrolebinding.rbac self-provisioners -p '{"subjects": null}'
oc patch clusterrolebinding.rbac self-provisioners -p '{"metadata":{"annotations":{"rbac.authorization.kubernetes.io/autoupdate":"false"}}}'
```

If the binding has extra subjects and you only want the oauth group gone, remove that one group instead of clearing every subject:

```bash
oc adm policy remove-cluster-role-from-group self-provisioner system:authenticated:oauth
```

Still set `autoupdate` to `false`, or the group comes back.

> OpenShift runs a container as a random uid in group 0. An image that writes only to directories owned by uid 0 fails until those directories are group-writable, or until the pod's service account has an SCC that allows the uid it wants. `anyuid` is the wide SCC. Prefer a group-writable image.

## HTPasswd identity provider

`htpasswd` is in the `httpd-tools` package. The secret key has to be named `htpasswd`. The provider name in the identity object is the `name` in the OAuth resource, not the word `htpasswd`.

```bash
htpasswd -c -B -b users.htpasswd alice 'change-me'
htpasswd -B -b users.htpasswd bob 'change-me'
oc create secret generic htpass-secret --from-file=htpasswd=users.htpasswd -n openshift-config
```

`-c` creates the file and truncates it if it already exists. Omit `-c` when you are adding a user. `-B` is bcrypt. `-b` takes the password on the command line, which lands in shell history. Drop `-b` and type the password when that matters.

```yaml
apiVersion: config.openshift.io/v1
kind: OAuth
metadata:
  name: cluster
spec:
  identityProviders:
    - name: my_htpasswd_provider
      mappingMethod: claim
      type: HTPasswd
      htpasswd:
        fileData:
          name: htpass-secret
```

```bash
oc apply -f oauth.yaml
```

`oc apply` replaces `spec.identityProviders` with what is in the file. On a cluster that already has providers, `oc edit oauth cluster` and add an entry to the list instead.

To change the file later:

```bash
oc get secret htpass-secret -n openshift-config -o jsonpath='{.data.htpasswd}' | base64 --decode > users.htpasswd
htpasswd -bB users.htpasswd bob 'new-value'
htpasswd -D users.htpasswd bob
oc create secret generic htpass-secret --from-file=htpasswd=users.htpasswd --dry-run=client -o yaml -n openshift-config | oc replace -f -
```

`oc extract secret/htpass-secret -n openshift-config --to=-` prints the decoded secret for a look. Do not redirect that straight into `users.htpasswd`. The official update path is the `jsonpath` command above, because the file you hash has to be the htpasswd data alone.

Removing a person is the file, the user, and the identity. Leave any one of them and the login still works.

```bash
oc delete user bob
oc delete identity my_htpasswd_provider:bob
```

## Quotas, limits, and project templates

```bash
oc create quota team-quota --hard=pods=10,requests.cpu=2,requests.memory=4Gi -n team-dev
oc describe quota -n team-dev
oc create clusterresourcequota team-a --project-annotation-selector=openshift.io/requester=user-bob --hard=pods=10
oc get limitrange -n team-dev
```

`oc create quota` is one project. `describe quota` shows used against hard. `clusterresourcequota` spans projects. The reference example selects them with the `openshift.io/requester` annotation. `--project-label-selector=team=a` is the same command when the projects share a label.

A limit range has no create shortcut that sets defaults. This one gives containers a request and a limit when the pod spec is silent.

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: team-limits
spec:
  limits:
    - type: Container
      default:
        cpu: 200m
        memory: 256Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
```

```bash
oc apply -f team-limits.yaml -n team-dev
```

New projects can carry a template. Edit the generated file, keep it in `openshift-config`, then point the project config at the template's `metadata.name`.

```bash
oc adm create-bootstrap-project-template -o yaml > template.yaml
oc create -f template.yaml -n openshift-config
oc edit project.config.openshift.io/cluster
```

```yaml
spec:
  projectRequestTemplate:
    name: project-request
```

## Operators

```bash
oc get packagemanifests -n openshift-marketplace
oc describe packagemanifest example-operator -n openshift-marketplace
oc get sub,csv,installplan -n openshift-operators
oc delete subscription example-operator -n openshift-operators
oc delete csv example-operator.v1.0.0 -n openshift-operators
```

`describe packagemanifest` prints the catalog source, the channels, and the install modes. An install is a Subscription. Copy `channel`, `name`, and `source` from that describe. `openshift-operators` is the default all-namespaces operator namespace and already has an OperatorGroup. A single-namespace install needs an OperatorGroup in that namespace too.

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: example-operator
  namespace: openshift-operators
spec:
  channel: stable
  name: example-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
```

```bash
oc apply -f subscription.yaml
```

> Deleting the Subscription and leaving the ClusterServiceVersion installed keeps the operator running. Delete both. `oc get csv` prints the versioned name the second command needs.

## Jobs and cron jobs

```bash
oc create job once --image=registry.access.redhat.com/ubi9/ubi -- date
oc create cronjob nightly --image=registry.access.redhat.com/ubi9/ubi --schedule='0 2 * * *' -- date
oc create job nightly-now --from=cronjob/nightly
```

The `--` ends `oc` flags and starts the container command. `date` is a command the UBI image actually contains. Replace it with a command that exists in the image you name. `--from=cronjob/nightly` runs that schedule once, now. These are the same `kubectl create job` and `kubectl create cronjob` verbs. The kubectl sheet does not list them.

## Cluster health

```bash
oc get clusterversion
oc get clusteroperators
oc adm node-logs --role master -u kubelet
oc adm must-gather
oc adm upgrade
oc debug node/node1
```

`oc adm upgrade` with no arguments prints the available updates and whether one is in progress. `oc adm node-logs --role` reads node journals through the API. `-u kubelet` is that unit. `must-gather` writes a directory of cluster state for a support case. Do not leave it running on a laptop with a small disk.

Cordon, drain, and uncordon match the kubectl sheet, including `--ignore-daemonsets` and `--delete-emptydir-data`. `oc adm top node` matches `kubectl top nodes`.

> Node configuration belongs in a MachineConfig. A package or a file you change by hand on a node is reverted by the Machine Config Operator. `oc debug node` is for looking, then `chroot /host`.

## A pod is not running

```bash
oc get pods
oc describe pod web-1
oc get events --sort-by=.metadata.creationTimestamp
```

Read `STATUS` and `RESTARTS`, then the `Events` at the bottom of `describe`. That block explains most failures.

`ImagePullBackOff` is the image name, the tag, or the pull secret. `oc image info` checks the name. `oc secrets link default <secret> --for=pull` attaches the secret to the service account the pod uses.

`CrashLoopBackOff` is the previous container's log, then a debug pod that does not run the entrypoint.

```bash
oc logs -p pod/web-1
oc debug deployment/web
```

`Pending` is quota, a limit range, CPU and memory on the nodes, or a PVC that never bound.

```bash
oc describe quota
oc get limitrange
oc adm top node
oc get pvc
```

`CreateContainerConfigError` is a missing config map, secret, or key. `Permission denied` inside a container that did start is the random uid. Fix the image's group bits, or check `oc adm policy scc-subject-review`.

A pod that is `Running` and still unreachable is the service and the route.

```bash
oc get endpoints
oc get route
```

The service selector has to match the pod labels. The route host and the TLS type (`edge`, `passthrough`, `reencrypt`) have to match how the application speaks.
