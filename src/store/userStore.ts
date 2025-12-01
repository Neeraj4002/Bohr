import { create } from 'zustand';
import { db } from '@/lib/database';
import { UserProfile, UserSettings, UpdateUserSettingsInput } from '@/types';

interface UserState {
  profile: UserProfile | null;
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
  
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateSettings: (input: UpdateUserSettingsInput) => Promise<void>;
  fetchStats: () => Promise<void>;
  exportData: () => Promise<string>;
  importData: (data: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  settings: null,
  loading: false,
  error: null,

  fetchProfile: async () => {
    set({ loading: true, error: null });
    try {
      const settingsResult = await db.select<any>('SELECT * FROM user_settings LIMIT 1');
      
      // Calculate stats from skills and daily_activities
      const skillsResult = await db.select<any>(
        'SELECT SUM(current_minutes) as total FROM skills'
      );
      const totalMinutes = skillsResult[0]?.total || 0;

      // Calculate current streak
      const streakResult = await db.select<any>(`
        WITH RECURSIVE streak_days AS (
          SELECT date('now') as check_date, 0 as days
          UNION ALL
          SELECT date(check_date, '-1 day'), days + 1
          FROM streak_days
          WHERE days < 365 
            AND EXISTS (
              SELECT 1 FROM daily_activities 
              WHERE date = date(streak_days.check_date, '-1 day')
                AND total_minutes > 0
            )
        )
        SELECT MAX(days) as streak FROM streak_days
        WHERE EXISTS (SELECT 1 FROM daily_activities WHERE date = check_date AND total_minutes > 0)
           OR check_date = date('now')
      `);
      
      // Check if user practiced today
      const todayResult = await db.select<any>(
        `SELECT 1 FROM daily_activities WHERE date = date('now') AND total_minutes > 0`
      );
      const practicedToday = todayResult.length > 0;
      
      let currentStreak = streakResult[0]?.streak || 0;
      if (!practicedToday && currentStreak > 0) {
        currentStreak = Math.max(0, currentStreak - 1);
      }

      // Calculate longest streak
      const longestResult = await db.select<any>(`
        WITH dates AS (
          SELECT date, 
                 date(date, '-' || ROW_NUMBER() OVER (ORDER BY date) || ' days') as grp
          FROM daily_activities 
          WHERE total_minutes > 0
        )
        SELECT COUNT(*) as streak
        FROM dates
        GROUP BY grp
        ORDER BY streak DESC
        LIMIT 1
      `);
      const longestStreak = longestResult[0]?.streak || 0;

      if (settingsResult.length > 0) {
        const s = settingsResult[0];
        
        // Parse settings
        const settings: UserSettings = {
          pomodoroMinutes: s.pomodoro_duration || 25,
          shortBreakMinutes: s.short_break_duration || 5,
          longBreakMinutes: s.long_break_duration || 15,
          dailyGoalHours: (s.daily_goal_minutes || 240) / 60,
          weeklyGoalHours: (s.weekly_goal_minutes || 420) / 60,
          soundEnabled: Boolean(s.sound_enabled ?? true),
          notificationsEnabled: Boolean(s.notifications_enabled ?? true),
          autoStartBreaks: Boolean(s.auto_start_breaks),
          autoStartPomodoros: Boolean(s.auto_start_pomodoros),
          longBreakInterval: s.long_break_interval || 4,
          theme: s.theme || 'system',
        };
        
        const profile: UserProfile = {
          id: '1',
          name: s.name,
          email: s.email,
          avatar: s.avatar,
          totalHours: Math.floor(totalMinutes / 60),
          totalMinutes: totalMinutes,
          currentStreak: currentStreak,
          longestStreak: Math.max(longestStreak, currentStreak),
          dailyGoalMinutes: s.daily_goal_minutes || 240,
          weeklyGoalMinutes: s.weekly_goal_minutes || 420,
          dailyGoalHours: (s.daily_goal_minutes || 240) / 60,
          weeklyGoalHours: (s.weekly_goal_minutes || 420) / 60,
          createdAt: s.created_at,
          settings: {
            theme: s.theme,
            soundEnabled: Boolean(s.sound_enabled),
            notificationsEnabled: Boolean(s.notifications_enabled),
            pomodoroDuration: s.pomodoro_duration,
            shortBreakDuration: s.short_break_duration,
            longBreakDuration: s.long_break_duration,
            autoStartBreaks: Boolean(s.auto_start_breaks),
            autoStartPomodoros: Boolean(s.auto_start_pomodoros),
            longBreakInterval: s.long_break_interval,
            spotifyEnabled: Boolean(s.spotify_enabled),
            spotifyAccessToken: s.spotify_access_token,
            spotifyRefreshToken: s.spotify_refresh_token,
            spotifyTokenExpiry: s.spotify_token_expiry,
          },
        };

        set({ profile, settings, loading: false });
      } else {
        // This should not happen as migration inserts default settings
        // But just in case, use INSERT OR REPLACE
        await db.execute(
          `INSERT OR REPLACE INTO user_settings (id, name, pomodoro_duration, short_break_duration, long_break_duration, daily_goal_minutes, weekly_goal_minutes, sound_enabled, notifications_enabled)
           VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8)`,
          ['User', 25, 5, 15, 240, 420, 1, 1]
        );
        await get().fetchProfile();
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      set({ error: String(error), loading: false });
    }
  },
  
  updateSettings: async (input) => {
    try {
      const updateParts: string[] = [];
      const values: any[] = [];
      
      if (input.pomodoroMinutes !== undefined) {
        updateParts.push('pomodoro_duration = $' + (values.length + 1));
        values.push(input.pomodoroMinutes);
      }
      if (input.shortBreakMinutes !== undefined) {
        updateParts.push('short_break_duration = $' + (values.length + 1));
        values.push(input.shortBreakMinutes);
      }
      if (input.longBreakMinutes !== undefined) {
        updateParts.push('long_break_duration = $' + (values.length + 1));
        values.push(input.longBreakMinutes);
      }
      if (input.dailyGoalHours !== undefined) {
        updateParts.push('daily_goal_minutes = $' + (values.length + 1));
        values.push(input.dailyGoalHours * 60);
      }
      if (input.weeklyGoalHours !== undefined) {
        updateParts.push('weekly_goal_minutes = $' + (values.length + 1));
        values.push(input.weeklyGoalHours * 60);
      }
      if (input.soundEnabled !== undefined) {
        updateParts.push('sound_enabled = $' + (values.length + 1));
        values.push(input.soundEnabled ? 1 : 0);
      }
      if (input.notificationsEnabled !== undefined) {
        updateParts.push('notifications_enabled = $' + (values.length + 1));
        values.push(input.notificationsEnabled ? 1 : 0);
      }
      if (input.autoStartBreaks !== undefined) {
        updateParts.push('auto_start_breaks = $' + (values.length + 1));
        values.push(input.autoStartBreaks ? 1 : 0);
      }
      
      if (updateParts.length > 0) {
        updateParts.push("updated_at = datetime('now')");
        await db.execute(
          `UPDATE user_settings SET ${updateParts.join(', ')}`,
          values
        );
      }
      
      await get().fetchProfile();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateProfile: async (updates) => {
    try {
      const updateParts: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        updateParts.push('name = $' + (values.length + 1));
        values.push(updates.name);
      }
      if (updates.avatar !== undefined) {
        updateParts.push('avatar = $' + (values.length + 1));
        values.push(updates.avatar);
      }
      if (updates.dailyGoalMinutes !== undefined) {
        updateParts.push('daily_goal_minutes = $' + (values.length + 1));
        values.push(updates.dailyGoalMinutes);
      }
      if (updates.weeklyGoalMinutes !== undefined) {
        updateParts.push('weekly_goal_minutes = $' + (values.length + 1));
        values.push(updates.weeklyGoalMinutes);
      }
      if (updates.settings) {
        const s = updates.settings;
        if (s.theme !== undefined) {
          updateParts.push('theme = $' + (values.length + 1));
          values.push(s.theme);
        }
        if (s.soundEnabled !== undefined) {
          updateParts.push('sound_enabled = $' + (values.length + 1));
          values.push(s.soundEnabled ? 1 : 0);
        }
        if (s.notificationsEnabled !== undefined) {
          updateParts.push('notifications_enabled = $' + (values.length + 1));
          values.push(s.notificationsEnabled ? 1 : 0);
        }
      }

      if (updateParts.length > 0) {
        updateParts.push("updated_at = datetime('now')");
        await db.execute(
          `UPDATE user_settings SET ${updateParts.join(', ')}`,
          values
        );
      }
      
      await get().fetchProfile();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  fetchStats: async () => {
    await get().fetchProfile();
  },

  exportData: async () => {
    try {
      const skills = await db.select<any>('SELECT * FROM skills');
      const tasks = await db.select<any>('SELECT * FROM tasks');
      const sessions = await db.select<any>('SELECT * FROM timer_sessions');
      const activities = await db.select<any>('SELECT * FROM daily_activities');
      const reflections = await db.select<any>('SELECT * FROM reflections');
      const achievements = await db.select<any>('SELECT * FROM achievements WHERE unlocked_at IS NOT NULL');
      const settings = await db.select<any>('SELECT * FROM user_settings LIMIT 1');

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        skills,
        tasks,
        sessions,
        activities,
        reflections,
        achievements,
        settings: settings[0] || {},
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  },

  importData: async (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.version) {
        throw new Error('Invalid export file format');
      }

      // Import skills
      if (data.skills?.length) {
        for (const skill of data.skills) {
          await db.execute(
            `INSERT OR REPLACE INTO skills (id, name, description, goal_hours, current_minutes, color, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [skill.id, skill.name, skill.description, skill.goal_hours, skill.current_minutes, skill.color, skill.is_active, skill.created_at, skill.updated_at]
          );
        }
      }

      // Import tasks
      if (data.tasks?.length) {
        for (const task of data.tasks) {
          await db.execute(
            `INSERT OR REPLACE INTO tasks (id, skill_id, title, description, status, pomodoro_sessions, total_minutes, order_index, created_at, completed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [task.id, task.skill_id, task.title, task.description, task.status, task.pomodoro_sessions, task.total_minutes, task.order_index, task.created_at, task.completed_at]
          );
        }
      }

      // Import daily activities
      if (data.activities?.length) {
        for (const activity of data.activities) {
          await db.execute(
            `INSERT OR REPLACE INTO daily_activities (date, total_minutes, total_sessions)
             VALUES ($1, $2, $3)`,
            [activity.date, activity.total_minutes, activity.total_sessions]
          );
        }
      }

      // Import reflections
      if (data.reflections?.length) {
        for (const reflection of data.reflections) {
          await db.execute(
            `INSERT OR REPLACE INTO reflections (id, date, content, mood, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [reflection.id, reflection.date, reflection.content, reflection.mood, reflection.created_at, reflection.updated_at]
          );
        }
      }

      await get().fetchProfile();
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  },
}));
