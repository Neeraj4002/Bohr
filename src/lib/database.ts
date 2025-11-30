/**
 * Cross-Platform Database Service
 * Uses SQLite (Tauri) for desktop, IndexedDB (Dexie) for web
 */
import Dexie, { Table } from 'dexie';

// Check if running in Tauri (desktop) or browser (web)
export const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// ============ TYPE DEFINITIONS ============
interface UserSettingsRecord {
  id: number;
  name: string;
  email?: string;
  avatar?: string;
  theme: string;
  sound_enabled: number;
  notifications_enabled: number;
  pomodoro_duration: number;
  short_break_duration: number;
  long_break_duration: number;
  auto_start_breaks: number;
  auto_start_pomodoros: number;
  long_break_interval: number;
  daily_goal_minutes: number;
  weekly_goal_minutes: number;
  spotify_enabled: number;
  spotify_access_token?: string;
  spotify_refresh_token?: string;
  spotify_token_expiry?: string;
  created_at: string;
  updated_at: string;
}

interface SkillRecord {
  id: string;
  name: string;
  description?: string;
  goal_hours: number;
  current_minutes: number;
  color: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface TaskRecord {
  id: string;
  skill_id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  estimated_pomodoros: number;
  pomodoro_sessions: number;
  total_minutes: number;
  order_index: number;
  created_at: string;
  completed_at?: string;
}

interface TimerSessionRecord {
  id: string;
  task_id?: string;
  skill_id: string;
  start_time: string;
  end_time?: string;
  duration: number;
  type: string;
  completed: number;
  planned_duration?: number;
  session_type?: string;
  created_at: string;
}

interface AchievementRecord {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at?: string;
  progress: number;
  target: number;
  created_at: string;
}

interface ReflectionRecord {
  id: string;
  date: string;
  content: string;
  mood?: string;
  total_minutes: number;
  created_at: string;
  updated_at: string;
}

interface DailyActivityRecord {
  date: string;
  total_minutes: number;
  total_sessions: number;
}

// ============ INDEXEDDB (WEB) ============
class WebDatabase extends Dexie {
  userSettings!: Table<UserSettingsRecord, number>;
  skills!: Table<SkillRecord, string>;
  tasks!: Table<TaskRecord, string>;
  timerSessions!: Table<TimerSessionRecord, string>;
  achievements!: Table<AchievementRecord, string>;
  reflections!: Table<ReflectionRecord, string>;
  dailyActivities!: Table<DailyActivityRecord, string>;

