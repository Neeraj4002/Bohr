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
  daily_goal_minutes: number;
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
  
  // Handle streak calculations FIRST (before daily_activities check)
  // These are complex WITH RECURSIVE queries that also contain 'from daily_activities'
  if (queryLower.includes('streak') || queryLower.includes('with recursive')) {
    const activities = await db.dailyActivities.toArray();
    const streak = calculateStreak(activities);
    return [{ streak }] as T[];
  }
  
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
    const sessions = await db.timerSessions.toArray();
    
    // Handle: SELECT skill_id, SUM(duration) ... WHERE completed = 1 AND type = 'pomodoro' AND date(start_time) = date($1) GROUP BY skill_id
    if (queryLower.includes('sum(duration)') && queryLower.includes('group by skill_id')) {
      const today = params[0] ? params[0].split('T')[0] : new Date().toISOString().split('T')[0];
      const filtered = sessions.filter(s => 
        s.completed === 1 && 
        s.type === 'pomodoro' && 
        s.start_time && s.start_time.startsWith(today)
      );
      
      // Group by skill_id and sum duration
      const grouped: Record<string, number> = {};
      filtered.forEach(s => {
        if (s.skill_id) {
          grouped[s.skill_id] = (grouped[s.skill_id] || 0) + (s.duration || 0);
        }
      });
      
      return Object.entries(grouped).map(([skill_id, total_minutes]) => ({
        skill_id,
        total_minutes
      })) as T[];
    }
    
    // Handle: SELECT date(start_time), SUM(duration) ... GROUP BY date(start_time) - for yearly activity
    if (queryLower.includes('sum(duration)') && queryLower.includes('group by date(start_time)')) {
      const filtered = sessions.filter(s => s.completed === 1 && s.type === 'pomodoro');
      
      // Group by date and sum duration
      const grouped: Record<string, number> = {};
      filtered.forEach(s => {
        if (s.start_time) {
          const date = s.start_time.split('T')[0];
          grouped[date] = (grouped[date] || 0) + (s.duration || 0);
        }
      });
      
      return Object.entries(grouped).map(([activity_date, total_minutes]) => ({
        activity_date,
        total_minutes
      })) as T[];
    }
    
    if (queryLower.includes('where skill_id =')) {
      const filtered = sessions.filter(s => s.skill_id === params[0]);
      return filtered as T[];
    }
    
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
    
    // Parse each field with its parameter position dynamically
    const parseParam = (field: string): number | null => {
      const regex = new RegExp(`${field} = \\$(\\d+)`, 'i');
      const match = query.match(regex);
      return match ? parseInt(match[1]) - 1 : null;
    };
    
    const nameIdx = parseParam('name');
    if (nameIdx !== null) updates.name = params[nameIdx];
    
    const themeIdx = parseParam('theme');
    if (themeIdx !== null) updates.theme = params[themeIdx];
    
    const pomodoroIdx = parseParam('pomodoro_duration');
    if (pomodoroIdx !== null) updates.pomodoro_duration = params[pomodoroIdx];
    
    const shortBreakIdx = parseParam('short_break_duration');
    if (shortBreakIdx !== null) updates.short_break_duration = params[shortBreakIdx];
    
    const longBreakIdx = parseParam('long_break_duration');
    if (longBreakIdx !== null) updates.long_break_duration = params[longBreakIdx];
    
    const soundIdx = parseParam('sound_enabled');
    if (soundIdx !== null) updates.sound_enabled = params[soundIdx];
    
    const notifIdx = parseParam('notifications_enabled');
    if (notifIdx !== null) updates.notifications_enabled = params[notifIdx];
    
    const dailyGoalIdx = parseParam('daily_goal_minutes');
    if (dailyGoalIdx !== null) updates.daily_goal_minutes = params[dailyGoalIdx];
    
    const weeklyGoalIdx = parseParam('weekly_goal_minutes');
    if (weeklyGoalIdx !== null) updates.weekly_goal_minutes = params[weeklyGoalIdx];
    
    const autoStartBreaksIdx = parseParam('auto_start_breaks');
    if (autoStartBreaksIdx !== null) updates.auto_start_breaks = params[autoStartBreaksIdx];
    
    const autoStartPomodorosIdx = parseParam('auto_start_pomodoros');
    if (autoStartPomodorosIdx !== null) updates.auto_start_pomodoros = params[autoStartPomodorosIdx];
    
    const longBreakIntervalIdx = parseParam('long_break_interval');
    if (longBreakIntervalIdx !== null) updates.long_break_interval = params[longBreakIntervalIdx];
    
    console.log('[handleUserSettingsQuery] Updating user settings with:', updates);
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
    daily_goal_minutes: params[4] || 60,
    color: params[5] || '#1A73E8',
    current_minutes: 0,
    is_active: 0,
    created_at: now,
    updated_at: now,
  });
}

