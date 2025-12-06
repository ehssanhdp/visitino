# Visitino (not a good name)

Mobile-first field visit and routing app built with Expo (React Native) on the client and a Go backend that handles auth, shop search, route optimization, and visit tracking.
<p align="center">
  <img src="https://github.com/user-attachments/assets/6dacbbb1-ca4d-4e87-8310-33a0cf6fc6bc" width="300">
  <img src="https://github.com/user-attachments/assets/3a13d7cc-61e4-42de-b1a0-4878d1b50eea" width="300">
</p>





## Overview
- **Frontend**: Expo Router app in `app/` with Persian UI for home, login, registration, search/routing, and turn-by-turn navigation handoff to Neshan.
- **Backend**: Go (Gorilla Mux) API in `backend/` with JWT auth, Redis token blacklist, Postgres persistence (users + visit logs), and integrations with Neshan Search/TSP APIs plus local geo utilities.
- **Geo utilities**: Python helpers under `backend/internal/pkg/utils/districtOperations/` to process Tehran district polygons and filter search results to the selected region.

## Features
- User registration/login with JWT access + refresh tokens and Redis-based blacklist on logout.
- Shop search constrained to a selected municipal district; results ordered by proximity to the user.
- Route optimization (TSP) for up to 5 selected shops using Neshan TSP API.
- Navigation handoff to Neshan maps for each stop.
- Visit marking: logs user and visited point locations into PostGIS geometry columns.

## Project Structure
- `app/` – Expo screens (`index`, `login`, `register`, `routing`, `navigation`) and routing.
- `backend/main.go` – Entry point: loads env, connects Postgres + Redis, mounts routes.
- `backend/internal/router/` – HTTP routes.
- `backend/internal/handlers/` – Auth, search, route optimization, visit marking.
- `backend/internal/pkg/` – API clients, models, JWT + Redis + misc utilities, geo helpers.
- `backend/internal/db/` – Gorm models (`User`, `Visited`) and Postgres setup.
- `utils/storage.js` – Frontend token storage via Expo Secure Store.

## Requirements
- Node.js + npm
- Expo CLI (`npm install -g expo-cli`) and an Android/iOS emulator or device
- Go 1.21+ (go.mod targets 1.24 toolchain)
- Postgres (with PostGIS extension enabled for geometry columns)
- Redis (for token blacklist)
- Python 3 with `pip install shapely` (used by region processor/checker scripts)

## Environment Variables
Create a `.env` file at the repo root (loaded by the Go backend and Expo `@env`):

```
# Backend
DBUser=postgres
DBPassword=postgres
DBName=visitino
DBHost=localhost
DBPort=5432
JWT_SECRET=super-secret-key
REDIS_PASSWORD=        # leave empty if none

# Neshan APIs
NeshanSearchAPIURL=https://api.neshan.org/v2/search
NeshanTSPAPIURL=https://api.neshan.org/v4/tsp
SEARCHAPI=<your-neshan-search-api-key>
TSPAPI=<your-neshan-tsp-api-key>

# Frontend
base_url=http://localhost:8080
```

## Running the Backend
```bash
cd backend
go run main.go
```
- The server listens on `0.0.0.0:8080`.
- Auto-migrates Postgres schema for `users` and `visited` tables.
- Ensure PostGIS is enabled and Redis is running locally.

## Running the Frontend (Expo)
```bash
npm install
npm run start           # or: npm run android / npm run ios / npm run web
```
- Uses `base_url` from `.env` for API calls.
- Tokens are stored via Expo Secure Store (`utils/storage.js`).

## API Endpoints (backend)
- `POST /register` – `{ first_name, last_name, phone, password, role }` -> create user.
- `POST /login` – `{ phone, password }` -> returns `{ access_token, refresh_token }`.
- `POST /logout` – blacklists tokens (requires auth middleware context).
- `POST /refresh` – issue new tokens (expects valid refresh token).
- `POST /protected` – demo protected route (requires auth).
- `POST /search-shops` – body `{ keywords, selectedregion, userLocation:{lat,lng} }`; searches via Neshan, filters to district, returns sorted items.
- `POST /optimize-routes` – body `{ user:{lat,lng}, stores:[...] }`; returns optimized points from Neshan TSP with metadata.
- `POST /mark-visited` – body `{ userLocation:{lat,lng}, visitedLocation:{lat,lng} }`; logs visit for current user.

## Data Flow Highlights
- **Auth**: Phone is normalized to `+98...`; passwords hashed with bcrypt; JWTs signed with `JWT_SECRET`; blacklist stored in Redis.
- **Search**: Python `region_processor.py` picks sample coords in a district; results filtered by `region_checker.py`; distances computed by Haversine, sorted by proximity.
- **Routing**: Client selects up to 5 shops; backend calls Neshan TSP to order stops; frontend guides user step-by-step and opens Neshan maps for navigation.
- **Visit logging**: `mark-visited` writes user + visited points as SRID 4326 geometry to Postgres.

## Development Tips
- Ensure Python scripts can execute from `backend/internal/pkg/utils/districtOperations/` (repo-relative paths are used).
- If running backend inside a container, expose Postgres and Redis and pass env vars accordingly.
- For production, serve backend behind HTTPS and configure CORS as needed (Gorilla Mux router is in `internal/router/router.go`).

## Testing Checklist
- Register, login, and refresh flows return tokens and reject bad credentials.
- Search returns results for a district and enforces ≤3 keywords.
- Route optimization works with 1–5 selected shops.
- Navigation handoff opens Neshan with the correct origin/destination.
- Mark visited stores data in Postgres with geometry columns populated.


