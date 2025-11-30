import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db, generateId } from '@/lib/database';
import { TimerStatus, TimerType, PomodoroSettings } from '@/types';
import { timerNotifications } from '@/lib/notifications';
import { useCelebrationStore } from './celebrationStore';

interface TimerState {
  status: TimerStatus;
  type: TimerType;
  remainingSeconds: number;
  totalSeconds: number;
  currentTaskId: string | null;
  currentSkillId: string | null;
  currentSkillName: string | null;
  sessionId: string | null;
  pomodoroCount: number;
  todayPomodoros: number;
  settings: PomodoroSettings;
  startedAt: number | null; // Timestamp for persistence
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  
  // Actions
  startTimer: (type: TimerType, taskId: string, skillId: string, skillName?: string) => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => void;
  stopTimer: () => Promise<void>;
  completeTimer: () => Promise<void>;
  tick: () => void;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<PomodoroSettings>) => Promise<void>;
  restoreSession: () => Promise<void>;
  setSoundEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  checkAchievements: () => Promise<void>;
  getTodayPomodoros: () => Promise<number>;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  pomodoroDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  longBreakInterval: 4,
};

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      status: 'idle',
      type: 'pomodoro',
      remainingSeconds: 25 * 60,
      totalSeconds: 25 * 60,
      currentTaskId: null,
      currentSkillId: null,
      currentSkillName: null,
      sessionId: null,
      pomodoroCount: 0,
      todayPomodoros: 0,
      settings: DEFAULT_SETTINGS,
      startedAt: null,
      soundEnabled: true,
      notificationsEnabled: true,

      startTimer: async (type, taskId, skillId, skillName) => {
        const settings = get().settings;
        let duration: number;
        
        switch (type) {
          case 'pomodoro':
            duration = settings.pomodoroDuration;
            break;
          case 'short-break':
            duration = settings.shortBreakDuration;
            break;
          case 'long-break':
            duration = settings.longBreakDuration;
            break;
          default:
            duration = settings.pomodoroDuration;
        }

        const sessionId = generateId('session');
        const startTime = new Date().toISOString();
        
        try {
          await db.execute(
            'INSERT INTO timer_sessions (id, task_id, skill_id, start_time, duration, planned_duration, session_type, type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [sessionId, taskId || null, skillId, startTime, 0, duration, type, type]
          );

          const totalSec = duration * 60;
          set({
            status: 'running',
            type,
            remainingSeconds: totalSec,
            totalSeconds: totalSec,
            currentTaskId: taskId || null,
            currentSkillId: skillId,
            currentSkillName: skillName || null,
            sessionId,
            startedAt: Date.now(),
          });
        } catch (error) {
          console.error('Failed to start timer:', error);
          throw error;
        }
      },

      pauseTimer: async () => {
        const state = get();
        if (state.status === 'running') {
          // Save paused state to DB for persistence
          if (state.sessionId) {
            try {
              await db.execute(
                'UPDATE timer_sessions SET duration = $1 WHERE id = $2',
                [Math.ceil((state.totalSeconds - state.remainingSeconds) / 60), state.sessionId]
              );
            } catch (error) {
              console.error('Failed to save pause state:', error);
            }
          }
          set({ status: 'paused', startedAt: null });
        }
      },

      resumeTimer: () => {
        const state = get();
        if (state.status === 'paused') {
          set({ status: 'running', startedAt: Date.now() });
        }
      },

      stopTimer: async () => {
        const state = get();
        
        // Save partial session if exists
        if (state.sessionId) {
          const elapsedMinutes = Math.ceil((state.totalSeconds - state.remainingSeconds) / 60);
          if (elapsedMinutes > 0 && state.type === 'pomodoro' && state.currentSkillId) {
            try {
              await db.execute(
                'UPDATE timer_sessions SET end_time = NOW(), duration = $1 WHERE id = $2',
                [elapsedMinutes, state.sessionId]
              );
              
              // Add partial time to skill
              await db.execute(
                'UPDATE skills SET current_minutes = current_minutes + $1, updated_at = NOW() WHERE id = $2',
                [elapsedMinutes, state.currentSkillId]
              );
            } catch (error) {
              console.error('Failed to save stopped session:', error);
            }
          }
        }

        set({
          status: 'idle',
          remainingSeconds: get().settings.pomodoroDuration * 60,
          totalSeconds: get().settings.pomodoroDuration * 60,
          sessionId: null,
          startedAt: null,
          currentTaskId: null,
          currentSkillId: null,
          currentSkillName: null,
        });
      },

      completeTimer: async () => {
        const state = get();
        if (!state.sessionId) return;

        const actualDuration = Math.ceil(state.totalSeconds / 60);

        try {
          // Update timer session
          await db.execute(
            'UPDATE timer_sessions SET end_time = NOW(), duration = $1, completed = 1 WHERE id = $2',
            [actualDuration, state.sessionId]
          );

          // If this was a Pomodoro session, add the minutes to the skill
          if (state.type === 'pomodoro' && state.currentSkillId && actualDuration > 0) {
            await db.execute(
              'UPDATE skills SET current_minutes = current_minutes + $1, updated_at = NOW() WHERE id = $2',
              [actualDuration, state.currentSkillId]
            );
            
            // Update task pomodoro count
            if (state.currentTaskId) {
              await db.execute(
                'UPDATE tasks SET pomodoro_sessions = pomodoro_sessions + 1, total_minutes = total_minutes + $1 WHERE id = $2',
                [actualDuration, state.currentTaskId]
              );
            }
            
            // Update daily activities
            const today = new Date().toISOString().split('T')[0];
            await db.execute(
              `INSERT INTO daily_activities (date, total_minutes, total_sessions)
               VALUES ($1, $2, 1)
               ON CONFLICT(date) 
               DO UPDATE SET total_minutes = total_minutes + $2, total_sessions = total_sessions + 1`,
              [today, actualDuration]
            );

            const newCount = state.pomodoroCount + 1;
            const newTodayPomodoros = state.todayPomodoros + 1;
            set({ pomodoroCount: newCount, todayPomodoros: newTodayPomodoros });

            // Trigger celebration confetti!
            useCelebrationStore.getState().triggerConfetti();

            // Check achievements
            await get().checkAchievements();

            // Send notification
            if (state.notificationsEnabled) {
              await timerNotifications.sessionComplete(state.currentSkillName || undefined);
            }
          } else if (state.type !== 'pomodoro') {
            // Break completed
            if (state.notificationsEnabled) {
              await timerNotifications.breakComplete();
            }
          }

          set({
            status: 'completed',
            remainingSeconds: 0,
            startedAt: null,
          });

          // Auto-start next session if enabled
          const settings = get().settings;
          if (state.type === 'pomodoro' && settings.autoStartBreaks) {
            const nextType = state.pomodoroCount % settings.longBreakInterval === 0 
              ? 'long-break' 
              : 'short-break';
            setTimeout(() => {
              get().startTimer(nextType, '', state.currentSkillId || '');
            }, 2000);
          } else if (state.type !== 'pomodoro' && settings.autoStartPomodoros) {
            setTimeout(() => {
              get().startTimer('pomodoro', state.currentTaskId || '', state.currentSkillId || '');
            }, 2000);
          } else {
            setTimeout(() => {
              set({ status: 'idle' });
            }, 2000);
          }
        } catch (error) {
          console.error('Failed to complete timer:', error);
          throw error;
        }
      },

      tick: () => {
        const state = get();
        if (state.status !== 'running') return;

        if (state.remainingSeconds <= 1) {
          set({ remainingSeconds: 0 });
          get().completeTimer();
        } else {
          set({ remainingSeconds: state.remainingSeconds - 1 });
        }
      },

      loadSettings: async () => {
        try {
          const result = await db.select<any>('SELECT * FROM user_settings LIMIT 1');
          if (result.length > 0) {
            const settings = result[0];
            set({
              settings: {
                pomodoroDuration: settings.pomodoro_duration,
                shortBreakDuration: settings.short_break_duration,
                longBreakDuration: settings.long_break_duration,
                autoStartBreaks: Boolean(settings.auto_start_breaks),
                autoStartPomodoros: Boolean(settings.auto_start_pomodoros),
                longBreakInterval: settings.long_break_interval,
              },
              soundEnabled: Boolean(settings.sound_enabled),
              notificationsEnabled: Boolean(settings.notifications_enabled),
            });
          }
          
          // Load today's pomodoro count
          const today = new Date().toISOString().split('T')[0];
          const todayResult = await db.select<any>(
            'SELECT total_sessions FROM daily_activities WHERE date = $1',
            [today]
          );
          if (todayResult.length > 0) {
            set({ todayPomodoros: todayResult[0].total_sessions });
          }
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      },

      updateSettings: async (newSettings) => {
        try {
          const updates: string[] = [];
          const values: any[] = [];

          if (newSettings.pomodoroDuration !== undefined) {
            updates.push('pomodoro_duration = $' + (values.length + 1));
            values.push(newSettings.pomodoroDuration);
          }
          if (newSettings.shortBreakDuration !== undefined) {
            updates.push('short_break_duration = $' + (values.length + 1));
            values.push(newSettings.shortBreakDuration);
          }
          if (newSettings.longBreakDuration !== undefined) {
            updates.push('long_break_duration = $' + (values.length + 1));
            values.push(newSettings.longBreakDuration);
          }
          if (newSettings.autoStartBreaks !== undefined) {
            updates.push('auto_start_breaks = $' + (values.length + 1));
            values.push(newSettings.autoStartBreaks ? 1 : 0);
          }
          if (newSettings.autoStartPomodoros !== undefined) {
            updates.push('auto_start_pomodoros = $' + (values.length + 1));
            values.push(newSettings.autoStartPomodoros ? 1 : 0);
          }
          if (newSettings.longBreakInterval !== undefined) {
            updates.push('long_break_interval = $' + (values.length + 1));
            values.push(newSettings.longBreakInterval);
          }

          if (updates.length > 0) {
            await db.execute(
              `UPDATE user_settings SET ${updates.join(', ')}`,
              values
            );
          }
          await get().loadSettings();
        } catch (error) {
          console.error('Failed to update settings:', error);
          throw error;
        }
      },

      restoreSession: async () => {
        const state = get();
        
        // If we have a persisted running/paused state, restore it
        if (state.startedAt && (state.status === 'running' || state.status === 'paused')) {
          if (state.status === 'running') {
            // Calculate how much time has passed since startedAt
            const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
            const newRemaining = Math.max(0, state.remainingSeconds - elapsed);
            
            if (newRemaining <= 0) {
              // Timer should have completed while away
              await get().completeTimer();
            } else {
              set({ remainingSeconds: newRemaining });
            }
          }
        }
      },

      setSoundEnabled: (enabled) => {
        set({ soundEnabled: enabled });
        db.execute('UPDATE user_settings SET sound_enabled = $1', [enabled ? 1 : 0])
          .catch(console.error);
      },

      setNotificationsEnabled: (enabled) => {
        set({ notificationsEnabled: enabled });
        db.execute('UPDATE user_settings SET notifications_enabled = $1', [enabled ? 1 : 0])
          .catch(console.error);
      },

      checkAchievements: async () => {
        try {
          // Get total minutes across all skills
          const totalResult = await db.select<any>(
            'SELECT SUM(current_minutes) as total FROM skills'
          );
          const totalMinutes = totalResult[0]?.total || 0;

          // Get current streak
          const streakResult = await db.select<any>(`
            WITH RECURSIVE dates AS (
              SELECT date('now') as date, 0 as days
              UNION ALL
              SELECT date(date, '-1 day'), days + 1
              FROM dates
              WHERE days < 365 AND EXISTS (
                SELECT 1 FROM daily_activities WHERE date = date(dates.date, '-1 day')
              )
            )
            SELECT MAX(days) as streak FROM dates
          `);
          const currentStreak = streakResult[0]?.streak || 0;

          // Get skill count
          const skillResult = await db.select<any>('SELECT COUNT(*) as count FROM skills');
          const skillCount = skillResult[0]?.count || 0;

          // Get today's pomodoros
          const today = new Date().toISOString().split('T')[0];
          const todayResult = await db.select<any>(
            'SELECT total_sessions FROM daily_activities WHERE date = $1',
            [today]
          );
          const todayPomodoros = todayResult[0]?.total_sessions || 0;

          // Check and unlock achievements
          const achievements = [
            { type: 'first_hour', progress: totalMinutes, target: 60 },
            { type: 'first_100_hours', progress: totalMinutes, target: 6000 },
            { type: 'first_1000_hours', progress: totalMinutes, target: 60000 },
            { type: 'skill_mastery', progress: totalMinutes, target: 600000 },
            { type: 'streak_7_days', progress: currentStreak, target: 7 },
            { type: 'streak_30_days', progress: currentStreak, target: 30 },
            { type: 'streak_100_days', progress: currentStreak, target: 100 },
            { type: 'streak_365_days', progress: currentStreak, target: 365 },
            { type: 'first_skill', progress: skillCount, target: 1 },
            { type: 'five_skills', progress: skillCount, target: 5 },
            { type: 'ten_skills', progress: skillCount, target: 10 },
            { type: 'focused', progress: todayPomodoros, target: 10 },
          ];

          for (const ach of achievements) {
            // Update progress
            await db.execute(
              'UPDATE achievements SET progress = $1 WHERE type = $2',
              [ach.progress, ach.type]
            );

            // Check if should unlock
            if (ach.progress >= ach.target) {
              const existing = await db.select<any>(
                'SELECT unlocked_at FROM achievements WHERE type = $1',
                [ach.type]
              );
              
              if (existing.length > 0 && !existing[0].unlocked_at) {
                await db.execute(
                  'UPDATE achievements SET unlocked_at = NOW() WHERE type = $1',
                  [ach.type]
                );
                
                // Get achievement details for notification
                const achDetails = await db.select<any>(
                  'SELECT name, description FROM achievements WHERE type = $1',
                  [ach.type]
                );
                
                if (achDetails.length > 0 && get().notificationsEnabled) {
                  await timerNotifications.achievementUnlocked(
                    achDetails[0].name,
                    achDetails[0].description
                  );
                }
              }
            }
          }

          // Check time-based achievements (night owl, early bird)
          const hour = new Date().getHours();
          if (hour >= 0 && hour < 5) {
            await db.execute(
              `UPDATE achievements SET progress = 1, unlocked_at = COALESCE(unlocked_at, NOW()) 
               WHERE type = 'night_owl'`
            );
          }
          if (hour >= 4 && hour < 6) {
            await db.execute(
              `UPDATE achievements SET progress = 1, unlocked_at = COALESCE(unlocked_at, NOW()) 
               WHERE type = 'early_bird'`
            );
          }
        } catch (error) {
          console.error('Failed to check achievements:', error);
        }
      },

      getTodayPomodoros: async () => {
        const today = new Date().toISOString().split('T')[0];
        const result = await db.select<any>(
          'SELECT total_sessions FROM daily_activities WHERE date = $1',
          [today]
        );
        return result[0]?.total_sessions || 0;
      },
    }),
    {
      name: 'timer-storage',
      partialize: (state) => ({
        status: state.status,
        type: state.type,
        remainingSeconds: state.remainingSeconds,
        totalSeconds: state.totalSeconds,
        currentTaskId: state.currentTaskId,
        currentSkillId: state.currentSkillId,
        currentSkillName: state.currentSkillName,
        sessionId: state.sessionId,
        startedAt: state.startedAt,
        pomodoroCount: state.pomodoroCount,
      }),
    }
  )
);

// Timer tick interval
let tickInterval: ReturnType<typeof setInterval> | null = null;

if (typeof window !== 'undefined') {
  // Clear any existing interval
  if (tickInterval) {
    clearInterval(tickInterval);
  }
  
  tickInterval = setInterval(() => {
    useTimerStore.getState().tick();
  }, 1000);

  // Restore session on load
  setTimeout(() => {
    useTimerStore.getState().restoreSession();
    useTimerStore.getState().loadSettings();
  }, 100);
}
