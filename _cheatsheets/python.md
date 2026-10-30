---
title: Python for automation
description: Virtual environments, subprocess, files, JSON and YAML, HTTP, and CLI scripts with logging.
tags:
  - Python
  - Automation
updated: 2026-10-30
---

This is the slice used to automate a host, an API, or a cluster. It is not a language tutorial. Shell commands the scripts call out to are on the [Linux sheet](/cheatsheets/linux/) and the [OpenShift sheet](/cheatsheets/openshift/).

Verified against Python 3.12.3 (venv, subprocess, pathlib, json, argparse, logging) and PyYAML 6.0.1. `requests`, `boto3`, and the Kubernetes client were checked from their docs and were not imported on this machine.

## Virtual environments and pip

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pip install 'requests==2.32.3'
python -m pip freeze > requirements.txt
python -m pip list --outdated
deactivate
rm -rf .venv
```

`python3 -m venv` creates an isolated environment in `.venv`. `source` activates it in the current shell. `deactivate` leaves it. `python -m pip` uses the interpreter you just activated, so the install cannot land on a different Python than the one that runs the script. The `==` pin is an exact version. `2.32.3` is an example, not a requirement to stay on that release. `freeze` writes whatever is installed, including transitive dependencies.

`pipx` is a separate program for CLI tools (`pipx install ansible-lint`). It is not part of the standard library. Each tool gets its own environment so it does not share packages with the project.

> `error: externally-managed-environment` is PEP 668. Debian 12, Ubuntu 23.04 and newer, and current Fedora mark the system interpreter so `pip install` cannot modify it. RHEL 9 does not raise that error by default, and installing into the system Python is still the wrong place. Create a venv, or use pipx for a CLI tool.

## Run shell commands

```python
import subprocess

result = subprocess.run(
    ["systemctl", "is-active", "nginx"],
    capture_output=True,
    text=True,
    check=True,
    timeout=60,
)
print(result.returncode, result.stdout.strip())
```

```python
import os
import shlex
import shutil
import subprocess

argv = shlex.split("oc get pods -o name")
if shutil.which("oc") is None:
    raise SystemExit("oc is not on PATH")
subprocess.run(
    argv,
    check=True,
    timeout=60,
    env={**os.environ, "KUBECONFIG": "/path/to/kubeconfig"},
)
```

`subprocess.run` waits for the process. Pass the command as a list. `capture_output=True` and `text=True` put stdout and stderr in strings. `check=True` raises `CalledProcessError` on a non-zero exit. `timeout` raises `TimeoutExpired` instead of waiting forever. `shlex.split` turns a command string you wrote into that list. `shutil.which` returns `None` when the binary is missing. The `env` dict replaces the child's environment, so copy `os.environ` and then add the one variable.

> `shell=True` hands the string to `/bin/sh`. Any part of that string that came from a user, a file, or an API can run extra commands. Keep `shell=False` and the list form unless you wrote the whole string yourself.

## Files, paths, and environment

```python
import os
from pathlib import Path

text = Path("/etc/os-release").read_text()
for path in Path(".").glob("*.md"):
    print(path)
kubeconfig = Path.home() / ".kube" / "config"
env_name = os.environ.get("ENV", "dev")
```

`glob("**/*.log")` walks every subdirectory. The loop above stays in the current directory so copying it does not depend on a `logs` folder.

```python
import shutil
import tempfile
from pathlib import Path

demo = Path("demo-out")
demo.mkdir(parents=True, exist_ok=True)
shutil.copy2("/etc/os-release", demo / "os-release.copy")
with tempfile.TemporaryDirectory() as tmp:
    scratch = Path(tmp) / "work"
    scratch.mkdir()
shutil.rmtree(demo)
```

`read_text` returns the whole file as a string. `mkdir(parents=True, exist_ok=True)` is `mkdir -p`. `/` on a `Path` joins without worrying about extra slashes. `os.environ.get` returns the default when the variable is unset. `copy2` keeps permissions and times. `rmtree` deletes a tree. The second block removes `demo-out` when it finishes. `TemporaryDirectory` removes its own scratch directory when the block exits, including on an exception.

## JSON and YAML

```python
import json
from pathlib import Path

data = json.loads('{"name": "web"}')
print(json.dumps(data, indent=2))
path = Path("demo.json")
path.write_text(json.dumps(data))
with path.open() as handle:
    data = json.load(handle)
path.unlink()
```

```python
from pathlib import Path

import yaml

