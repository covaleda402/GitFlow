# 📖 User Manual - GitFlow v2.0

Welcome to the official user guide for **GitFlow** (RepoSync / GitPulse). This platform bridges the gap between agile sprint management and real-time GitHub commit telemetry.

---

## 1. Authentication & Multi-User Sign In

1. Open your browser and navigate to the application (`http://localhost:5173` locally or your production Vercel URL).
2. Choose your preferred access method:
   - **Sign in with GitHub OAuth**: Authenticates with your real GitHub credentials, extracting your avatar, handle, and repositories.
   - **Instant Developer Access**:
     - **GitFlow Team Tab**: Direct profile selector for teammates (*Jose Esneider Covaleda, Edwin Esquivel, Maria Gomez, Alex Rivera*), enabling each collaborator to enter with their own identity and avatar.
     - **Custom Account Tab**: Allows typing any custom developer handle (e.g. `covaleda402`, `your-name`) and full display name to enter with a dedicated session and prepared SQL record.

---

## 2. Platform Navigation & Dark/Light Theme Switching

* **Theme Switcher (Sun / Moon)**:
  - Accessible from the Left Sidebar (Desktop) and Mobile Top Bar.
  - Toggles seamlessly between **Tech Dark Theme** and **High-Contrast Light Theme**, ensuring crisp typography, clear borders, and optimal readability without forced viewports or screen flicker.
* **Desktop Layout (Left Sidebar)**:
  - Fixed vertical navigation docked on the left.
  - Room switcher, room creation and joining buttons, dynamic 5-minute code widget, and Dark/Light theme toggle.
  - Direct links to *Agile Board, Documents & Context, Completed History, Telemetry & Rollback, Room Analytics, and My Profile*.
* **Mobile Layout (TikTok-Style Bottom Nav)**:
  - Bottom touch navigation bar with 5 ergonomic icons: *Board, Documents, Center Push (+), History, and Profile*.
  - Top header bar with quick room switching and theme selector.

---

## 3. Workspaces & Dynamic 5-Minute Room Codes

### 3.1 Creating a Room
1. In the sidebar or top bar, click **`+ New`**.
2. Enter room name, description, and target GitHub repository.
3. Click **Create Room**. You will automatically be assigned as **Owner / Administrator**.

### 3.2 Joining a Room
1. Click the **`Join`** or **`Code`** button.
2. Enter the 6-character code provided by the room creator (e.g. `7A9F1B`).
3. Click **Enter Room**. You will join as a **Member**.

### 3.3 Suspending or Deleting a Room (History Preservation)
If you are the room owner/administrator:
1. At the top of the project view, you will find room administration actions: **"Suspender Sala"** (Suspend) and **"Eliminar Definitiva"** (Permanent Delete).
2. **Suspend**: Pauses ongoing activity, preventing new task creation while displaying a warning badge.
3. **Delete**: Soft-deletes the room from active listings without data destruction.
4. **Guaranteed History Preservation**: **Your completed tasks will never be deleted**. In **My Profile (`/profile`)**, every task you completed in deleted or suspended rooms remains permanently preserved in your personal history, displaying the badge `"Sala eliminada"` or `"Sala suspendida"` below its title.

> ⏱️ **5-Minute Rotation Security**:  
> Every room generates a dynamic security code that rotates every 5 minutes. The sidebar provides a countdown timer, progress bar, and 1-click copy button.

---

## 4. Agile Kanban Board, Step-by-Step Instructions & Task Privacy

* **Intelligent Privacy & View Scope**:
  - **Members**: Focused personal view displaying only tasks assigned to or created by them.
  - **Room Owner**: Comprehensive team supervision with a quick toggle between *All Team* and *My Tasks*, plus a developer filter dropdown.
* **Step-by-Step Technical Instructions**:
  - Each task card includes a collapsible **`Steps & Instructions`** section.
  - Review documented implementation instructions or click **`✏️ Edit steps`** to refine technical criteria on the fly.
