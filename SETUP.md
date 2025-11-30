# 10,000 Hours App - Setup Instructions

## Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **Rust** (latest stable)
   - Windows: Download from https://rustup.rs/
   - Run: `rustup-init.exe`
   - Verify: `rustc --version`

3. **Tauri Prerequisites** (Windows-specific)
   - Install Microsoft Visual Studio C++ Build Tools
   - Install WebView2 (usually pre-installed on Windows 10/11)
   - Full guide: https://tauri.app/v1/guides/getting-started/prerequisites

## Installation Steps

### 1. Install Node Dependencies

```powershell
cd "d:\SNK\Projects\PA"
npm install
```

This will install all frontend dependencies including:
- React, TypeScript, Vite
- Tailwind CSS, shadcn/ui components
- Zustand for state management
- React Router for navigation
- Recharts for graphs
- Tauri API bindings

### 2. Verify Rust Installation

```powershell
rustc --version
cargo --version
```

### 3. Build Tauri (First Time Setup)

```powershell
npm run tauri build
```

Note: The first build will take several minutes as Cargo downloads and compiles dependencies.

## Running the Application

### Development Mode (with Hot Reload)

```powershell
npm run tauri:dev
```

This will:
1. Start the Vite dev server (frontend)
2. Compile and launch the Tauri app
3. Enable hot module replacement for React components
4. Watch for Rust changes and recompile

The app window should open automatically. If you see errors, check the terminal output.

### Production Build

```powershell
npm run tauri:build
```

The compiled application will be in:
- `src-tauri/target/release/10k-hours-app.exe` (Windows)
- `src-tauri/target/release/bundle/` (installers)

## Project Structure

```
PA/
├── src/                          # React frontend
│   ├── components/
│   │   ├── layout/               # Sidebar, Header, Layout
│   │   ├── timer/                # FlipTimer, PomodoroTimer
│   │   └── ui/                   # shadcn/ui components
│   ├── pages/                    # Dashboard, Skills, Tasks, Profile, Journal, FocusMode
│   ├── store/                    # Zustand stores (skills, tasks, timer, user)
│   ├── types/                    # TypeScript interfaces
│   ├── lib/                      # Utilities (utils.ts)
│   ├── App.tsx                   # Main app with routing
│   ├── main.tsx                  # React entry point
│   └── index.css                 # Global styles
├── src-tauri/                    # Tauri backend (Rust)
│   ├── src/
│   │   ├── main.rs              # Main Tauri app
│   │   ├── lib.rs               # Library entry
│   │   └── database.rs          # SQLite schema and migrations
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
├── public/                       # Static assets
├── package.json                  # Node dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts               # Vite bundler config
├── tailwind.config.js           # Tailwind CSS config
└── index.html                   # HTML template
```

## Database

The app uses SQLite for local data storage. The database file is created automatically at first run:

**Location:** `%APPDATA%/com.10khours.app/app.db`

**Tables:**
- `user_settings` - User profile and preferences
- `skills` - Skill definitions and progress
- `tasks` - Tasks linked to skills
- `timer_sessions` - Pomodoro session history
- `achievements` - Achievement definitions and unlock status
- `reflections` - Daily journal entries
- `daily_activities` - Daily activity log for streaks

## Troubleshooting

### Error: "failed to run custom build command for tauri"

**Solution:** Ensure Rust and Visual Studio C++ Build Tools are installed correctly.

```powershell
rustup update
```

### Error: "Cannot find module 'react'"

**Solution:** Reinstall dependencies:

```powershell
rm -r node_modules
rm package-lock.json
npm install
```

### Error: WebView2 not found

**Solution:** Download and install WebView2 Runtime:
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

### Port 1420 already in use

**Solution:** Kill the process using the port:

```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 1420).OwningProcess | Stop-Process -Force
```

Or change the port in `vite.config.ts` and `tauri.conf.json`.

## Development Workflow

### 1. Start Development Server

```powershell
npm run tauri:dev
```

### 2. Make Changes

- Edit React components in `src/`
- Changes auto-reload in the app window
- Edit Rust code in `src-tauri/src/`
- Tauri recompiles automatically

### 3. Check Console

- Frontend logs: Browser DevTools (F12 in app window)
- Backend logs: Terminal running `tauri:dev`

### 4. Test Database

Open the SQLite database:

```powershell
# Install SQLite if needed
# Then open database
sqlite3 $env:APPDATA\com.10khours.app\app.db

# List tables
.tables

# Query skills
SELECT * FROM skills;
```

## Next Steps

### Implement Remaining Features

Current status:
- ✅ Project setup
- ✅ Database schema
- ✅ Basic UI layout
- ✅ Skills management
- ✅ Flip timer
- ✅ Pomodoro timer
- ⏳ Kanban board (Tasks page)
- ⏳ Profile with analytics
- ⏳ Achievements system
- ⏳ Reflection journal
- ⏳ Focus mode
- ⏳ Spotify integration

### Add Features

1. **Kanban Board:** Implement drag-drop with dnd-kit
2. **Calendar Heatmap:** Add consistency visualization
3. **Charts:** Skill progress graphs with Recharts
4. **Achievements:** Badge unlock animations
5. **Spotify:** OAuth flow and playback controls
6. **Journal:** Markdown editor with date navigation

## Resources

- **Tauri Docs:** https://tauri.app/
- **React:** https://react.dev/
- **Tailwind CSS:** https://tailwindcss.com/
- **shadcn/ui:** https://ui.shadcn.com/
- **Zustand:** https://github.com/pmndrs/zustand

## Support

For issues or questions:
1. Check the console/terminal for error messages
2. Review Tauri documentation
3. Check GitHub issues for similar problems

---

**Happy coding! Start your 10,000 hour journey! 🚀**
