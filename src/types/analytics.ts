export interface DayActivity {
  date: string; // YYYY-MM-DD
  minutes: number;
  sessions: number;
}

export interface SkillProgress {
  skillId: string;
  skillName: string;
  data: {
    date: string;
    hours: number;
  }[];
}

export interface WeeklyStats {
  weekStart: string;
  totalMinutes: number;
  totalSessions: number;
  skillBreakdown: {
    skillId: string;
    skillName: string;
    minutes: number;
    percentage: number;
  }[];
}
