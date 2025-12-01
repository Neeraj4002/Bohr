import { create } from 'zustand';
import { db, generateId } from '@/lib/database';
import { TimerSession, TimerState, TimerType, PomodoroSettings, CreateTimerSessionInput } from '@/types';

interface TimerStore extends TimerState {
  settings: PomodoroSettings;
  sessions: TimerSession[];
  loading: boolean;
  error: string | null;
  
  // Timer controls
  startTimer: (type: TimerType, taskId: string | null, skillId: string) => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  
  // Session management
  fetchSessions: (skillId?: string) => Promise<void>;
  createSession: (input: CreateTimerSessionInput) => Promise<TimerSession>;
  updateSession: (sessionId: string, updates: Partial<TimerSession>) => Promise<void>;
  
  // Settings
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
  loadSettings: () => Promise<void>;
  
  // Internal timer management
  tick: () => void;
  completeSession: () => Promise<void>;
}

const defaultSettings: PomodoroSettings = {
  pomodoroDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  longBreakInterval: 4,
};

const defaultState: TimerState = {
  status: 'idle',
  type: 'pomodoro',
  remainingSeconds: 25 * 60,
  totalSeconds: 25 * 60,
  currentTaskId: undefined,
  currentSkillId: undefined,
  sessionId: undefined,
};

let timerInterval: number | null = null;

export const useTimerStore = create<TimerStore>((set, get) => ({
  ...defaultState,
  settings: defaultSettings,
  sessions: [],
  loading: false,
  error: null,

  startTimer: async (type, taskId, skillId) => {
    const { settings } = get();
    const durationMinutes = type === 'pomodoro' 
      ? settings.pomodoroDuration 
      : type === 'short-break' 
      ? settings.shortBreakDuration 
      : settings.longBreakDuration;
    
    const totalSeconds = durationMinutes * 60;
    const sessionId = generateId('session');
    const now = new Date().toISOString();
    
    try {
      // Create session in database
      await db.execute(
        `INSERT INTO timer_sessions (id, task_id, skill_id, start_time, duration, type, completed) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [sessionId, taskId || null, skillId, now, durationMinutes, type, false]
      );

      set({
        status: 'running',
        type,
        remainingSeconds: totalSeconds,
        totalSeconds,
        currentTaskId: taskId || undefined,
        currentSkillId: skillId,
        sessionId,
        error: null,
      });

      // Start the timer interval
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        get().tick();
      }, 1000);

    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  pauseTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    set({ status: 'paused' });
  },

  resumeTimer: () => {
    const { status } = get();
    if (status === 'paused') {
      set({ status: 'running' });
      timerInterval = setInterval(() => {
        get().tick();
      }, 1000);
    }
  },

  stopTimer: () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    const { sessionId } = get();
    if (sessionId) {
      // Mark session as incomplete
      const now = new Date().toISOString();
      db.execute(
        'UPDATE timer_sessions SET end_time = $1, completed = $2 WHERE id = $3',
        [now, false, sessionId]
      ).catch(console.error);
    }

    set({
      ...defaultState,
      remainingSeconds: get().settings.pomodoroDuration * 60,
      totalSeconds: get().settings.pomodoroDuration * 60,
    });
  },

  tick: () => {
    const { remainingSeconds, status } = get();
    
    if (status !== 'running') return;
    
    if (remainingSeconds <= 1) {
      get().completeSession();
      return;
    }
    
    set({ remainingSeconds: remainingSeconds - 1 });
  },

  completeSession: async () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    const { sessionId, currentTaskId, currentSkillId, type, settings } = get();
    
    try {
      if (sessionId) {
        // Mark session as completed
        const now = new Date().toISOString();
        await db.execute(
          'UPDATE timer_sessions SET end_time = $1, completed = $2 WHERE id = $3',
          [now, true, sessionId]
        );

        // If this was a pomodoro, increment the task's pomodoro count
        if (type === 'pomodoro' && currentTaskId) {
          await db.execute(
            'UPDATE tasks SET pomodoro_sessions = COALESCE(pomodoro_sessions, 0) + 1 WHERE id = $1',
            [currentTaskId]
          );
        }

        // Update skill minutes
        if (currentSkillId && type === 'pomodoro') {
          await db.execute(
            'UPDATE skills SET current_minutes = current_minutes + $1 WHERE id = $2',
            [settings.pomodoroDuration, currentSkillId]
          );
        }
      }

      set({ 
        status: 'completed',
        remainingSeconds: 0,
      });

      // Auto-start next session based on settings
      setTimeout(() => {
        const shouldAutoStart = type === 'pomodoro' 
          ? settings.autoStartBreaks 
          : settings.autoStartPomodoros;
          
        if (shouldAutoStart && currentTaskId && currentSkillId) {
          const nextType = type === 'pomodoro' ? 'short-break' : 'pomodoro';
          get().startTimer(nextType, currentTaskId, currentSkillId);
        } else {
          set({ status: 'idle' });
        }
      }, 2000);

    } catch (error) {
      set({ error: String(error) });
    }
  },

  fetchSessions: async (skillId) => {
    set({ loading: true, error: null });
    try {
      const query = skillId
        ? 'SELECT * FROM timer_sessions WHERE skill_id = $1 ORDER BY start_time DESC'
        : 'SELECT * FROM timer_sessions ORDER BY start_time DESC';
      const params = skillId ? [skillId] : [];
      const sessions = await db.select<any[]>(query, params);
      
      const mappedSessions: TimerSession[] = sessions.map((s: any) => ({
        id: s.id,
        taskId: s.task_id,
        skillId: s.skill_id,
        startTime: s.start_time,
        endTime: s.end_time,
        duration: s.duration,
        type: s.type as TimerType,
        completed: s.completed,
        createdAt: s.created_at,
      }));
      
      set({ sessions: mappedSessions, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createSession: async (input) => {
    const id = generateId('session');
    try {
      await db.execute(
        `INSERT INTO timer_sessions (id, task_id, skill_id, start_time, duration, type, completed) 
         VALUES ($1, $2, $3, datetime('now'), $4, $5, $6)`,
        [id, input.taskId, input.skillId, input.duration, input.type, false]
      );
      
      await get().fetchSessions(input.skillId);
      const session = get().sessions.find(s => s.id === id);
      return session!;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateSession: async (sessionId, updates) => {
    try {
      const updateFields: string[] = [];
      const values: any[] = [];

      if (updates.endTime !== undefined) {
        updateFields.push('end_time = $' + (values.length + 1));
        values.push(updates.endTime);
      }
      if (updates.completed !== undefined) {
        updateFields.push('completed = $' + (values.length + 1));
        values.push(updates.completed);
      }
      if (updates.duration !== undefined) {
        updateFields.push('duration = $' + (values.length + 1));
        values.push(updates.duration);
      }

      values.push(sessionId);

      await db.execute(
        `UPDATE timer_sessions SET ${updateFields.join(', ')} WHERE id = $${values.length}`,
        values
      );
      
      await get().fetchSessions();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateSettings: (newSettings) => {
    const settings = { ...get().settings, ...newSettings };
    set({ settings });
    
    // Update timer durations if idle
    if (get().status === 'idle') {
      const totalSeconds = settings.pomodoroDuration * 60;
      set({ 
        remainingSeconds: totalSeconds,
        totalSeconds,
      });
    }
  },

  loadSettings: async () => {
    // In a real app, this would load settings from database/storage
    // For now, just use defaults
    set({ settings: defaultSettings });
  },
}));