async function handleSkillUpdate(db: WebDatabase, query: string, params: any[]): Promise<void> {
  const queryLower = query.toLowerCase();
  const now = new Date().toISOString();
  
  // Handle bulk updates (like setting all skills inactive)
  if (queryLower.includes('update skills set') && !queryLower.includes('where')) {
    if (queryLower.includes('is_active =')) {
      // Update all skills
      const allSkills = await db.skills.toArray();
      for (const skill of allSkills) {
        await db.skills.update(skill.id, { is_active: params[0], updated_at: now });
      }
      return;
    }
  }
  
  // Handle individual skill updates
  const id = params[params.length - 1];
  const skill = await db.skills.get(id);
  if (!skill) return;
  
  const updates: Partial<SkillRecord> = { updated_at: now };
  
  // Parse each field with its parameter position dynamically
  const parseParam = (field: string): number | null => {
    const regex = new RegExp(`${field} = \\$(\\d+)`, 'i');
    const match = query.match(regex);
    return match ? parseInt(match[1]) - 1 : null;
  };
  
  // Handle current_minutes increment
  if (queryLower.includes('current_minutes = current_minutes +')) {
    const match = query.match(/current_minutes = current_minutes \+ \$(\d+)/i);
    if (match) {
      const paramIndex = parseInt(match[1]) - 1;
      updates.current_minutes = skill.current_minutes + params[paramIndex];
    }
  } else {
    const currentMinIdx = parseParam('current_minutes');
    if (currentMinIdx !== null) {
      updates.current_minutes = params[currentMinIdx];
    }
  }
  
  // Handle is_active
  const isActiveIdx = parseParam('is_active');
  if (isActiveIdx !== null) {
    updates.is_active = params[isActiveIdx];
  }
  
  // Handle name
  const nameIdx = parseParam('name');
  if (nameIdx !== null) {
    updates.name = params[nameIdx];
  }
  
  // Handle description
  const descIdx = parseParam('description');
  if (descIdx !== null) {
    updates.description = params[descIdx];
  }
  
  // Handle goal_hours
  const goalIdx = parseParam('goal_hours');
  if (goalIdx !== null) {
    updates.goal_hours = params[goalIdx];
  }
  
  // Handle color
  const colorIdx = parseParam('color');
  if (colorIdx !== null) {
    updates.color = params[colorIdx];
  }
  
  // Handle daily_goal_minutes
  const dailyGoalIdx = parseParam('daily_goal_minutes');
  if (dailyGoalIdx !== null) {
    updates.daily_goal_minutes = params[dailyGoalIdx];
  }
  
  console.log('[handleSkillUpdate] Updating skill:', id, 'with:', updates);
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
  
  // Parse each field with its parameter position dynamically
  const parseParam = (field: string): number | null => {
    const regex = new RegExp(`${field} = \\$(\\d+)`, 'i');
    const match = query.match(regex);
    return match ? parseInt(match[1]) - 1 : null;
  };
  
  // Handle status
  const statusIdx = parseParam('status');
  if (statusIdx !== null) {
    updates.status = params[statusIdx];
    if (params[statusIdx] === 'done') {
      updates.completed_at = new Date().toISOString();
    }
  }
  
  // Handle title
  const titleIdx = parseParam('title');
  if (titleIdx !== null) {
    updates.title = params[titleIdx];
  }
  
  // Handle description
  const descIdx = parseParam('description');
  if (descIdx !== null) {
    updates.description = params[descIdx];
  }
  
  // Handle priority
  const priorityIdx = parseParam('priority');
  if (priorityIdx !== null) {
    updates.priority = params[priorityIdx];
  }
  
  // Handle due_date
  const dueDateIdx = parseParam('due_date');
  if (dueDateIdx !== null) {
    updates.due_date = params[dueDateIdx] || undefined;
  }
  
  // Handle estimated_pomodoros
  const estimatedIdx = parseParam('estimated_pomodoros');
  if (estimatedIdx !== null) {
    updates.estimated_pomodoros = params[estimatedIdx];
  }
  
  // Handle total_minutes (direct set)
  const totalMinIdx = parseParam('total_minutes');
  if (totalMinIdx !== null && !queryLower.includes('total_minutes = total_minutes +')) {
    updates.total_minutes = params[totalMinIdx];
  }
  
  // Handle total_minutes increment: total_minutes = total_minutes + $N
  if (queryLower.includes('total_minutes = total_minutes +')) {
    const match = query.match(/total_minutes = total_minutes \+ \$(\d+)/i);
    if (match) {
      const paramIndex = parseInt(match[1]) - 1;
      updates.total_minutes = task.total_minutes + params[paramIndex];
    }
  }
  
  // Handle pomodoro_sessions (direct set)
  const pomodoroIdx = parseParam('pomodoro_sessions');
  if (pomodoroIdx !== null && !queryLower.includes('pomodoro_sessions = pomodoro_sessions +')) {
    updates.pomodoro_sessions = params[pomodoroIdx];
  }
  
  // Handle pomodoro_sessions increment
  if (queryLower.includes('pomodoro_sessions = pomodoro_sessions +')) {
    const match = query.match(/pomodoro_sessions = pomodoro_sessions \+ \$(\d+)/i);
    if (match) {
      const paramIndex = parseInt(match[1]) - 1;
      updates.pomodoro_sessions = task.pomodoro_sessions + params[paramIndex];
    }
  }
  
  // Handle order_index
  const orderIdx = parseParam('order_index');
  if (orderIdx !== null) {
    updates.order_index = params[orderIdx];
  }
  
  console.log('[handleTaskUpdate] Updating task:', id, 'with:', updates);
  await db.tasks.update(id, updates);
}

