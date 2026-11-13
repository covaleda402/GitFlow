# 📘 Manual Técnico Detallado - GitFlow

Este documento contiene las especificaciones técnicas profundas, protocolos de integración y configuración avanzada para desarrolladores y administradores del sistema.

---

## 1. Base de Datos Neon (PostgreSQL)

### 1.1 Conexión y Seguridad
GitFlow utiliza el cliente nativo `pg` con SSL forzado (`ssl: { rejectUnauthorized: false }`) para conectarse a Neon Serverless PostgreSQL.
- **Formato de URI**: `postgresql://[usuario]:[password]@[host-neon]/[db]?sslmode=require`
- **Mitigación de SQL Injection**: Todas las consultas pasan estrictamente a través de `query(text, params)` utilizando **Prepared Statements** con parámetros `$1, $2, ...`.

### 1.2 Modo Resiliente en Memoria (Fallback Store)
Si no se especifica una cadena de conexión válida en `NEON_DB_URL`, el backend activa automáticamente su motor de persistencia simulada con datos semilla. Esto permite evaluar y probar toda la interfaz, el tablero Kanban, el editor colaborativo y los webhooks sin requerir una conexión activa a internet ni aprovisionamiento inicial.

### 1.3 Inicialización DDL
El esquema completo se encuentra en [`database/init-db.sql`](../database/init-db.sql). Define 4 entidades principales:
- `users`: Identidades provenientes de GitHub OAuth.
- `projects`: Espacios de trabajo y repositorios vinculados.
- `tasks`: Tareas del tablero Kanban con estados `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`.
- `commits`: Historial de telemetría de commits asociados mediante tags `#ID`.

---

## 2. Autenticación GitHub OAuth & JWT

### 2.1 Flujo OAuth 2.0
1. `GET /api/auth/github`: Redirige al usuario al consentimiento de GitHub con los scopes `read:user user:email repo`.
2. `GET /api/auth/github/callback`: 
   - Intercambia el código de autorización temporal por un `access_token` en `https://github.com/login/oauth/access_token`.
   - Recupera el perfil del usuario (`https://api.github.com/user`).
   - Inserta o actualiza el registro en la tabla `users` mediante consultas parametrizadas.
   - Genera y firma un JSON Web Token (JWT) con expiración de 7 días.
   - Redirige al frontend con el token para almacenarlo en `localStorage`.

### 2.2 Acceso en Modo Demo
Para entornos de desarrollo y evaluación rápida sin credenciales de GitHub:
- `POST /api/auth/demo-login`: Genera una sesión instantánea con uno de los perfiles precargados (`edwin-esquivel`, `maria-dev`, `alex-coder`).

---

## 3. Webhooks de GitHub y Telemetría en Tiempo Real

### 3.1 Procesamiento de Eventos Push
Endpoint: `POST /api/webhook/github`
1. Recibe el payload del push con el arreglo `commits`.
2. Identifica el proyecto mediante `repository.full_name`.
3. Analiza el mensaje del commit usando la expresión regular:
   ```javascript
   const taskRegex = /#(\d+)/i;
   ```
4. Si detecta palabras clave de cierre (`fix #ID`, `closes #ID`, `resolves #ID`), actualiza el estado de la tarea en base de datos a `DONE`.
5. Si la tarea estaba en `TODO`, la avanza automáticamente a `IN_PROGRESS`.
6. Guarda el commit en la tabla `commits` y emite vía Socket.io:
   - `new_commit`: Notifica a todos los clientes suscritos.
   - `task_status_changed`: Actualiza la posición de la tarjeta en el Kanban sin recargar la página.

### 3.2 Endpoint de Simulación
- `POST /api/webhook/simulate`: Permite disparar payloads idénticos a los de GitHub directamente desde la interfaz de usuario mediante el botón **"Simular Push"**, facilitando pruebas locales sin túneles ngrok.

---

## 4. WebSockets y Edición Colaborativa (Socket.io)

### 4.1 Salas y Eventos Soportados
- `join_project`: Une el socket del cliente a la sala `project_{id}` y difunde la lista de usuarios conectados (`room_users`).
- `typing_context`: Transmite alertas de edición colaborativa en el documento Markdown (*"Usuario X está editando..."*).
- `context_draft_change`: Sincroniza borradores de texto en tiempo real entre colaboradores conectados.
- `task_moved`: Notifica cambios de estado realizados desde el tablero Kanban.

---

## 5. Especificación de Endpoints REST

| Método | Endpoint | Descripción | Auth Requerida |
|---|---|---|---|
| `GET` | `/api/health` | Estado del servidor y sockets activos | No |
| `GET` | `/api/projects` | Lista de proyectos registrados | Opcional |
| `GET` | `/api/projects/:id` | Detalle del proyecto y Markdown actual | Opcional |
| `PUT` | `/api/projects/:id/context` | Actualización de la documentación Markdown | Sí (JWT) |
| `GET` | `/api/projects/:id/tasks` | Tareas del Kanban con desarrollador y commits | Opcional |
| `POST` | `/api/projects/:id/tasks` | Creación de nueva tarea ágil | Sí (JWT) |
| `PATCH` | `/api/tasks/:id/status` | Actualización del estado de una tarea | Sí (JWT) |
| `GET` | `/api/projects/:id/dashboard` | Métricas de aportes, velocidad y commits | Opcional |
| `GET` | `/api/users` | Lista de desarrolladores para asignación | Opcional |
| `POST` | `/api/webhook/github` | Receptor oficial de webhooks GitHub | No |
| `POST` | `/api/webhook/simulate` | Simulador de commits para desarrollo | No |

---

## 6. Despliegue en Producción (Vercel)

El repositorio incluye la configuración monorepo en [`vercel.json`](../vercel.json):
- Las peticiones bajo `/api/*` son atendidas por `backend/api/index.js` mediante `@vercel/node`.
- El frontend estático es construido desde `app/web` con `@vercel/static-build`.
- Variables de entorno obligatorias en el dashboard de Vercel:
  - `NEON_DB_URL`
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `JWT_SECRET`
  - `FRONTEND_URL`
