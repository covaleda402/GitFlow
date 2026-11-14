# 📖 Manual de Usuario - GitFlow v2.0

Bienvenido a la guía oficial de usuario de **GitFlow**. Esta plataforma unifica la gestión ágil de proyectos con la telemetría en tiempo real de tus commits de GitHub.

---

## 1. Inicio de Sesión y Acceso

1. Abre tu navegador e ingresa a la plataforma (`http://localhost:5173` en local o tu URL en Vercel).
2. Verás la pantalla de inicio de sesión con dos modalidades:
   - **Iniciar sesión con GitHub**: Te autentica con tu cuenta real de GitHub, importando tu avatar, usuario y repositorios.
   - **Entrar en Modo Demo**: Te permite ingresar inmediatamente con un perfil de prueba preconfigurado (*Edwin Esquivel, Maria Gomez, Alex Rivera*) sin necesidad de claves externas.

---

## 2. Navegación en Pantalla

* **En Computadora (PC / Desktop)**:
  - Dispones de una **barra lateral izquierda fija (Sidebar)**.
  - En la parte superior encuentras el selector de sala activa, botones para crear o unirte a salas, el **código dinámico de 5 minutos**, y el botón de alternar entre **Modo Claro y Modo Oscuro**.
  - En el cuerpo accedes a todos los apartados principales: *Tablero Ágil, Documentos & Contexto, Historial Terminado, Telemetría y Mi Perfil*.
* **En Dispositivos Móviles**:
  - Cuentas con una **barra inferior táctil estilo TikTok** con acceso directo a: *Tablero, Documentos, Botón Central de Push (+), Historial y Perfil*.
  - La barra superior incluye el botón para cambiar de sala y el alternador de tema claro/oscuro.

---

## 3. Gestión de Salas y Código de Seguridad de 5 Minutos

### 3.1 Crear una Nueva Sala
1. En el Sidebar o barra superior, haz clic en **`+ Nueva`**.
2. Ingresa el nombre de la sala, descripción y el repositorio de GitHub vinculado (ej. `tu-usuario/tu-repositorio`).
3. Haz clic en **Crear Sala**. Te convertirás en el **Administrador / Creador** de la sala.

### 3.2 Unirse a una Sala Existente
1. Haz clic en el botón **`Unirse`** o **`Código`**.
2. Ingresa el código de 6 caracteres que te proporcione el creador de la sala (ej. `7A9F1B`).
3. Pulsa **Entrar a la Sala**. Ingresarás automáticamente con el rol de **Miembro**.

> ⏱️ **Seguridad con Rotación de 5 Minutos**:  
> Cada sala genera un código temporal que rota automáticamente cada 5 minutos. En el Sidebar puedes ver el código actual, los segundos restantes y un botón de **1 clic para copiarlo**.

---

## 4. Tablero Ágil (Kanban), Instrucciones y Privacidad de Tareas

* **Privacidad Inteligente**:
  - **Si eres Miembro**: Solo verás **tus tareas personales**, manteniendo tu espacio enfocado.
  - **Si eres el Creador**: Tienes supervisión completa de **todo el equipo** y puedes alternar entre *Todo el Equipo* y *Mis Tareas*, o filtrar por cualquier integrante.
* **Instrucciones Técnicas Paso a Paso**:
  - Cada tarjeta en el Kanban incluye un botón desplegable **`Pasos e Instrucciones`**.
  - Al abrirlo, podrás consultar la guía paso a paso documentada para ejecutar la tarea o pulsar **`✏️ Editar pasos`** para afinarla en vivo.
* **Ciclo de Vida de una Tarea**:
  $$\text{Por Hacer} \longrightarrow \text{En Progreso} \longrightarrow \text{En Revisión} \longrightarrow \text{Revisión Previa (QA)} \longrightarrow \text{Terminada}$$
* **Cierre Automático por Git**:
  - Si realizas un commit con el mensaje `feat: login #3`, la tarea #3 pasa a *En Progreso*.
  - Si tu commit incluye `fixes #3` o `closes #3`, la tarea se marca como **Terminada** y se traslada automáticamente al **Historial**.

---

## 5. Control de Calidad & Revisión Previa (QA)

