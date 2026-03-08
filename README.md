
# VoltC - Real-Time C Compiler IDE

> OpenPool Doppelganger Hackathon submission by **CodingKarma**

`VoltC` is a web IDE focused on rapid C prototyping for embedded-style workflows. It compiles C into a custom ISA, runs it on a custom VM, and visualizes execution/memory state with a debugger-first UI.

## Team

- Team Name: **CodingKarma**
- Built by:
  - **Parth** - [@PARTH-JADAV20](https://github.com/PARTH-JADAV20)
  - **Aashish** - [@Aashish-gif](https://github.com/Aashish-gif)

## Hackathon Problem Mapping

From the provided challenge statement (`temp.txt`), this project addresses:

- Real-time C editing and feedback with syntax validation in Monaco.
- Compilation to a simplified custom ISA.
- Program execution and output display in-browser via backend APIs.
- Memory/debug visualization including stack/register behavior across trace steps.
- Fibonacci-style recursive execution support with trace-based debugging.
- Additional productivity features beyond baseline:
  - GitHub OAuth integration.
  - Fetch/import `.c` files from repositories.
  - Push new/updated `.c` files back to GitHub.
  - Create repositories directly from the IDE.

## Core Features

### IDE Experience

- Monaco C editor with dark/light theme support.
- Per-file editor models for smooth file switching.
- Real-time syntax checks with inline error markers.
- One-click and hotkey formatting (`Shift+Alt+F`) plus top-right format button.
- Auto-save (debounced) with unsaved-change indicators.
- File explorer with:
  - Create file/folder
  - Delete file/folder
  - Download file
  - Folder tree and sorting

### Compiler + Runtime

- Backend C compiler (`backend/src/compiler.c`) that tokenizes/parses C and emits custom ISA assembly.
- VM runtime (`backend/src/vm.c`) that executes custom ISA instructions.
- Compile endpoint returning assembly and compile metadata.
- Run endpoint returning program output, execution time, exit code, and final VM state.

### Debugging + Memory Visualization

- Debug endpoint executes VM in trace mode (`--debug`).
- Trace enrichment in backend maps PC/function/variables/call stack.
- Frontend memory panel shows:
  - Instruction timeline
  - Register values
  - Stack/BP/SP visuals
  - Variable table
  - Step-by-step navigation (next/prev/jump)

### GitHub Integration (OAuth + Repo Ops)

- OAuth login from IDE through backend.
- Session-based token management (in-memory on server, session id on client).
- Fetch user repositories.
- Browse/import `.c` files from selected repository.
- Push updates or create new files in repository.
- Create new repository from IDE dialog.

## Tech Stack

### Frontend

- **Vite 6** + **React 18** + TypeScript
- **Monaco Editor** (`@monaco-editor/react`)
- **Tailwind CSS 4**
- **Radix UI** primitives (shadcn-style component layer)
- **motion/framer-motion** for UI animation
- **next-themes** for theme switching
- **zustand** for GitHub session/file tracking state
- **sonner** for toasts

### Backend

- **Node.js + Express 5**
- **axios** for GitHub API calls
- **gcc-compiled C binaries** for compiler + VM
- **dotenv** for environment config

### Tooling

- Frontend build/dev: `vite`
- Backend build: `gcc src/compiler.c -o compiler && gcc src/vm.c -o vm`

## System Architecture

```mermaid
flowchart LR
  U[User in Browser] --> FE[React + Monaco IDE]
  FE -->|POST /compile| BE[Express Backend]
  FE -->|POST /run| BE
  FE -->|POST /debug| BE
  FE -->|GitHub actions| BE

  BE --> C1[Custom C Compiler Binary]
  C1 --> ASM[temp.asm]
  BE --> VM[Custom VM Binary]
  VM --> TRACE[Trace + Final State]

  BE --> GH[GitHub REST API]
  GH --> BE

  classDef user fill:#fff3bf,stroke:#f59f00,color:#7a4e00,stroke-width:2px;
  classDef front fill:#e7f5ff,stroke:#1c7ed6,color:#0b3d6e,stroke-width:2px;
  classDef back fill:#e6fcf5,stroke:#099268,color:#064e3b,stroke-width:2px;
  classDef core fill:#f3f0ff,stroke:#7048e8,color:#3b2f7f,stroke-width:2px;
  classDef ext fill:#fff5f5,stroke:#e03131,color:#7f1d1d,stroke-width:2px;

  class U user;
  class FE front;
  class BE back;
  class C1,VM,ASM,TRACE core;
  class GH ext;
```

## IDE Wireframe (Logical)

```mermaid
flowchart TB
  N[Navbar<br/>Compile Run Debug GitHub Theme]:::nav
  S[Sidebar<br/>Tree Create Delete Download]:::side
  E[Editor Panel<br/>Monaco C + Format + Syntax Markers]:::edit
  O[Output Panel Tabs<br/>Output / Assembly / Memory]:::out
  B[Status Bar<br/>Compile state Cursor GitHub status]:::status

  N --> C[Main Workspace]:::canvas
  C --> S
  C --> E
  C --> O
  C --> B

  classDef nav fill:#ffe8cc,stroke:#f76707,color:#7c2d12,stroke-width:2px;
  classDef side fill:#e3fafc,stroke:#1098ad,color:#0c4a6e,stroke-width:2px;
  classDef edit fill:#edf2ff,stroke:#4263eb,color:#1e3a8a,stroke-width:2px;
  classDef out fill:#f8f0fc,stroke:#9c36b5,color:#581c87,stroke-width:2px;
  classDef status fill:#ebfbee,stroke:#2b8a3e,color:#14532d,stroke-width:2px;
  classDef canvas fill:#f1f3f5,stroke:#868e96,color:#343a40,stroke-width:1px;
```

## User Flow

```mermaid
flowchart LR
  A[Open IDE] --> B[Create or Select .c File]
  B --> C[Write/Edit Code]
  C --> D[Format + Syntax Feedback]
  D --> E[Compile]
  E --> F{Compile Success?}
  F -- No --> G[Show Compiler Error in Output]
  F -- Yes --> H[View Assembly]
  H --> I[Run Program]
  H --> J[Start Debug]
  I --> K[See Output + Final State]
  J --> L[Step Trace + Memory View]

  C --> M[Optional: Connect GitHub]
  M --> N[Select Repo / Import Files]
  N --> C
  C --> P[Push New or Updated File]

  style A fill:#fff9db,stroke:#f08c00,stroke-width:2px
  style E fill:#e7f5ff,stroke:#1c7ed6,stroke-width:2px
  style I fill:#e6fcf5,stroke:#099268,stroke-width:2px
  style J fill:#f8f0fc,stroke:#9c36b5,stroke-width:2px
  style M fill:#fff5f5,stroke:#e03131,stroke-width:2px
```

## Compile / Run / Debug Execution Flow

```mermaid
sequenceDiagram
  participant UI as React IDE
  participant API as Express API
  participant CC as compiler.c binary
  participant VM as vm.c binary

  UI->>API: POST /compile (code)
  API->>CC: compile temp.c -> temp.asm + debug metadata
  CC-->>API: asm output / errors
  API-->>UI: success + assembly + stats

  UI->>API: POST /run
  API->>VM: execute temp.asm
  VM-->>API: stdout + FINAL_STATE
  API-->>UI: output + finalState + execTime

  UI->>API: POST /debug
  API->>VM: execute temp.asm --debug
  VM-->>API: JSON trace
  API->>API: enrichTrace(trace, debugInfo, asm)
  API-->>UI: enriched trace
```

## GitHub OAuth + Repo Flow

```mermaid
sequenceDiagram
  participant User
  participant FE as Frontend
  participant BE as Backend
  participant GH as GitHub OAuth/API

  User->>FE: Click Connect GitHub
  FE->>BE: GET /auth/github
  BE->>GH: Redirect to OAuth authorize
  GH-->>BE: callback with code
  BE->>GH: exchange code for access token
  GH-->>BE: access token + user
  BE->>BE: create session_id (in-memory map)
  BE-->>FE: redirect FRONTEND_URL?session_id&username
  FE->>FE: hydrate zustand + localStorage

  FE->>BE: GET /github/repos (x-session-id)
  FE->>BE: GET /github/repo-files (x-session-id)
  FE->>BE: GET /github/file-content (x-session-id)
  FE->>BE: PUT /github/push (x-session-id)
  FE->>BE: POST /github/create-repo (x-session-id)
```

## Backend API Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/compile` | `POST` | Compile C code into custom ISA assembly |
| `/run` | `POST` | Execute latest compiled assembly in VM |
| `/debug` | `POST` | Run VM in debug mode and return trace |
| `/auth/github` | `GET` | Start GitHub OAuth flow |
| `/auth/github/callback` | `GET` | OAuth callback, creates `session_id` |
| `/github/repos` | `GET` | Fetch user repositories |
| `/github/repo-files` | `GET` | Fetch `.c` files from selected repo |
| `/github/file-content` | `GET` | Fetch a file's content + SHA |
| `/github/push` | `PUT` | Create/update file in GitHub repo |
| `/github/create-repo` | `POST` | Create new repository |

## Project Structure (High-Level)

```text
Doppelganger/
  src/
    app/
      pages/IDE.tsx
      components/ (Navbar, Sidebar, Editor, OutputPanel, MemoryPanel, GitHub dialogs)
      utils/ (api.ts, c-formatter.ts, c-syntax-checker.ts)
    store/githubStore.ts
  backend/
    server.js
    src/compiler.c
    src/vm.c
  public/
    favicon + manifest assets
```

## Local Setup

### 1. Frontend

```bash
npm install
npm run dev
```

### 2. Backend

```bash
cd backend
npm install
npm run build
npm start
```

## Environment Variables

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:3001
```

### Backend (`backend/.env`)

```env
PORT=3001
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK=http://localhost:3001/auth/github/callback
FRONTEND_URL=http://localhost:5173
```

## GitHub OAuth Setup

1. Create OAuth app at `https://github.com/settings/developers`.
2. For local:
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:3001/auth/github/callback`
3. For production:
   - Homepage URL: your frontend domain (Vercel)
   - Authorization callback URL: your backend domain + `/auth/github/callback` (Render)

---

Made with love by **CodingKarma**. Thank you for checking out our OpenPool Doppelganger hackathon project.