* **Task Lifecycle**:
  $$\text{To Do} \longrightarrow \text{In Progress} \longrightarrow \text{In Review} \longrightarrow \text{Pre-Review QA} \longrightarrow \text{Done}$$
* **Autonomous Git Triggering**:
  - Pushing a commit containing `feat: login #3` advances task #3 to *In Progress*.
  - Pushing a commit containing `fixes #3` or `closes #3` marks task #3 as **Done** and automatically moves it to the **History Archive**.

---

## 5. Quality Control & Pre-Review (QA Gate)

Before tasks are permanently closed, the **Pre-Review (QA)** section provides strict verification:

1. **Interactive Quality Checklist**:
   - ✅ *Clean compilation & testing with zero errors*.
   - ✅ *Step-by-step instructions fulfilled accurately*.
   - ✅ *Clean code without leaks or secrets*.
   - ✅ *Responsive mobile and aesthetic layout verified*.
2. **Review Notes & QA Decision**:
   - **Approve and Finalize (DONE)**: Archives the task to history accompanied by verified QA notes.
   - **Request Changes (Reject)**: Returns the task to `IN_PROGRESS` with specific actionable feedback.

---

## 6. Completed Tasks History & Detailed Audit

The **Completed History** section archives finished tasks. Each card displays:
- Task ID `#ID` and title.
- Assignee developer and avatar.
- Exact completion timestamp (`Nov 13, 2026 · 02:45 PM`).
- Linked commits counter.
- **"View completion notes and fulfilled steps"** accordion: Expandable technical record detailing how the task was completed.

---

## 7. Commit Health & Resilient Rollback Engine

Located under **Telemetry and Resilient Backup**:
- Continuously tracks the integrity of incoming GitHub commits.
- If a push causes an issue or regression, click **`Restore to Last Backup`** to roll back project tasks to the last verified healthy state with **1 single click**.

---

## 8. Document & Context Explorer (Folders, Zoom & Live Editor)

Under **Documents & Context**:
1. **Folder Categories**: Visual folders (*Architecture*, *Design & UX*, *Meetings & Notes*, *General Documentation*).
2. **File Formats**:
   - **Markdown (`.md`)**: Read documents or launch the **Live Collaborative Editor** with high-contrast rendering in both **Light and Dark themes**, blockquotes, and real-time WebSocket sync.
   - **PDF (`.pdf`) and Word (`.docx`)**: Direct preview and download links.
   - **Images (`.img`)**: Thumbnails with a **Zoom Viewer** featuring zoom-in, zoom-out, and reset controls.
3. **Registering Files**: Click `+ New Document` to create notes or attach links to any folder.

---

## 9. Room AI Assistant (GitBot)

Click the floating **GitBot AI** button at the bottom-right:
- Ask questions in natural language:
  - *"What is this room about?"*
  - *"What tasks are pending?"*
  - *"What has @edwin-esquivel done?"*
  - *"What files are in the folders?"*
- GitBot reads the live room state and provides formatted structured reports.

---

## 8. Commit Telemetry & Rollback Checkpoint Engine

In the **Telemetry** section:
- Stream of live incoming commits with author avatars and hash badges.
- **Rollback Engine**: If a commit causes regressions, click **"Restore to Last Stable Checkpoint"** to revert tasks and room state to the verified stable commit.
- In local mode, click **"Simulate Git Push"** to test commit telemetry in one click.

---

## 10. Developer Profile & Cloudinary CDN Uploads

Under **My Profile**:
- **Direct Cloudinary CDN Upload**: Use the **"Elegir Archivo Local"** button to upload local image files (PNG, JPG, WEBP up to 8MB) directly to Cloudinary media storage.
- **Avatar Selector**: Switch between your GitHub profile photo, themed presets (*Tech Lead, Cyberpunk, Hacker*), or custom image URLs.
- **Developer Details**: Edit your display name and technical bio in real time.
- **Career Metrics**: Track personal metrics: completed tasks, synchronized commits, and Total Impact Score.
