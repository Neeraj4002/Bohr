import { create } from 'zustand';
import { db, generateId } from '@/lib/database';
import { Skill, CreateSkillInput, UpdateSkillInput } from '@/types';

interface SkillsState {
  skills: Skill[];
  activeSkill: Skill | null;
  loading: boolean;
  error: string | null;
  
  fetchSkills: () => Promise<void>;
  createSkill: (input: CreateSkillInput) => Promise<Skill>;
  updateSkill: (input: UpdateSkillInput) => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;
  setActiveSkill: (skill: Skill | null) => Promise<void>;
  addMinutesToSkill: (skillId: string, minutes: number) => Promise<void>;
  getSkillById: (id: string) => Skill | undefined;
}

export const useSkillsStore = create<SkillsState>((set, get) => ({
  skills: [],
  activeSkill: null,
  loading: false,
  error: null,

  fetchSkills: async () => {
    set({ loading: true, error: null });
    try {
      const skills = await db.select<any[]>('SELECT * FROM skills ORDER BY created_at DESC');
      
      const mappedSkills: Skill[] = skills.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        goalHours: s.goal_hours,
        dailyGoalMinutes: s.daily_goal_minutes || 60,
        currentHours: Math.floor(s.current_minutes / 60),
        currentMinutes: s.current_minutes || 0,
        color: s.color,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        isActive: s.is_active || false,
      }));
      
      // Find active skill
      const activeSkill = mappedSkills.find(s => s.isActive) || null;
      
      set({ skills: mappedSkills, activeSkill, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createSkill: async (input) => {
    const id = generateId('skill');
    try {
      await db.execute(
        `INSERT INTO skills (id, name, description, goal_hours, daily_goal_minutes, current_minutes, color, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          input.name,
          input.description || null,
          input.goalHours,
          input.dailyGoalMinutes || 60,
          0,
          input.color || '#1A73E8',
          false
        ]
      );
      
      await get().fetchSkills();
      const skill = get().skills.find(s => s.id === id);
      return skill!;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateSkill: async (input) => {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (input.name !== undefined) {
        updates.push('name = $' + (values.length + 1));
        values.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push('description = $' + (values.length + 1));
        values.push(input.description);
      }
      if (input.goalHours !== undefined) {
        updates.push('goal_hours = $' + (values.length + 1));
        values.push(input.goalHours);
      }
      if (input.color !== undefined) {
        updates.push('color = $' + (values.length + 1));
        values.push(input.color);
      }

      if (updates.length === 0) {
        console.log('[updateSkill] No fields to update');
        return;
      }

      // Add updated_at timestamp
      updates.push("updated_at = datetime('now')");
      values.push(input.id);

      const query = `UPDATE skills SET ${updates.join(', ')} WHERE id = $${values.length}`;
      console.log('[updateSkill] Query:', query);
      console.log('[updateSkill] Values:', values);

      await db.execute(query, values);
      
      await get().fetchSkills();
      console.log('[updateSkill] Done, skills refetched');
    } catch (error) {
      console.error('[updateSkill] Error:', error);
      set({ error: String(error) });
      throw error;
    }
  },

  deleteSkill: async (id) => {
    try {
      // First check if there are any tasks for this skill
      const tasks = await db.select<any[]>('SELECT id FROM tasks WHERE skill_id = $1', [id]);
      
      if (tasks.length > 0) {
        throw new Error('Cannot delete skill with existing tasks. Please delete or reassign tasks first.');
      }
      
      // Delete timer sessions for this skill
      await db.execute('DELETE FROM timer_sessions WHERE skill_id = $1', [id]);
      
      // Delete the skill
      await db.execute('DELETE FROM skills WHERE id = $1', [id]);
      
      await get().fetchSkills();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  setActiveSkill: async (skill) => {
    try {
      // First deactivate all skills
      await db.execute('UPDATE skills SET is_active = $1', [false]);
      
      // Then activate the selected skill if provided
      if (skill) {
        await db.execute('UPDATE skills SET is_active = $1 WHERE id = $2', [true, skill.id]);
      }
      
      set({ activeSkill: skill });
      await get().fetchSkills(); // Refresh to get updated state
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  addMinutesToSkill: async (skillId, minutes) => {
    try {
      await db.execute(
        'UPDATE skills SET current_minutes = current_minutes + $1, updated_at = datetime(\'now\') WHERE id = $2',
        [minutes, skillId]
      );
      
      await get().fetchSkills();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  getSkillById: (id) => {
    return get().skills.find(s => s.id === id);
  },
}));