single = Path("demo.yaml")
single.write_text("name: web\n")
with single.open() as handle:
    data = yaml.safe_load(handle)
with single.open("w") as handle:
    yaml.safe_dump(data, handle, sort_keys=False)
single.unlink()

multi = Path("demo-multi.yaml")
multi.write_text("name: web\n---\nname: api\n")
with multi.open() as handle:
    documents = list(yaml.safe_load_all(handle))
multi.unlink()
```

`json` is in the standard library. YAML needs PyYAML (`python -m pip install pyyaml`). `safe_load` reads one document and raises if the file has a second `---`. `safe_load_all` is the generator for a multi-document manifest, so `list` pulls them all. `sort_keys=False` keeps the key order you wrote. From the shell, `python3 -m json.tool file.json` pretty-prints a JSON file.

> `yaml.load` without a safe loader can construct arbitrary Python objects. PyYAML 6.0 and newer refuse to run it until you pass a `Loader`. Use `yaml.safe_load`.

## HTTP APIs

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

url = "https://example.com"
token = "replace-me"
payload = {"ok": True}
response = requests.get(
    url,
    headers={"Authorization": f"Bearer {token}"},
    timeout=10,
)
response.raise_for_status()
data = response.json()
requests.post(url, json=payload, timeout=10)

session = requests.Session()
session.mount(
    "https://",
    HTTPAdapter(
        max_retries=Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[502, 503, 504],
        )
    ),
)
```

`timeout` is seconds. `raise_for_status` raises on 4xx and 5xx. `json=` on `post` encodes the body and sets the content type. `Retry` retries idempotent methods (GET, HEAD, OPTIONS, and the others in its allow list) on those status codes. POST is not in that list unless you set `allowed_methods`.

> `requests` has no default timeout. A call without one waits until the job runner kills the job.

## CLI scripts and logging

```python
import argparse
import logging
import sys

def main() -> int:
    parser = argparse.ArgumentParser(description="Rotate logs")
    parser.add_argument("--env", choices=["dev", "prod"], default="dev")
    parser.add_argument("-v", "--verbose", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    log = logging.getLogger(__name__)
    log.info("deployed %s", args.env)
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

`choices` rejects any other `--env`. `action="store_true"` is a flag that is false when absent. `log.info("deployed %s", args.env)` formats the message only if that level is enabled. Inside an `except` block, `log.exception("deploy failed")` logs the traceback. `sys.exit` returns the integer to the shell, which CI and Ansible can read.

## AWS, Kubernetes, and OpenShift

```python
import boto3

session = boto3.Session(profile_name="dev", region_name="us-east-1")
s3 = session.client("s3")
for page in s3.get_paginator("list_objects_v2").paginate(Bucket="b"):
    for obj in page.get("Contents", []):
        print(obj["Key"])
```

Name the profile and the region. A list API returns one page. The paginator follows `NextToken` until the bucket is exhausted. `Contents` is absent when the page is empty.

```python
from kubernetes import client, config, dynamic

config.load_kube_config()
pods = client.CoreV1Api().list_namespaced_pod("team-dev")
for pod in pods.items:
    print(pod.metadata.name)

route_api = dynamic.DynamicClient(client.ApiClient()).resources.get(
    api_version="route.openshift.io/v1",
    kind="Route",
)
```

`load_kube_config()` reads `~/.kube/config` or `KUBECONFIG`. `load_incluster_config()` is the service-account token when the script runs in a pod. The typed client covers core pods. Routes are a custom resource, so the dynamic client looks them up by `apiVersion` and `kind`. Both libraries are separate installs: `boto3` and `kubernetes`.

## One-liners

```bash
python3 -m http.server 8000
python3 -c 'import sys; print(sys.version)'
python3 -m json.tool file.json
python3 -m pdb script.py
```

`http.server` serves the current directory. It has no authentication. `pdb` steps through the script. `breakpoint()` inside a file does the same thing on Python 3.7 and newer.

## Works here, fails in CI

```bash
which python3
python3 --version
python -m pip --version
```

The interpreter and `pip` have to be the same environment. `python -m pip` is the check. Rebuild `.venv` from `requirements.txt` on the runner instead of depending on packages that were already there.

A missing token should fail in `main` with a clear message, before any request is sent. `os.environ["TOKEN"]` raises `KeyError` when it is unset. `shutil.which("oc")` should fail the same way before `subprocess` does. Every `requests` call and every `subprocess.run` gets a `timeout`.
