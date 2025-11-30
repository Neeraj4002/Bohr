import { PomodoroSettings } from './timer';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  totalHours: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoalMinutes: number;
  weeklyGoalMinutes: number;
  dailyGoalHours?: number;
  weeklyGoalHours?: number;
  createdAt: string;
  settings: ProfileSettings;
}

export interface ProfileSettings extends PomodoroSettings {
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  spotifyEnabled: boolean;
  spotifyAccessToken?: string;
  spotifyRefreshToken?: string;
  spotifyTokenExpiry?: string;
}

// Simplified settings for Settings page
export interface UserSettings {
  pomodoroMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  dailyGoalHours: number;
  weeklyGoalHours: number;
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  autoStartBreaks: boolean;
  autoStartPomodoros?: boolean;
  longBreakInterval?: number;
  theme?: 'light' | 'dark' | 'system';
}

export interface UpdateUserProfileInput {
  name?: string;
  avatar?: string;
  dailyGoalMinutes?: number;
  weeklyGoalMinutes?: number;
}

export interface UpdateUserSettingsInput {
  pomodoroMinutes?: number;
  shortBreakMinutes?: number;
  longBreakMinutes?: number;
  dailyGoalHours?: number;
  weeklyGoalHours?: number;
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
  autoStartBreaks?: boolean;
  autoStartPomodoros?: boolean;
  longBreakInterval?: number;
  theme?: 'light' | 'dark' | 'system';
}
