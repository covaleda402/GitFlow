# ⚡ GitFlow (RepoSync / GitPulse)

> **Plataforma de Gestión Ágil y Telemetría de Código en Tiempo Real**  
> Unificando el esfuerzo de desarrollo en GitHub con la gestión de proyectos de alto impacto.

[![Node.js](https://img.shields.io/badge/Node.js-v20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?logo=postgresql&logoColor=white)](https://neon.tech)
[![Socket.io](https://img.shields.io/badge/WebSockets-Socket.io_4.8-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel_Ready-000000?logo=vercel&logoColor=white)](https://vercel.com)

---

## 🚀 Visión del Proyecto

Los tableros ágiles convencionales sufren de desconexión entre el código y las tareas: los desarrolladores deben actualizar manualmente tarjetas tras hacer commits, lo que genera retrasos y desincronización en los equipos.

**GitFlow** resuelve este problema mediante un ecosistema unificado donde:
1. **GitHub OAuth**: Los integrantes se autentican con su identidad de GitHub, extrayendo avatar y usuario al instante.
2. **Sincronización por Webhooks**: Cada commit empujado a GitHub es analizado por el backend mediante expresiones regulares (ej. `feat: login integrado #12` o `fixes #5`). El commit se asocia automáticamente a la tarea correspondiente y avanza su estado de forma autónoma.
3. **Editor de Contexto Colaborativo**: Espacio de documentación técnica estilo Notion sincronizado en vivo vía **WebSockets (Socket.io)** con alertas de presencia (*"Usuario X está editando el contexto..."*).
4. **Dashboard de Aportes & Telemetría**: Algoritmo de impacto que cruza commits realizados con tareas cerradas y calcula la velocidad del sprint del equipo en tiempo real.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS (Dark Tech Theme), React Router v6, Socket.io-client, Lucide Icons |
| **Backend** | Node.js, Express, Socket.io, `pg` (PostgreSQL Client con SSL), Axios, JWT, CORS |
| **Base de Datos** | Neon Serverless PostgreSQL (DDL con Prepared Statements estrictos contra SQL Injection) |
| **Autenticación** | GitHub OAuth 2.0 + JSON Web Tokens (JWT) + Modo Demo para pruebas inmediatas |
| **Despliegue** | Vercel (Monorepo con rewrites a Serverless Functions y estáticos optimizados) |

---

## 📁 Estructura del Proyecto

```text
GitFlow/
├── .env.example                  # Plantilla de variables de entorno
├── .env                          # Configuración local de entorno
├── .gitignore                    # Reglas de exclusión de Git
├── package.json                  # Scripts globales del Monorepo
├── vercel.json                   # Configuración de despliegue en Vercel
├── README.md                     # Documentación principal
│
├── database/
│   └── init-db.sql               # DDL completo, constraints, índices y seed data
│
├── backend/
│   ├── package.json              # Dependencias de Express, Socket.io, pg
│   ├── server.js                 # Servidor HTTP, Express y Socket.io engine
│   ├── db.js                     # Conexión a Neon PostgreSQL con Prepared Statements
│   ├── api/
│   │   └── index.js              # Export para Vercel Serverless Functions
│   ├── middleware/
│   │   └── auth.js               # Middleware de verificación y protección JWT
│   └── routes/
│       ├── auth.js               # OAuth de GitHub (redirect, callback, me, demo)
│       ├── webhooks.js           # Receptor de webhooks push y simulación
│       └── api.js                # Endpoints de proyectos, tareas, contexto y dashboard
│
├── app/
│   └── web/
│       ├── package.json          # Dependencias de Vite, React y Tailwind
│       ├── vite.config.js        # Configuración de Vite y proxy de desarrollo
│       ├── tailwind.config.js    # Paleta oscura cibernética (Cyan, Violeta, Obsidiana)
│       ├── postcss.config.js     # Procesador de CSS
│       ├── index.html            # Entry HTML con fuentes JetBrains Mono e Inter
│       └── src/
│           ├── main.jsx          # Punto de entrada de React DOM
│           ├── App.jsx           # Ruteo principal (Login, Dashboard, Proyecto)
│           ├── index.css         # Estilos globales y utilidades de glassmorphism
│           ├── context/
│           │   ├── AuthContext.jsx     # Estado de sesión y autenticación
│           │   └── SocketContext.jsx   # Conexión persistente a WebSockets
│           ├── components/
│           │   ├── Navbar.jsx          # Barra superior con status live y simulación
│           │   ├── GitHubLogin.jsx     # Card de login OAuth y modo demo rápido
│           │   ├── KanbanBoard.jsx     # Tablero ágil interactivo (TODO -> DONE)
│           │   ├── LiveContextEditor.jsx # Editor Markdown colaborativo en vivo
│           │   ├── ActivityFeed.jsx    # Feed reactivo de commits entrantes
│           │   └── ContributionDashboard.jsx # Métricas de impacto y leaderboard
│           └── views/
│               ├── LoginView.jsx       # Vista de inicio de sesión
│               ├── DashboardView.jsx   # Vista general de telemetría y proyectos
│               └── ProjectView.jsx     # Vista de espacio de trabajo del proyecto
│
└── docs/
    └── architecture.md           # Diagramas Mermaid (Flujo, ERD, Secuencia)
```

---

## ⚡ Instalación y Puesta en Marcha Local

### 1. Clonar el Repositorio
```bash
git clone https://github.com/edwin-esquivel-ADSO/GitFlow.git
cd GitFlow
```

### 2. Instalar Dependencias
Puedes instalar las dependencias de todo el monorepo con un solo comando:
```bash
# Desde la raíz:
npm run install:all
```

O individualmente:
```bash
cd backend && npm install
cd ../app/web && npm install
```

### 3. Configurar Variables de Entorno
Copia `.env.example` a `.env`:
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:
```env
PORT=5000
FRONTEND_URL=http://localhost:5173
NEON_DB_URL=postgresql://[usuario]:[password]@[neon-host]/[database]?sslmode=require
GITHUB_CLIENT_ID=tu_github_client_id
GITHUB_CLIENT_SECRET=tu_github_client_secret
JWT_SECRET=tu_clave_secreta_jwt_super_segura
```

> **Nota de Resiliencia**: Si aún no has creado tu base de datos en Neon, GitFlow detecta automáticamente la ausencia de la cadena de conexión e inicializa un **almacén seguro en memoria con datos semilla (Seed Data)**, permitiendo probar y evaluar el 100% de las funcionalidades de inmediato sin fallas.

### 4. Inicializar la Base de Datos en Neon
Para aprovisionar tu base de datos en Neon PostgreSQL:
1. Inicia sesión en [neon.tech](https://neon.tech) y crea un nuevo proyecto.
2. Abre la consola **SQL Editor** de Neon.
3. Copia y ejecuta el archivo [`database/init-db.sql`](database/init-db.sql).

### 5. Ejecutar en Modo Desarrollo
En terminales separadas (o con `npm run dev`):

```bash
# Terminal 1: Backend API & Socket.io (Puerto 5000)
cd backend
npm run dev

# Terminal 2: Frontend Vite (Puerto 5173)
cd app/web
npm run dev
```

Abre tu navegador en `http://localhost:5173`.

---

## 🔗 Configuración de GitHub OAuth & Webhooks

### Paso A: Crear una GitHub OAuth App
1. Ve a [GitHub Settings > Developer Settings > OAuth Apps](https://github.com/settings/developers).
2. Haz clic en **New OAuth App**:
   - **Application name**: `GitFlow Local`
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5000/api/auth/github/callback`
3. Copia el **Client ID** y genera un **Client Secret**, y colócalos en tu `.env`.

### Paso B: Configurar Webhooks de Repositorio
1. En tu repositorio de GitHub, ve a **Settings > Webhooks > Add webhook**.
2. **Payload URL**: `https://tu-dominio-o-ngrok.com/api/webhook/github`
3. **Content type**: `application/json`
4. Selecciona el evento: **Just the push event**.

### Paso C: Simulación Instantánea sin Túneles
GitFlow incluye un endpoint de simulación integrado para que puedas verificar la telemetría sin necesidad de abrir túneles con ngrok:
- Haz clic en el botón **"Simular Push"** en la barra de navegación de la app web.
- Ingresa un mensaje como `feat: nueva funcion #3` o `fixes #3`.
- Observa cómo el commit aparece instantáneamente en el feed y la tarea #3 cambia de estado automáticamente.

---

## 🚀 Despliegue en Vercel

GitFlow está completamente configurado para desplegarse en **Vercel** usando monorepo routing declarado en [`vercel.json`](vercel.json):

1. Sube tu código a GitHub.
2. En [vercel.com](https://vercel.com), selecciona **Add New > Project** e importa este repositorio.
3. Configura las siguientes Variables de Entorno en el panel de Vercel:
   - `NEON_DB_URL`
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `JWT_SECRET`
   - `FRONTEND_URL` (URL de producción de Vercel)
4. Haz clic en **Deploy**. Vercel compilará el frontend estático y expondrá los endpoints de `/api/*` como Serverless Functions.

---

## 🛡️ Seguridad y Buenas Prácticas

- **Prepared Statements Estrictos**: Todas las consultas a PostgreSQL usan `pg.Pool.query(text, params)` con parámetros `$1, $2, ...` para neutralizar inyecciones SQL.
- **Protección de Rutas JWT**: Middleware `authenticateToken` valida el token Bearer en cada mutación de datos.
- **CORS Estricto**: Configuración de encabezados restrictiva para evitar peticiones no autorizadas de orígenes desconocidos.
- **Principio Zero Placeholders**: Cada archivo contiene código funcional, estructurado y sin abreviaciones ni comentarios de relleno.

---

## 👥 Equipo OMNICODE

- **A00 - Orquestador**: Coordinación y arquitectura de extremo a extremo.
- **A03 / A05 - Product Owner & UX**: Solidificación de la visión, diseño de interfaz oscura cibernética.
- **A06 / A10 - Arquitecto & DBA**: Esquema de datos Neon PostgreSQL y flujos reactivos WebSockets.
- **Lead Developer**: Edwin Esquivel ([@edwin-esquivel-ADSO](https://github.com/edwin-esquivel-ADSO))
