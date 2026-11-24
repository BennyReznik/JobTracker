# Job Search Tracker

C# (.NET 10) API + Angular 22 frontend + SQLite, all run by Docker Compose.

## Prerequisites
- Docker Desktop (Compose included)
- VS Code with: C# Dev Kit, Angular Language Service, Docker (optional: .NET 10 SDK and Node 24 for running outside Docker)

## Run
```bash
docker compose up --build
```
- App: http://localhost:4200
- API: http://localhost:5000/api/jobs (health: /health)

The first build downloads images and npm packages, so it takes a few minutes.

## Where the data lives
Everything is stored in one SQLite file on your computer: `data/jobs.db` (in this folder). Docker mounts the `data` folder into the API container, so the file is not inside Docker. Deleting containers, `docker compose down -v`, pruning images/volumes or resetting Docker Desktop do not touch it.

While the app is running you may also see `jobs.db-wal` and `jobs.db-shm` next to it; they are part of the database, so keep them together with `jobs.db`.

- Stop: `docker compose down` (data is kept)
- Backup: stop the app (`docker compose down`), then copy `data/jobs.db` somewhere safe (e.g. OneDrive). Or, while running, copy all three `jobs.db*` files together.
- Restore: stop the app, put the backed-up `jobs.db` into `data/`, start it again.
- Delete all data: stop the app and delete the `data` folder.

The schema is created automatically on first start (`EnsureCreated`). For later schema changes, switch to EF Core migrations.

## Local development (without Docker)
```bash
cd backend/JobTracker.Api && dotnet run     # uses data/jobs.db at the repo root (appsettings.json)
cd frontend && npm install && npm start     # http://localhost:4200, proxies /api to localhost:5000
```
Note: `dotnet run` listens on the port in `Properties/launchSettings.json` or `ASPNETCORE_URLS`; if it is not 5000, set `ASPNETCORE_URLS=http://localhost:5000`.

## API
| Method | Path | |
|---|---|---|
| GET/POST | /api/jobs | list / create |
| GET/PUT/DELETE | /api/jobs/{id} | read / update / delete |
| GET/PUT | /api/settings | leaving-time window (HH:mm) |
