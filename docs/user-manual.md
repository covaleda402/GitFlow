# 📖 User Manual - GitFlow v2.0

Welcome to the official user guide for **GitFlow** (RepoSync / GitPulse). This platform bridges the gap between agile sprint management and real-time GitHub commit telemetry.

---

## 1. Authentication & Sign In

1. Open your browser and navigate to the application (`http://localhost:5173` locally or your production Vercel URL).
2. Choose your preferred access method:
   - **Sign in with GitHub**: Authenticates with your real GitHub credentials, extracting your avatar, handle, and repositories.
   - **Enter in Demo Mode**: Instantly launches with preloaded profiles (*Edwin Esquivel, Maria Gomez, Alex Rivera*) for immediate evaluation without external keys.

---

## 2. Platform Navigation

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

> ⏱️ **5-Minute Rotation Security**:  
> Every room generates a dynamic security code that rotates every 5 minutes. The sidebar provides a countdown timer, progress bar, and 1-click copy button.

---

## 4. Agile Kanban Board & Task Privacy

* **Intelligent Privacy**:
  - **Members**: Focused personal view displaying only tasks assigned to or created by them.
  - **Room Owner**: Comprehensive team view with developer filter dropdown.
* **Task Lifecycle**:
  $$\text{To Do} \longrightarrow \text{In Progress} \longrightarrow \text{In Review} \longrightarrow \text{Done}$$
* **Autonomous Git Triggering**:
  - Pushing a commit containing `feat: login #3` advances task #3 to *In Progress*.
  - Pushing a commit containing `fixes #3` or `closes #3` marks task #3 as **Done** and automatically moves it to the **History Archive**.

---

## 5. Completed Tasks History

The **Completed History** section archives finished tasks. Each card displays:
- Task ID `#ID` and strikethrough title.
- Assignee developer and avatar.
- Exact completion timestamp (`Nov 13, 2026 · 02:45 PM`).
- Linked commits counter.

---

## 6. Document & Context Explorer (Folders & Zoom)

Under **Documents & Context**:
1. **Folder Categories**: Visual folders (*Architecture*, *Design & UX*, *Meetings & Notes*, *General Documentation*).
2. **File Formats**:
   - **Markdown (`.md`)**: Read documents or launch the **Live Collaborative Notion-style Editor** with real-time WebSocket presence.
   - **PDF (`.pdf`) and Word (`.docx`)**: Direct preview and download links.
   - **Images (`.img`)**: Thumbnails with a **Zoom Viewer** featuring zoom-in, zoom-out, and reset controls.
3. **Registering Files**: Click `+ New Document` to create notes or attach links to any folder.

---

## 7. Room AI Assistant (GitBot)

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

## 9. Developer Profile & Customization

Under **My Profile**:
- Customize your avatar using GitHub, curated presets (*Tech Lead, Cyberpunk, Hacker*), or custom image URLs.
- Track personal career metrics: completed tasks, synchronized commits, and Total Impact Score.