async function handleTaskDelete(db: WebDatabase, params: any[]): Promise<void> {
  await db.tasks.delete(params[0]);
}

async function handleTimerSessionInsert(db: WebDatabase, params: any[]): Promise<void> {
  const now = new Date().toISOString();
  await db.timerSessions.add({
    id: params[0],
    task_id: params[1] === null ? undefined : params[1],
    skill_id: params[2],
    start_time: params[3],
    end_time: params[4] || undefined, // Support end_time in insert
    duration: params[5],
    type: params[6],
    completed: params[7] ? 1 : 0,
    created_at: params[8] || now,
  });
}

async function handleTimerSessionUpdate(db: WebDatabase, query: string, params: any[]): Promise<void> {
  const id = params[params.length - 1];
  const queryLower = query.toLowerCase();
  const updates: Partial<TimerSessionRecord> = {};
  
  // Parse SET clause to extract field assignments
  // Handle patterns like: SET end_time = $1, completed = 1, duration = $2 WHERE id = $3
  
  // Check for literal completed = 1 (not a parameter)
  if (queryLower.includes('completed = 1')) {
    updates.completed = 1;
  } else if (queryLower.includes('completed = 0')) {
    updates.completed = 0;
  }
  
  // Parse parameterized fields by checking SET clause
  const setMatch = query.match(/SET\s+(.+?)\s+WHERE/i);
  if (setMatch) {
    const setClause = setMatch[1];
    const assignments = setClause.split(',').map(s => s.trim());
    
    let paramIndex = 0;
    assignments.forEach(assignment => {
      const [field] = assignment.split('=').map(s => s.trim().toLowerCase());
      const hasParam = assignment.includes('$');
      
      if (hasParam) {
        if (field === 'end_time') {
          updates.end_time = params[paramIndex];
          paramIndex++;
        } else if (field === 'duration') {
          updates.duration = params[paramIndex];
          paramIndex++;
        } else if (field === 'completed') {
          updates.completed = params[paramIndex];
          paramIndex++;
        }
      }
    });
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