  constructor() {
    super('TenKHoursDB');
    
    this.version(1).stores({
      userSettings: 'id',
      skills: 'id, is_active, created_at',
      tasks: 'id, skill_id, status, created_at',
      timerSessions: 'id, skill_id, task_id, created_at',
      achievements: 'id, type',
      reflections: 'id, date',
      dailyActivities: 'date',
    });
  }
}

let webDb: WebDatabase | null = null;
let webDbInitialized = false;

function getWebDb(): WebDatabase {
  if (!webDb) {
    webDb = new WebDatabase();
  }
  return webDb;
}

// Initialize web database with defaults
async function initWebDb(): Promise<void> {
  if (webDbInitialized) return;
  
  const db = getWebDb();
  
  // Check if user settings exist
  const settings = await db.userSettings.get(1);
  if (!settings) {
    const now = new Date().toISOString();
    await db.userSettings.add({
      id: 1,
      name: 'User',
      theme: 'light',
      sound_enabled: 1,
      notifications_enabled: 1,
      pomodoro_duration: 25,
      short_break_duration: 5,
      long_break_duration: 15,
      auto_start_breaks: 0,
      auto_start_pomodoros: 0,
      long_break_interval: 4,
      daily_goal_minutes: 240,
      weekly_goal_minutes: 420,
      spotify_enabled: 0,
      created_at: now,
      updated_at: now,
    });
    
    // Add default achievements
    const defaultAchievements = [
      { id: 'ach_first_hour', type: 'first_hour', name: 'First Hour', description: 'Complete your first hour of focused work', icon: 'Clock', target: 60 },
      { id: 'ach_100_hours', type: 'first_100_hours', name: '100 Hours', description: 'Reach 100 hours of practice', icon: 'Trophy', target: 6000 },
      { id: 'ach_streak_7', type: 'streak_7_days', name: '7 Day Streak', description: 'Practice for 7 consecutive days', icon: 'Flame', target: 7 },
      { id: 'ach_first_skill', type: 'first_skill', name: 'Journey Begins', description: 'Create your first skill', icon: 'Target', target: 1 },
    ];
    
    for (const ach of defaultAchievements) {
      await db.achievements.add({
        ...ach,
        progress: 0,
        created_at: now,
      });
    }
  }
  
  webDbInitialized = true;
}

// ============ TAURI/SQLITE (DESKTOP) ============
let tauriDb: any = null;
let tauriDbPromise: Promise<any> | null = null;

async function getTauriDb(): Promise<any> {
  if (tauriDb) return tauriDb;
  if (tauriDbPromise) return tauriDbPromise;
  
  tauriDbPromise = (async () => {
    const { default: Database } = await import('@tauri-apps/plugin-sql');
    tauriDb = await Database.load('sqlite:app.db');
    return tauriDb;
  })();
  
  return tauriDbPromise;
}

// ============ UNIFIED DATABASE API ============
export async function execute(query: string, params: any[] = []): Promise<void> {
  if (isTauri) {
    const db = await getTauriDb();
    await db.execute(query, params);
  } else {
    await initWebDb();
    await executeWebQuery(query, params);
  }
}

export async function select<T = any>(query: string, params: any[] = []): Promise<T[]> {
  if (isTauri) {
    const db = await getTauriDb();
    return (db as { select: <T>(s: string, p?: any[]) => Promise<T> }).select<T[]>(query, params);
  } else {
    await initWebDb();
    return selectWebQuery<T>(query, params);
  }
}

// ============ WEB QUERY HANDLERS ============
async function executeWebQuery(query: string, params: any[]): Promise<void> {
  const db = getWebDb();
  const queryLower = query.toLowerCase().trim();
  
  // Parse and execute common queries
  if (queryLower.includes('user_settings')) {
    await handleUserSettingsQuery(db, query, params);
  } else if (queryLower.startsWith('insert into skills')) {
    await handleSkillInsert(db, params);
  } else if (queryLower.startsWith('update skills')) {
    await handleSkillUpdate(db, query, params);
  } else if (queryLower.startsWith('delete from skills')) {
    await handleSkillDelete(db, params);
  } else if (queryLower.startsWith('insert into tasks')) {
    await handleTaskInsert(db, params);
  } else if (queryLower.startsWith('update tasks')) {
    await handleTaskUpdate(db, query, params);
  } else if (queryLower.startsWith('delete from tasks')) {
    await handleTaskDelete(db, params);
  } else if (queryLower.startsWith('insert into timer_sessions')) {
    await handleTimerSessionInsert(db, params);
  } else if (queryLower.startsWith('update timer_sessions')) {
    await handleTimerSessionUpdate(db, query, params);
  } else if (queryLower.includes('daily_activities')) {
    await handleDailyActivityUpsert(db, query, params);
  } else if (queryLower.startsWith('insert into reflections')) {
    await handleReflectionInsert(db, params);
  } else if (queryLower.startsWith('update reflections')) {
    await handleReflectionUpdate(db, query, params);
  } else if (queryLower.startsWith('update achievements')) {
    await handleAchievementUpdate(db, query, params);
  }
}

async function selectWebQuery<T>(query: string, params: any[]): Promise<T[]> {
  const db = getWebDb();
  const queryLower = query.toLowerCase().trim();
  
  // Handle common SELECT queries
  if (queryLower.includes('from user_settings')) {
    const result = await db.userSettings.get(1);
    return (result ? [result] : []) as T[];
  }
  
  if (queryLower.includes('from skills')) {
    if (queryLower.includes('where id =')) {
      const skill = await db.skills.get(params[0]);
      return (skill ? [skill] : []) as T[];
    }
    if (queryLower.includes('sum(current_minutes)')) {
      const skills = await db.skills.toArray();
      const total = skills.reduce((sum, s) => sum + s.current_minutes, 0);
      return [{ total }] as T[];
    }
    const skills = await db.skills.orderBy('created_at').reverse().toArray();
    return skills as T[];
  }
  
  if (queryLower.includes('from tasks')) {
    if (queryLower.includes('where skill_id =')) {
      const tasks = await db.tasks.where('skill_id').equals(params[0]).toArray();
      return tasks as T[];
    }
    if (queryLower.includes('where id =')) {
      const task = await db.tasks.get(params[0]);
      return (task ? [task] : []) as T[];
    }
    const tasks = await db.tasks.toArray();
    return tasks as T[];
  }
  
  if (queryLower.includes('from timer_sessions')) {
    if (queryLower.includes('where skill_id =')) {
      const sessions = await db.timerSessions.where('skill_id').equals(params[0]).toArray();
      return sessions as T[];
    }
    const sessions = await db.timerSessions.toArray();
    return sessions as T[];
  }
  
  if (queryLower.includes('from daily_activities')) {
    if (queryLower.includes('where date =')) {
      const activity = await db.dailyActivities.get(params[0]);
      return (activity ? [activity] : []) as T[];
    }
    const activities = await db.dailyActivities.toArray();
    return activities as T[];
  }
  
  if (queryLower.includes('from achievements')) {
    if (queryLower.includes('where type =')) {
      const achievements = await db.achievements.where('type').equals(params[0]).toArray();
      return achievements as T[];
    }
    if (queryLower.includes('where id =')) {
      const achievement = await db.achievements.get(params[0]);
      return (achievement ? [achievement] : []) as T[];
    }
    const achievements = await db.achievements.toArray();
    return achievements as T[];
  }
  
  if (queryLower.includes('from reflections')) {
    if (queryLower.includes('where date =')) {
      const reflections = await db.reflections.where('date').equals(params[0]).toArray();
      return reflections as T[];
    }
    if (queryLower.includes('where id =')) {
      const reflection = await db.reflections.get(params[0]);
      return (reflection ? [reflection] : []) as T[];
    }
    const reflections = await db.reflections.orderBy('date').reverse().toArray();
    return reflections as T[];
  }
  
  // Handle streak calculations
  if (queryLower.includes('streak')) {
    const activities = await db.dailyActivities.toArray();
    const streak = calculateStreak(activities);
    return [{ streak }] as T[];
  }
  
  // Handle count queries
  if (queryLower.includes('count(*)')) {
    if (queryLower.includes('from skills')) {
      const count = await db.skills.count();
      return [{ count }] as T[];
    }
    if (queryLower.includes('from tasks')) {
      const count = await db.tasks.count();
      return [{ count }] as T[];
    }
  }
  
  return [] as T[];
}

// ============ HELPER FUNCTIONS FOR WEB ============
function calculateStreak(activities: DailyActivityRecord[]): number {
  if (activities.length === 0) return 0;
  
  const today = new Date().toISOString().split('T')[0];
  const sortedDates = activities
    .filter(a => a.total_minutes > 0)
    .map(a => a.date)
    .sort()
    .reverse();
  
  if (sortedDates.length === 0) return 0;
  
  let streak = 0;
  const currentDate = new Date(today);
  
  for (const dateStr of sortedDates) {
    const expectedDate = currentDate.toISOString().split('T')[0];
    if (dateStr === expectedDate) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (dateStr < expectedDate) {
      break;
    }
  }
  
  return streak;
}

async function handleUserSettingsQuery(db: WebDatabase, query: string, params: any[]): Promise<void> {
  const queryLower = query.toLowerCase();
  const now = new Date().toISOString();
  
  if (queryLower.startsWith('update')) {
    const updates: Partial<UserSettingsRecord> = { updated_at: now };
    
    // Parse update fields from query
    if (queryLower.includes('name =')) updates.name = params[0];
    if (queryLower.includes('theme =')) updates.theme = params[0];
    if (queryLower.includes('pomodoro_duration =')) updates.pomodoro_duration = params[0];
    if (queryLower.includes('short_break_duration =')) updates.short_break_duration = params[0];
    if (queryLower.includes('long_break_duration =')) updates.long_break_duration = params[0];
    if (queryLower.includes('sound_enabled =')) updates.sound_enabled = params[0];
    if (queryLower.includes('notifications_enabled =')) updates.notifications_enabled = params[0];
    
    await db.userSettings.update(1, updates);
  }
}

async function handleSkillInsert(db: WebDatabase, params: any[]): Promise<void> {
  const now = new Date().toISOString();
  await db.skills.add({
    id: params[0],
    name: params[1],
    description: params[2] || '',
    goal_hours: params[3] || 10000,
    color: params[4] || '#1A73E8',
    current_minutes: 0,
    is_active: 0,
    created_at: now,
    updated_at: now,
  });
}

async function handleSkillUpdate(db: WebDatabase, query: string, params: any[]): Promise<void> {
  const id = params[params.length - 1];
  const now = new Date().toISOString();
  const queryLower = query.toLowerCase();
  
  const skill = await db.skills.get(id);
  if (!skill) return;
  
  const updates: Partial<SkillRecord> = { updated_at: now };
  
  // Handle current_minutes increment
  if (queryLower.includes('current_minutes = current_minutes +')) {
    const match = query.match(/current_minutes = current_minutes \+ \$(\d+)/i);
    if (match) {
      const paramIndex = parseInt(match[1]) - 1;
      updates.current_minutes = skill.current_minutes + params[paramIndex];
    }
  } else if (queryLower.includes('current_minutes =')) {
    updates.current_minutes = params[0];
  }
  
  if (queryLower.includes('is_active =')) {
    // Find which param is for is_active
    const match = query.match(/is_active = \$(\d+)/i);
    if (match) {
      const paramIndex = parseInt(match[1]) - 1;
      updates.is_active = params[paramIndex];
    }
  }
  
  if (queryLower.includes('name =')) {
    updates.name = params[0];
  }
  
  await db.skills.update(id, updates);
}

async function handleSkillDelete(db: WebDatabase, params: any[]): Promise<void> {
  await db.skills.delete(params[0]);
  // Also delete related tasks
  await db.tasks.where('skill_id').equals(params[0]).delete();
}

async function handleTaskInsert(db: WebDatabase, params: any[]): Promise<void> {
  const now = new Date().toISOString();
  await db.tasks.add({
    id: params[0],
    skill_id: params[1],
    title: params[2],
    description: params[3] || '',
    status: params[4] || 'todo',
    priority: params[5] || 'medium',
    due_date: params[6] || undefined,
    estimated_pomodoros: params[7] || 1,
    pomodoro_sessions: 0,
    total_minutes: 0,
    order_index: 0,
    created_at: now,
  });
}

async function handleTaskUpdate(db: WebDatabase, query: string, params: any[]): Promise<void> {
  const id = params[params.length - 1];
  const queryLower = query.toLowerCase();
  
  const task = await db.tasks.get(id);
  if (!task) return;
  
  const updates: Partial<TaskRecord> = {};
  
  if (queryLower.includes('status =')) {
    const match = query.match(/status = \$(\d+)/i);
    if (match) {
      const paramIndex = parseInt(match[1]) - 1;
      updates.status = params[paramIndex];
      if (params[paramIndex] === 'done') {
        updates.completed_at = new Date().toISOString();
      }
    }
  }
  
  if (queryLower.includes('title =')) {
    updates.title = params[0];
  }
  
  await db.tasks.update(id, updates);
}

async function handleTaskDelete(db: WebDatabase, params: any[]): Promise<void> {
  await db.tasks.delete(params[0]);
}

async function handleTimerSessionInsert(db: WebDatabase, params: any[]): Promise<void> {
  const now = new Date().toISOString();
  await db.timerSessions.add({
    id: params[0],
    task_id: params[1] || undefined,
    skill_id: params[2],
    start_time: params[3],
    end_time: params[4] || undefined,
    duration: params[5],
    type: params[6],
    completed: params[7] ? 1 : 0,
    planned_duration: params[8],
    session_type: params[9],
    created_at: now,
  });
}

async function handleTimerSessionUpdate(db: WebDatabase, query: string, params: any[]): Promise<void> {
  const id = params[params.length - 1];
  const queryLower = query.toLowerCase();
  const updates: Partial<TimerSessionRecord> = {};
  
  if (queryLower.includes('end_time =')) {
    updates.end_time = params[0];
  }
  if (queryLower.includes('completed =')) {
    updates.completed = params[0];
  }
  if (queryLower.includes('duration =')) {
    updates.duration = params[0];
  }
  
  await db.timerSessions.update(id, updates);
}

async function handleDailyActivityUpsert(db: WebDatabase, query: string, params: any[]): Promise<void> {
  const queryLower = query.toLowerCase();
  
  if (queryLower.includes('insert')) {
    const date = params[0];
    const existing = await db.dailyActivities.get(date);
    
    if (existing) {
      await db.dailyActivities.update(date, {
        total_minutes: existing.total_minutes + (params[1] || 0),
        total_sessions: existing.total_sessions + (params[2] || 1),
      });
    } else {
      await db.dailyActivities.add({
        date,
        total_minutes: params[1] || 0,
        total_sessions: params[2] || 1,
      });
    }
  } else if (queryLower.includes('update')) {
    const date = params[params.length - 1];
    const existing = await db.dailyActivities.get(date);
    
    if (existing && queryLower.includes('total_minutes = total_minutes +')) {
      const match = query.match(/total_minutes = total_minutes \+ \$(\d+)/i);
      if (match) {
        const paramIndex = parseInt(match[1]) - 1;
        await db.dailyActivities.update(date, {
          total_minutes: existing.total_minutes + params[paramIndex],
          total_sessions: existing.total_sessions + 1,
        });
      }
    }
  }
}

async function handleReflectionInsert(db: WebDatabase, params: any[]): Promise<void> {
  const now = new Date().toISOString();
  await db.reflections.add({
    id: params[0],
    date: params[1],
    content: params[2],
    mood: params[3],
    total_minutes: params[4] || 0,
    created_at: now,
    updated_at: now,
  });
}

async function handleReflectionUpdate(db: WebDatabase, _query: string, params: any[]): Promise<void> {
  const id = params[params.length - 1];
  const now = new Date().toISOString();
  
  await db.reflections.update(id, {
    content: params[0],
    mood: params[1],
    updated_at: now,
  });
}

async function handleAchievementUpdate(db: WebDatabase, query: string, params: any[]): Promise<void> {
  const queryLower = query.toLowerCase();
  
  // Find the achievement by type or id
  let achievement: AchievementRecord | undefined;
  
  if (queryLower.includes('where type =')) {
    const type = params[params.length - 1];
    const achievements = await db.achievements.where('type').equals(type).toArray();
    achievement = achievements[0];
  } else if (queryLower.includes('where id =')) {
    const id = params[params.length - 1];
    achievement = await db.achievements.get(id);
  }
  
  if (achievement) {
    const updates: Partial<AchievementRecord> = {};
    if (queryLower.includes('progress =')) {
      updates.progress = params[0];
    }
    if (queryLower.includes('unlocked_at =')) {
      updates.unlocked_at = new Date().toISOString();
    }
    await db.achievements.update(achievement.id, updates);
  }
}

// ============ EXPORTS ============
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export const db = {
  execute,
  select,
  generateId,
};

export default db;