Antes de archivar una tarea en el historial definitivo, la pestaña **Revisión Previa (QA)** actúa como la puerta de control de calidad:

1. **Checklist Interactivo de Verificación**:
   - ✅ *Cero errores de compilación y pruebas*.
   - ✅ *Paso a paso cumplido cabalmente*.
   - ✅ *Código limpio, sin credenciales ni fugas*.
   - ✅ *Responsive móvil y estilo verificado*.
2. **Dictamen y Observaciones**:
   - Puedes redactar notas de auditoría en la casilla de observaciones.
   - **Aprobar y Finalizar (DONE)**: Cierra la tarea guardando las notas de calidad en el historial.
   - **Solicitar Ajustes (Devolver a En Progreso)**: Devuelve la tarea con feedback técnico claro para que el desarrollador aplique las correcciones.

---

## 6. Historial Terminado y Trazabilidad

En el apartado **Historial Terminado** se almacenan todas las tareas cerradas. Cada tarjeta muestra:
- Número de tarea `#ID` y título.
- Desarrollador responsable y su avatar.
- Fecha y hora exacta de finalización (`13 nov 2026 · 02:45 PM`).
- Número de commits asociados.
- Acordeón **"Ver notas de finalización y pasos cumplidos"**: Despliega la auditoría técnica completa de cómo se completó la tarea.

---

## 7. Control de Commits y Motor de Respaldo (Rollback Engine)

En la pestaña **Telemetría y Respaldo**:
- Monitorea la integridad de todos los commits que llegan mediante Webhooks de GitHub.
- Si un push introduce un bug o rompe la aplicación, el botón **`Restaurar a Último Respaldo`** permite devolver las tareas y el estado al último checkpoint funcional con **1 solo clic**.

---

## 8. Documentos, Contexto y Editor Colaborativo en Vivo

En la sección **Documentos & Contexto** encontrarás:
1. **Explorador por Carpetas**: Carpetas visuales categorizadas (*Arquitectura*, *Diseño & UX*, *Reuniones & Notas*, *Documentación General*).
2. **Formatos Soportados**:
   - **Markdown (`.md`)**: Puedes leer el documento o abrir el **Editor Colaborativo en Vivo** con alta legibilidad en **Modo Claro y Modo Oscuro**, citas, listas y sincronización instantánea por WebSockets.
   - **PDF (`.pdf`) y Word (`.docx`)**: Con enlaces directos para abrir o descargar.
   - **Imágenes (`.img`)**: Miniaturas con el botón **"Ver con Zoom"** que abre un visor interactivo con controles de aumento y alejamiento.
3. **Nuevo Documento**: Pulsa el botón `+ Nuevo Documento` para registrar archivos, notas o enlaces en cualquier carpeta.

---

## 9. Chatbot de Sala (GitBot AI)

En la esquina inferior derecha verás el botón flotante **GitBot Asistente**:
- Haz clic sobre él para abrir el chat inteligente de la sala.
- Puedes pulsar cualquiera de los chips sugeridos o escribir preguntas libres como:
  - *"¿De qué trata esta sala?"*
  - *"¿Qué tareas faltan por hacer?"*
  - *"¿Qué ha hecho @edwin-esquivel?"*
  - *"¿Qué documentos hay en las carpetas?"*
- GitBot responderá leyendo la información en tiempo real de la sala.

---

## 8. Telemetría de Commits y Respaldo Continuo

En la pestaña **Telemetría**:
- Verás el feed de commits en vivo sincronizados con GitHub.
- El panel **Control de Commits y Respaldo** te permite verificar la integridad del código. Si algún commit genera fallas, puedes pulsar el botón **"Restaurar a Último Respaldo"** para revertir el estado al último punto verificado.
- Puedes probar el flujo en local con el botón **"Simular Push de Git"**.

---

## 9. Mi Perfil

En la sección **Mi Perfil**:
- Puedes personalizar tu avatar eligiendo entre tu foto de GitHub, avatares temáticos (*Tech Lead, Cyberpunk, Hacker*) o ingresando cualquier URL de imagen.
- Consulta tus estadísticas personales: tareas completadas, commits realizados y tu **Score de Impacto Total**.
