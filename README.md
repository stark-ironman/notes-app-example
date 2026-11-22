# notes-app-example

A small Node.js and MongoDB notes service. It is the sample app for the tutorial
[Build, deploy, and test a multi-container Docker application](https://thedigitaldrift.in/docker-multi-container-app)
on The Digital Drift. The app stores notes in MongoDB and reads them back by id.

> **This is a teaching example, not production code.** The app has no authentication and no TLS,
> and the MongoDB container in the walkthrough runs without a password. Do not expose it to the
> internet or store real data in it.

| File                | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `server.js`         | Express app with `/health`, `POST /notes` and `GET /notes/:id`         |
| `db.js`             | MongoDB connection helper that retries until the database is reachable |
| `Dockerfile`        | Builds the app image on `node:22-alpine` and runs it as the `node` user |
| `package.json`      | Dependencies: `express` and `mongodb`                                  |
| `package-lock.json` | Pinned dependency versions, installed with `npm ci`                    |

## Endpoints

| Method and path  | What it does                                                                  |
| ---------------- | ----------------------------------------------------------------------------- |
| `GET /health`    | `200` once MongoDB is connected, `503` before that                            |
| `POST /notes`    | Body `{"text": "..."}`. Stores the note and returns `201` with its `_id`      |
| `GET /notes/:id` | Returns the note, `404` if the id does not exist, `400` if the id is invalid  |

`text` must be a non-empty string of at most 10,000 characters.

```bash
# Health check
curl -s http://localhost:8080/health

# Write a note. The response contains the note's _id.
curl -s -X POST -H 'Content-Type: application/json' \
  -d '{"text":"hello from the notes app"}' \
  http://localhost:8080/notes

# Read the note back, using the _id from the previous response
curl -s http://localhost:8080/notes/<the _id from the previous response>
```

## Configuration

| Variable    | Default                          | Meaning                                  |
| ----------- | -------------------------------- | ---------------------------------------- |
| `MONGO_URL` | `mongodb://mongo:27017/sampledb` | MongoDB connection string                |
| `PORT`      | `3000`                           | Port the app listens on inside the container |

The default `MONGO_URL` uses the hostname `mongo`, so the database container must be named `mongo`
(or you set `MONGO_URL`).

## Run it with the published image

The image `satrajit1/notes-app:1.0.0` is built for `linux/amd64` and `linux/arm64`. You need only Docker.
These commands use the same names as the tutorial: network `app-network`, volume `mongo-data`,
containers `mongo` and `notes-app`.

```bash
docker pull satrajit1/notes-app:1.0.0

docker network create app-network

docker run -d \
  --name mongo \
  --network app-network \
  -v mongo-data:/data/db \
  mongo:8.0

docker run -d \
  --name notes-app \
  --network app-network \
  --publish 8080:3000 \
  satrajit1/notes-app:1.0.0
```

Start MongoDB first. The app retries its connection until the database answers, and `/health` returns
`503` until it connects. Wait a few seconds, then try the `curl` commands above.

## Build it from source

Clone this repository and build the image yourself. The tag `notes-app:v1` is the one the tutorial uses.

```bash
git clone https://github.com/stark-ironman/notes-app-example.git
cd notes-app-example
docker build -t notes-app:v1 .
```

Then run the same commands as above, replacing `satrajit1/notes-app:1.0.0` with `notes-app:v1`
(you do not need `docker pull`).

## Clean up

```bash
docker rm -fv notes-app mongo
docker network rm app-network
```

The named volume `mongo-data` stays until you remove it. Only do that when you no longer need the data:

```bash
docker volume rm mongo-data
```

## Publishing a release (maintainer notes)

`.github/workflows/publish.yml` builds the image for `linux/amd64` and `linux/arm64` and pushes it to
Docker Hub as `satrajit1/notes-app` when a tag that starts with `v` is pushed. The tag `v1.0.0` produces
the image tags `1.0.0`, `1` and `latest`. The repository needs the secrets `DOCKERHUB_USERNAME` and
`DOCKERHUB_TOKEN`.

## More Docker examples

Docker maintains larger multi-container sample projects you can study next:

- [dockersamples/example-voting-app](https://github.com/dockersamples/example-voting-app): a distributed app
  with Python, Node.js and .NET services, Redis and Postgres, run with Docker Compose, Swarm or Kubernetes.
- [dockersamples/atsea-sample-shop-app](https://github.com/dockersamples/atsea-sample-shop-app): a Java Spring Boot
  backend, a database, a React front end and an NGINX reverse proxy, using Docker secrets.

## License

[MIT](LICENSE)
