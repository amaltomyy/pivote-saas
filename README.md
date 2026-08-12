## Pivot'e — Full-Stack Goal Execution SaaS

Pivot'e is a responsive, production-ready goal execution web application engineered for focused productivity. It features a custom glassmorphic UI design system, secure user authentication, real-time database management, background focus tracking, and cloud image storage for "Proof-of-Work" validation.

---

## 🎯 Developer Approach & Systems Mindset

This project marks my transition into full-stack software engineering. Rather than treating code as a black box, I approached the build systematically—analyzing each layer of the web stack step-by-step to understand how modern applications are architected, secured, and deployed.

Using **AI-assisted engineering (VIBE CODING) alongside deep systems analysis**, I controlled the project lifecycle by breaking down requirements stage-by-stage:

* **Stage 1: Interface & Systems Design** — Deconstructing responsive layout structures, CSS glassmorphism, dynamic theme toggling, and component-driven state.
* **Stage 2: Identity & Security** — Analyzing session management and implementing Supabase Auth to isolate user environments.
* **Stage 3: Relational Database Architecture** — Designing structured PostgreSQL tables and writing strict **Row Level Security (RLS)** policies to enforce data privacy at the database level.
* **Stage 4: Cloud Storage Pipelines** — Configuring direct-to-bucket file uploads for task validation photos without exposing local server storage.
* **Stage 5: Deployment & Lifecycle Operations** — Setting up version control via GitHub and continuous deployment (CI/CD) automation through Vercel.

By leveraging advanced prompt engineering and architectural analysis, I focused on mastering **how** the frontend, backend database, security policies, and cloud hosting continuously interact.

---

## 🛠 System Architecture

**Frontend Frame:** React / Vite / Tailwind UI (Glassmorphic Design & State)

⬇

**Backend:** Supabase (Auth Service, PostgreSQL DB, RLS Engine, Cloud Storage)

⬇

**Deployment:** GitHub ➔ Vercel (Automated Production Builds)

---

## 📋 Stage-by-Stage Implementation Details

### 1. Frontend UI & UX Architecture

* **Glassmorphism Design System:** Built with dynamic backdrop filters, translucent layers, and custom color accents (Regal Violet `#3A1078` and Deep Emerald `#0B6640`).
* **Responsive State Management:** Multi-column layout optimized across mobile, tablet, and desktop viewports with zero layout shift.
* **Persistent Preferences:** Dark/Light mode theme state persisted across browser sessions via local storage.

### 2. Authentication & Data Security

* **Session Persistence:** Powered by Supabase Auth with token-based authorization.
* **Multi-Tenant Data Isolation (RLS):** Every PostgreSQL table (`pivote_phases`, `pivote_tasks`, `pivote_usage_logs`) is protected by database-level Row Level Security policies strictly scoping read/write permissions to `auth.uid() = user_id`.

### 3. Database Schema & Real-Time Tracking

* **Relational Schema:** Designed parent-child table relationships connecting execution phases to nested daily tasks.
* **Background Usage Automation:** Script monitoring active window state to increment daily usage minutes in `pivote_usage_logs` every 60 seconds.

### 4. Cloud Storage Integration

* **Proof-of-Work Pipeline:** Camera and photo uploads stream directly into the private `task_proofs` Supabase bucket, saving unique public URLs to the database task row for modal previewing.

---

## 💻 Tech Stack Summary

| Layer | Technology |
| --- | --- |
| **Frontend Frame** | React, Vite, TypeScript |
| **Styling & UI** | Tailwind CSS, shadcn/ui, Lucide Icons |
| **Backend & Auth** | Supabase Auth |
| **Database** | Supabase PostgreSQL |
| **Cloud Storage** | Supabase Storage Buckets |
| **Hosting & CI/CD** | Vercel & GitHub |

---

## 🔒 Security & Best Practices

1. **Environment Isolation:** Secrets like API keys and database URLs are injected strictly via build-time environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
2. **Database Hardening:** Unauthenticated access to database rows or storage buckets is completely blocked by default.
3. **Encrypted Credentials:** Passwords and tokens are fully managed by Supabase; no sensitive auth data is accessible by the application codebase.

---

## 🚀 Live Demo & Repository Links

* **Live Application:** [https://pivote-saas.vercel.app](https://pivote-saas.vercel.app)

* **GitHub Repository:** [https://github.com/amaltomyy/pivote-saas](https://www.google.com/search?q=https://github.com/amaltomyy/pivote-saas)

---

*Engineered, Architected, and Maintained by Amal Tomy.*
