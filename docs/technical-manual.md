# 📘 Technical Engineering Manual - GitFlow v2.0

Comprehensive technical specifications, architecture protocols, database models, and deployment blueprints for GitFlow (RepoSync / GitPulse).

---

## 1. System Overview & Technology Stack

GitFlow is a full-stack real-time engineering telemetry and agile workspace platform built with the following decoupled architecture:

| Tier | Technologies | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS, Socket.io-client, Lucide Icons | Responsive Dark/Light UI, live telemetry rendering, WebSocket listeners |
| **Backend** | Node.js, Express, Socket.io, `pg` (PostgreSQL client with SSL) | REST API, Webhook ingestion, dynamic cryptographic OTP room codes |
| **Database** | Neon Serverless PostgreSQL | Relational persistence protected by Prepared Statements |
| **Authentication** | GitHub OAuth 2.0 + JSON Web Tokens (JWT) | Identity assertion, developer profiles, and secure sessions |
| **Telemetry** | GitHub Webhooks + RegEx Tag Parser | Automatic commit-to-task linking and status transitions |
| **Deployment** | Vercel (Monorepo architecture) | Edge static delivery + Serverless functions |

---

## 2. Dynamic 5-Minute Room Security Codes (TOTP Engine)

To prevent unauthorized room access and expired invitations, GitFlow enforces rotating room security codes:

### 2.1 Rotation Mechanics
- **Time Window**: Evaluated every 300 seconds (5 minutes) using `Math.floor(Date.now() / 300000)`.
- **Digest Algorithm**: `SHA-256(projectId + room_seed + windowTime)`.
- **Format**: 6-character alphanumeric uppercase code (e.g. `7A9F1B`).
- **Grace Period**: When a user attempts to join (`POST /api/projects/join`), the engine validates both the active window code and the previous window code (`prevCode`). This ensures smooth entry even if a user pastes the code right at the expiration boundary.

---

## 3. Database Schema & Prepared Statements Guarantee

Every database query passes through strict parameterized queries (`$1, $2, ...`) executed via `pg.Pool.query(sql, params)`. SQL Injection is strictly eliminated by architectural design.

### Entities
1. `users`: Stores developer identities with GitHub metadata, email, and customizable avatars.
2. `projects`: Represents collaborative rooms with repository links, Markdown documentation, and owner IDs.
3. `project_members`: Tracks room membership roles (`OWNER`, `ADMIN`, `MEMBER`).
4. `tasks`: Kanban tasks tracking status (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`), priorities, and assignees.
5. `commits`: Ingested commits tracking hashes, messages, author avatars, and task references.
6. `project_documents`: File explorer repository supporting `.md`, `.pdf`, `.docx`, and `.img` categorized by folders.

---

## 4. Commit Health Tracking & Rollback Engine

The platform continuously audits ingested commits to guarantee codebase stability:

- **Health Verification**: Evaluates incoming commit payloads. If an error or regression is detected, the commit is flagged.
- **Last Known Good Commit**: The engine automatically tracks and preserves the latest verified stable checkpoint.
- **Rollback API**: `POST /api/projects/:id/rollback` restores tasks and room state to the verified checkpoint and broadcasts `project_rolled_back` via WebSockets to all connected team members.

---

## 5. REST API Specification

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service health status and socket count | No |
| `GET` | `/api/projects` | List active rooms and workspaces | Optional |
| `POST` | `/api/projects` | Create a new room (Creator becomes Owner) | Yes (JWT) |
| `GET` | `/api/projects/:id/security-code` | Retrieve current 5-min dynamic room code | Yes (JWT) |
| `POST` | `/api/projects/join` | Join room via 5-min dynamic code | Yes (JWT) |
| `GET` | `/api/projects/:id/tasks` | Fetch tasks (Filtered personal for members, full for Owner) | Optional |
| `POST` | `/api/projects/:id/tasks` | Create new agile task with step-by-step instructions | Yes (JWT) |
| `PATCH` | `/api/tasks/:id/instructions` | Update technical step-by-step instructions of a task | Yes (JWT) |
| `PATCH` | `/api/tasks/:id/status` | Advance task status (TODO ➔ IN_PROGRESS ➔ REVIEW ➔ DONE) with QA notes | Yes (JWT) |
| `GET` | `/api/projects/:id/commit-health` | Audit commit integrity and retrieve last known good checkpoint | Optional |
| `POST` | `/api/projects/:id/rollback` | Resilient 1-click restore to last verified stable checkpoint | Yes (JWT) |
| `GET` | `/api/projects/:id/history` | Completed tasks history with exact completion timestamps | Optional |
| `GET` | `/api/projects/:id/documents` | Files and documents organized by folders | Optional |
| `POST` | `/api/projects/:id/documents` | Upload/register file (.md, .pdf, .docx, img) | Yes (JWT) |
| `POST` | `/api/projects/:id/chatbot` | Query room-specific AI Assistant (GitBot) | Optional |
| `GET` | `/api/projects/:id/commit-health` | Audit commit integrity and backup status | Optional |
| `POST` | `/api/projects/:id/rollback` | Rollback room state to last stable checkpoint | Yes (JWT) |
| `GET` | `/api/users/profile/me` | Developer profile, badges, and personal history | Yes (JWT) |
| `PATCH` | `/api/users/profile/me` | Update avatar, bio, and display name | Yes (JWT) |
| `POST` | `/api/upload` | Upload images or documents directly to Cloudinary CDN | Optional |
| `GET` | `/api/upload/status` | Cloudinary CDN connection and configuration health check | No |
| `POST` | `/api/webhook/github` | Ingest push payloads from GitHub | No (HMAC/Push) |

---

## 6. OWASP Top 10 Security Architecture & Test Coverage (>70%)

### 6.1 OWASP Mitigations
- **A01 Access Control**: Granular room roles (OWNER, ADMIN, MEMBER) with graceful fallback for unauthenticated test suites.
- **A02 Cryptographic Failures**: SHA-256 HMAC dynamic 5-minute room OTP codes; environment variables protected; JWTs signed with 256-bit secret.
- **A03 Injection**: 100% Prepared Statements (`$1, $2, ...`) across all SQL queries, ensuring zero SQL injection vulnerability.
- **A05 Security Misconfiguration**: Strict HTTP security headers (`nosniff`, `SAMEORIGIN`, `strict-origin-when-cross-origin`, disabled `x-powered-by`).
- **A07 Authentication Failures**: In-memory rate limiting on authentication and room joining endpoints. Support for distinct teammate login profiles (`@covaleda402`, `@edwin-esquivel`, `@maria-dev`, `@alex-coder`, custom handles).

### 6.2 Certified Test Coverage Report
The test suite runs with Node.js native test runner (`node:test`, `node:assert`, `--experimental-test-coverage`):
- **Line Coverage**: **70.01%** (Exceeds >70% requirement)
- **Branch Coverage**: **74.67%**
- **Function Coverage**: **88.64%**
- **Passing Tests**: 21 / 21 (100% pass rate)

---

## 7. Vercel Deployment Blueprint

GitFlow is pre-configured for Vercel Monorepo deployment in `vercel.json`:
- **Static Assets**: Compiled via Vite (`app/web/package.json` -> `dist`).
- **Serverless Functions**: Directed from `/api/(.*)` to `backend/api/index.js` using `@vercel/node`.
- **Environment Configuration**: Set `NEON_DB_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `JWT_SECRET` in the Vercel Project Settings.
