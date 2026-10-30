---
title: Docker
description: Run containers, build images, and drive Compose without the cleanup surprises.
tags:
  - Docker
---

Examples use `docker compose` (the v2 plugin). The older standalone binary is `docker-compose`.

## Run a container

```bash
docker version
docker run --rm -it ubuntu:24.04 bash
docker run -d --name web -p 8080:80 nginx:alpine
docker run --rm -e APP_ENV=dev -v "$PWD":/work -w /work ubuntu:24.04 ls
```

`--rm` deletes the container when it exits. `-it` attaches a terminal, which you want for a shell and not for a daemon. `-d` runs in the background. `-p 8080:80` publishes container port 80 on host port 8080. `-v` mounts the current directory at `/work`. Pin a version or digest for anything that stays running. `nginx:alpine` and `ubuntu:24.04` here are stand-ins so the flags are easy to read.

```bash
docker ps
docker ps -a
docker logs -f web
docker stop web
docker rm web
```

`docker ps` is running containers. `-a` includes stopped ones. `logs -f` follows output the way `tail -f` does.

## Look inside

```bash
docker exec -it web sh
docker inspect web
docker stats --no-stream
```

`exec` starts a process in a container that is already running. `inspect` prints the JSON config, mounts, and network addresses. `stats --no-stream` prints one sample of CPU and memory instead of a live view.

```bash
docker network ls
docker volume ls
```

## Images and Dockerfiles

```bash
docker build -t ranch/app:dev .
docker images
docker pull nginx:alpine
docker history ranch/app:dev
docker rmi ranch/app:dev
```

A small image build. `CMD` is the default process, in exec form so signals reach the process directly. `USER` drops root.

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
USER nobody
EXPOSE 8000
CMD ["python", "app.py"]
```

`EXPOSE` documents the port. It does not publish it. Publishing still happens with `-p` or a Compose `ports` entry.

A dependency file copied before the rest of the source keeps the install layer cached when only application code changes. A `.dockerignore` that excludes `.git`, virtualenvs, and local secrets keeps those out of the build context.

Multi-stage builds compile in one image and ship a runtime image that does not contain the compiler.

```dockerfile
FROM golang:1.25 AS build
WORKDIR /src
COPY . .
RUN CGO_ENABLED=0 go build -o /out/app .

FROM alpine:3.22
COPY --from=build /out/app /usr/local/bin/app
USER 65534:65534
ENTRYPOINT ["app"]
```

`ENTRYPOINT` is the fixed executable. `CMD` would supply default arguments that `docker run` can replace. Use `ENTRYPOINT` when the container should always be that one program.

## Compose

Compose v2 does not need a top-level `version` key.

```yaml
services:
  api:
    image: nginx:alpine
    ports:
      - "8080:80"
```

```bash
docker compose up -d
docker compose ps
docker compose logs -f api
docker compose exec api sh
docker compose down
```

> `docker compose down -v` also removes named volumes declared in the file. Database files that lived in those volumes are gone.

## Cleanup

```bash
docker system df
docker system prune
```

> `docker system prune` removes stopped containers, unused networks, and dangling images. It does not remove volumes unless you add `--volumes`. Adding `-a` also removes unused images, not only dangling ones. Do not point either flag at a machine whose unused images you still wanted cached.
