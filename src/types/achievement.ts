export type AchievementType = 
  | 'first_hour'
  | 'first_100_hours'
  | 'first_1000_hours'
  | 'skill_mastery' // 10,000 hours
  | 'streak_7_days'
  | 'streak_30_days'
  | 'streak_100_days'
  | 'streak_365_days'
  | 'first_skill'
  | 'five_skills'
  | 'ten_skills'
  | 'night_owl' // Session after midnight
  | 'early_bird' // Session before 6am
  | 'focused' // 10 pomodoros in one day
  | 'dedicated'; // 50 pomodoros in one week

export interface Achievement {
  id: string;
  type: AchievementType;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  unlockedAt?: string;
  progress: number; // 0-100
  target: number;
}

export interface CreateAchievementInput {
  type: AchievementType;
  unlockedAt?: string;
}
