export type TimerType = 'pomodoro' | 'short-break' | 'long-break';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerSession {
  id: string;
  taskId: string;
  skillId: string;
  startTime: string;
  endTime?: string;
  duration: number; // In minutes
  type: TimerType;
  completed: boolean;
  createdAt: string;
}

export interface CreateTimerSessionInput {
  taskId: string;
  skillId: string;
  type: TimerType;
  duration: number;
}

export interface TimerState {
  status: TimerStatus;
  type: TimerType;
  remainingSeconds: number;
  totalSeconds: number;
  currentTaskId?: string;
  currentSkillId?: string;
  sessionId?: string;
}

export interface PomodoroSettings {
  pomodoroDuration: number; // Default 25 minutes
  shortBreakDuration: number; // Default 5 minutes
  longBreakDuration: number; // Default 15 minutes
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  longBreakInterval: number; // Every N pomodoros, default 4
}
