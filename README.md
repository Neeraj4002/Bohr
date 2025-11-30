# 10,000 Hours - Productivity Desktop App

A minimal Notion-style productivity desktop app built with Tauri that helps you master skills through deliberate practice tracking.

## Features

- **10,000 Hour Flip Timer** - Visual countdown to mastery for each skill
- **Pomodoro Task Timer** - Focus sessions that accumulate toward skill goals
- **Kanban Boards** - Organize tasks and projects
- **Skill Learning Graphs** - Visualize your progress over time
- **Consistency Calendar** - Track your daily practice streaks
- **Focus Mode** - Distraction-free fullscreen timer
- **Achievements & Badges** - Celebrate milestones
- **Spotify Integration** - Control your focus music
- **Daily Reflection Journal** - Document your learning journey

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Desktop:** Tauri 2.0 (Rust)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand
- **Database:** SQLite (tauri-plugin-sql)
- **Charts:** Recharts
- **Timer:** react-flip-clock-countdown

## Getting Started

### Prerequisites

- Node.js 18+
- Rust (latest stable)
- System dependencies for Tauri (see [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites))

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Development

```bash
# Frontend only (web mode)
npm run dev

# Tauri app with hot reload
npm run tauri:dev
```

## Project Structure

```
PA/
├── src/                      # React frontend
│   ├── components/          # UI components
│   ├── pages/              # Route pages
│   ├── store/              # Zustand stores
│   ├── types/              # TypeScript definitions
│   ├── utils/              # Utilities
│   └── lib/                # shadcn/ui components
├── src-tauri/              # Tauri backend (Rust)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands.rs     # Tauri commands
│   │   └── database.rs     # SQLite operations
│   └── Cargo.toml
└── public/                 # Static assets
```

## License

MIT
