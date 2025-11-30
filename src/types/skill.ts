export interface Skill {
  id: string;
  name: string;
  description?: string;
  goalHours: number;
  currentHours: number;
  currentMinutes: number; // For precise tracking
  color: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean; // Currently selected skill
}

export interface CreateSkillInput {
  name: string;
  description?: string;
  goalHours: number;
  color?: string;
}

export interface UpdateSkillInput {
  id: string;
  name?: string;
  description?: string;
  goalHours?: number;
  color?: string;
}
