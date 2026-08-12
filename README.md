# Pivot'e Flow

Build a production-grade, fully responsive SaaS web application named "Pivot'e" engineered for calm, high-impact goal execution with visual proof-of-work, cloud image storage, and background session tracking.

### 1. BRANDING & PURE-CODE SVG LOGO

- Inject this exact SVG code directly into the main navbar header and login/signup screens. The text must automatically adjust color between Light Mode (#1A1D20) and Dark Mode (#FFFFFF):

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 100" width="160" height="50">

  <g transform="translate(10, 10)">

    <path d="M 25 80 L 40 20" stroke="#3A1078" stroke-width="14" stroke-linecap="round"/>

    <path d="M 40 20 C 75 20, 80 60, 50 60" fill="none" stroke="#3A1078" stroke-width="14" stroke-linecap="round"/>

    <circle cx="50" cy="60" r="12" fill="#0B6640"/>

  </g>

  <text x="105" y="75" class="fill-slate-900 dark:fill-white" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="52" letter-spacing="-1">

    Pivot<tspan fill="#3A1078">'e</tspan>

  </text>

</svg>

- Footer on every page: "Engineered & Maintained by Amal Tomy © Pivot'e. All Rights Reserved."

### 2. iOS GLASSMORPHISM DESIGN SYSTEM & RESPONSIVENESS

- Must be 100% optimized for Android mobile browsers, iOS Safari, and Laptop displays without layout shift or horizontal overflow.

- Glassmorphism Styling:

  - Light Mode: Card Background `rgba(255, 255, 255, 0.75)`, Border `1px solid rgba(226, 232, 240, 0.8)`, Backdrop Filter `blur(12px)`, Canvas `#FFFFFF`, Containers `#F8F9FA`, Text `#1A1D20`.

  - Dark Mode: Card Background `rgba(15, 23, 42, 0.75)`, Border `1px solid rgba(51, 65, 85, 0.6)`, Backdrop Filter `blur(12px)`, Canvas `#020617`, Containers `#0F172A`, Text `#F8FAFC`.

- Accent Colors: Active buttons and interactive highlights use Regal Violet (#3A1078). Completed elements use Deep Emerald Green (#0B6640).

- Include a global Light/Dark mode toggle switch in the navbar that remembers user choice via local storage.

### 3. AUTHENTICATION & ROW LEVEL SECURITY (RLS)

- Connect to Supabase Auth.

- Unauthenticated users must be restricted to a glassy, high-converting Landing/Login/Signup view displaying the SVG logo and value proposition.

- Enforce strict Row Level Security (RLS) policies on all tables and storage buckets so users can ONLY access, edit, or view their own phases, tasks, usage logs, and images tied to their `auth.uid()`.

### 4. DATABASE & CLOUD STORAGE ARCHITECTURE

- Connect to the connected Supabase database and the private 'task_proofs' storage bucket.

- Table `pivote_phases`: `id` (uuid, primary key), `user_id` (uuid, references auth.users), `title` (text), `description` (text, optional), `created_at` (timestamp).

- Table `pivote_tasks`: `id` (uuid, primary key), `phase_id` (uuid, references pivote_phases), `user_id` (uuid), `title` (text), `is_completed` (boolean, default false), `proof_image_url` (text, nullable), `created_at` (timestamp).

- Table `pivote_usage_logs`: `id` (uuid, primary key), `user_id` (uuid), `session_date` (date), `minutes_spent` (integer default 0), `last_active` (timestamp).

- Background Usage Script: Increment `minutes_spent` by 1 for the logged-in user every 60 seconds of active window time.

### 5. INTERACTIVE COMPONENTS & PROOF-OF-WORK

- Circular Completion Dots: Replace checkboxes with custom round dots. Unchecked is a 24px circular ring with a thin border. Clicking toggles it to Deep Emerald (#0B6640) with a white checkmark icon and applies a strikethrough to the task text.

- Cloud Image Upload (Proof of Work):

  - Next to every task, provide a camera/upload icon.

  - Clicking opens the native file picker on mobile (Camera/Gallery) or laptop file explorer.

  - Upload the image directly to the private Supabase 'task_proofs' bucket without storing anything on local device storage.

  - On upload success, save the URL to `proof_image_url` and render a thumbnail badge. Clicking the thumbnail opens an iOS-style glassy image viewer modal to view the full screenshot.

### 6. NAVIGATION & USER FLOW

- Top Header: SVG Logo, Global Completion Percentage Bar (#0B6640), Light/Dark Toggle, and Sign Out button.

- Sidebar (Desktop) / Collapsible Drawer (Mobile): Lists the user's custom phases fetched from `pivote_phases`. Include a prominent Regal Violet (+ Add New Phase) button.

- Active Phase Dashboard: Displays phase title, task list with interactive dots and image uploads, an "Add Task" input field at the bottom, and "Previous Phase / Next Phase" navigation buttons.

- First-Time Empty State: If a new user logs in with no phases, display an inviting card saying "Create Your First Execution Phase to Begin".

Ensure clean state reactivity, optimistic UI updates, zero syntax errors, and smooth touch interactions across all devices.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pivote-saas.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bba141da-2610-4bbf-99a3-f550b7c57805).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
