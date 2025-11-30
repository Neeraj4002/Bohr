# Quick Start Guide

## Get Started in 3 Steps

### 1. Install Dependencies

```powershell
npm install
```

### 2. Run Development Mode

```powershell
npm run tauri:dev
```

The app will open automatically with hot reload enabled!

### 3. Create Your First Skill

1. Click "Skills" in the sidebar
2. Click "New Skill" button
3. Enter skill name (e.g., "Learn Python")
4. Set goal hours (default 10,000)
5. Pick a color
6. Click "Create Skill"
7. Click the skill card to make it active
8. Return to Dashboard to see the flip timer counting down!

## What You Can Do Now

- ✅ **Dashboard:** View your flip timer and stats
- ✅ **Skills:** Create, edit, delete, and activate skills
- ✅ **Timer:** Pomodoro timer system (partial - needs task integration)
- ⏳ **Tasks:** Kanban board (coming soon)
- ⏳ **Profile:** Analytics and achievements (coming soon)
- ⏳ **Journal:** Daily reflections (coming soon)
- ⏳ **Focus Mode:** Fullscreen timer (coming soon)

## Key Features Implemented

### Core Functionality
- SQLite database with auto-migration
- Full CRUD operations for skills
- Active skill tracking
- Flip timer countdown
- Pomodoro timer (25/5/15 min intervals)
- Streak calculation
- Settings management

### UI Components
- Minimal black/white Notion-style theme
- Responsive layout with sidebar navigation
- Dashboard with stats overview
- Skills management page
- Timer components
- Toast notifications

### State Management
- Zustand stores for skills, tasks, timer, and user
- Real-time updates across components
- Persistent SQLite storage

## What's Next?

See `SETUP.md` for detailed documentation and troubleshooting.

The remaining features (Kanban, Profile analytics, Achievements, Journal, Focus mode, Spotify) have placeholder pages ready for implementation.

---

**Start tracking your 10,000 hours today! 🎯**
