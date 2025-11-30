use tauri_plugin_sql::{Migration, MigrationKind};

pub fn get_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                -- User settings table
                CREATE TABLE IF NOT EXISTS user_settings (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    name TEXT NOT NULL DEFAULT 'User',
                    avatar TEXT,
                    theme TEXT NOT NULL DEFAULT 'light',
                    sound_enabled INTEGER NOT NULL DEFAULT 1,
                    notifications_enabled INTEGER NOT NULL DEFAULT 1,
                    pomodoro_duration INTEGER NOT NULL DEFAULT 25,
                    short_break_duration INTEGER NOT NULL DEFAULT 5,
                    long_break_duration INTEGER NOT NULL DEFAULT 15,
                    auto_start_breaks INTEGER NOT NULL DEFAULT 0,
                    auto_start_pomodoros INTEGER NOT NULL DEFAULT 0,
                    long_break_interval INTEGER NOT NULL DEFAULT 4,
                    spotify_enabled INTEGER NOT NULL DEFAULT 0,
                    spotify_access_token TEXT,
                    spotify_refresh_token TEXT,
                    spotify_token_expiry TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                -- Insert default settings
                INSERT INTO user_settings (id, name) VALUES (1, 'User');

                -- Skills table
                CREATE TABLE IF NOT EXISTS skills (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    goal_hours INTEGER NOT NULL DEFAULT 10000,
                    current_minutes INTEGER NOT NULL DEFAULT 0,
                    color TEXT NOT NULL DEFAULT '#000000',
                    is_active INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                -- Tasks table
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    skill_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    status TEXT NOT NULL DEFAULT 'todo',
                    priority TEXT NOT NULL DEFAULT 'medium',
                    due_date TEXT,
                    estimated_pomodoros INTEGER NOT NULL DEFAULT 1,
                    pomodoro_sessions INTEGER NOT NULL DEFAULT 0,
                    total_minutes INTEGER NOT NULL DEFAULT 0,
                    order_index INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    completed_at TEXT,
                    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
                );

                -- Timer sessions table
                CREATE TABLE IF NOT EXISTS timer_sessions (
                    id TEXT PRIMARY KEY,
                    task_id TEXT NOT NULL,
                    skill_id TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    duration INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
                    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
                );

                -- Achievements table
                CREATE TABLE IF NOT EXISTS achievements (
                    id TEXT PRIMARY KEY,
                    type TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    icon TEXT NOT NULL,
                    unlocked_at TEXT,
                    progress INTEGER NOT NULL DEFAULT 0,
                    target INTEGER NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                -- Reflections table
                CREATE TABLE IF NOT EXISTS reflections (
                    id TEXT PRIMARY KEY,
                    date TEXT NOT NULL UNIQUE,
                    content TEXT NOT NULL,
                    mood TEXT,
                    total_minutes INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                );

                -- Reflection skills junction table
                CREATE TABLE IF NOT EXISTS reflection_skills (
                    reflection_id TEXT NOT NULL,
                    skill_id TEXT NOT NULL,
                    PRIMARY KEY (reflection_id, skill_id),
                    FOREIGN KEY (reflection_id) REFERENCES reflections (id) ON DELETE CASCADE,
                    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
                );

                -- Daily activity table for streak calculation
                CREATE TABLE IF NOT EXISTS daily_activities (
                    date TEXT PRIMARY KEY,
                    total_minutes INTEGER NOT NULL DEFAULT 0,
                    total_sessions INTEGER NOT NULL DEFAULT 0
                );

                -- Indexes for better performance
                CREATE INDEX IF NOT EXISTS idx_tasks_skill_id ON tasks(skill_id);
                CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
                CREATE INDEX IF NOT EXISTS idx_timer_sessions_skill_id ON timer_sessions(skill_id);
                CREATE INDEX IF NOT EXISTS idx_timer_sessions_task_id ON timer_sessions(task_id);
                CREATE INDEX IF NOT EXISTS idx_timer_sessions_created_at ON timer_sessions(created_at);
                CREATE INDEX IF NOT EXISTS idx_daily_activities_date ON daily_activities(date);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "insert_default_achievements",
            sql: "
                INSERT INTO achievements (id, type, name, description, icon, target) VALUES
                    ('ach_first_hour', 'first_hour', 'First Hour', 'Complete your first hour of focused work', 'Clock', 60),
                    ('ach_100_hours', 'first_100_hours', '100 Hours', 'Reach 100 hours of practice', 'Trophy', 6000),
                    ('ach_1000_hours', 'first_1000_hours', '1000 Hours', 'Reach 1000 hours of practice', 'Award', 60000),
                    ('ach_mastery', 'skill_mastery', 'Mastery Achieved', 'Complete 10,000 hours on a skill', 'Crown', 600000),
                    ('ach_streak_7', 'streak_7_days', '7 Day Streak', 'Practice for 7 consecutive days', 'Flame', 7),
                    ('ach_streak_30', 'streak_30_days', '30 Day Streak', 'Practice for 30 consecutive days', 'Star', 30),
                    ('ach_streak_100', 'streak_100_days', '100 Day Streak', 'Practice for 100 consecutive days', 'Zap', 100),
                    ('ach_streak_365', 'streak_365_days', 'Year of Growth', 'Practice for 365 consecutive days', 'Sparkles', 365),
                    ('ach_first_skill', 'first_skill', 'Journey Begins', 'Create your first skill', 'Target', 1),
                    ('ach_five_skills', 'five_skills', 'Polymath', 'Work on 5 different skills', 'Book', 5),
                    ('ach_ten_skills', 'ten_skills', 'Renaissance', 'Work on 10 different skills', 'Library', 10),
                    ('ach_night_owl', 'night_owl', 'Night Owl', 'Complete a session after midnight', 'Moon', 1),
                    ('ach_early_bird', 'early_bird', 'Early Bird', 'Complete a session before 6 AM', 'Sunrise', 1),
                    ('ach_focused', 'focused', 'Laser Focused', 'Complete 10 pomodoros in one day', 'Focus', 10),
                    ('ach_dedicated', 'dedicated', 'Dedicated', 'Complete 50 pomodoros in one week', 'Heart', 50);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_timer_session_columns",
            sql: "
                -- Add planned_duration and session_type columns to timer_sessions
                ALTER TABLE timer_sessions ADD COLUMN planned_duration INTEGER;
                ALTER TABLE timer_sessions ADD COLUMN session_type TEXT;
                
                -- Update existing rows with default values
                UPDATE timer_sessions SET planned_duration = duration WHERE planned_duration IS NULL;
                UPDATE timer_sessions SET session_type = 'pomodoro' WHERE session_type IS NULL;
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "make_task_id_nullable",
            sql: "
                -- Create new table with task_id nullable
                CREATE TABLE IF NOT EXISTS timer_sessions_new (
                    id TEXT PRIMARY KEY,
                    task_id TEXT,
                    skill_id TEXT NOT NULL,
                    start_time TEXT NOT NULL,
                    end_time TEXT,
                    duration INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0,
                    planned_duration INTEGER,
                    session_type TEXT,
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
                    FOREIGN KEY (skill_id) REFERENCES skills (id) ON DELETE CASCADE
                );
                
                -- Copy data from old table
                INSERT INTO timer_sessions_new 
                SELECT * FROM timer_sessions;
                
                -- Drop old table
                DROP TABLE timer_sessions;
                
                -- Rename new table
                ALTER TABLE timer_sessions_new RENAME TO timer_sessions;
                
                -- Recreate indexes
                CREATE INDEX IF NOT EXISTS idx_timer_sessions_skill_id ON timer_sessions(skill_id);
                CREATE INDEX IF NOT EXISTS idx_timer_sessions_task_id ON timer_sessions(task_id);
                CREATE INDEX IF NOT EXISTS idx_timer_sessions_created_at ON timer_sessions(created_at);
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_task_priority_duedate_estimated",
            sql: "
                -- These columns may already exist from initial migration
                -- SQLite doesn't have IF NOT EXISTS for ALTER TABLE, so we handle it differently
                -- by checking if column exists first via a no-op approach
                -- Just update defaults for existing rows that might have NULL values
                UPDATE tasks SET priority = 'medium' WHERE priority IS NULL;
                UPDATE tasks SET estimated_pomodoros = 1 WHERE estimated_pomodoros IS NULL;
            ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_user_settings_goal_columns",
            sql: "
                -- Add daily and weekly goal columns to user_settings
                ALTER TABLE user_settings ADD COLUMN daily_goal_minutes INTEGER NOT NULL DEFAULT 240;
                ALTER TABLE user_settings ADD COLUMN weekly_goal_minutes INTEGER NOT NULL DEFAULT 420;
                ALTER TABLE user_settings ADD COLUMN email TEXT;
            ",
            kind: MigrationKind::Up,
        },
    ]
}
