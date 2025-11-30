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
  setActiveSkill: (id: string) => Promise<void>;
  getSkillById: (id: string) => Skill | undefined;
  addMinutesToSkill: (id: string, minutes: number) => Promise<void>;
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
        currentHours: Math.floor(s.current_minutes / 60),
        currentMinutes: s.current_minutes,
        color: s.color,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        isActive: Boolean(s.is_active),
      }));
      
      const active = mappedSkills.find(s => s.isActive) || null;
      set({ skills: mappedSkills, activeSkill: active, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createSkill: async (input) => {
    const id = generateId('skill');
    try {
      await db.execute(
        'INSERT INTO skills (id, name, description, goal_hours, color) VALUES ($1, $2, $3, $4, $5)',
        [id, input.name, input.description || '', input.goalHours, input.color || '#6366f1']
      );
      await get().fetchSkills();
      
      // Return the created skill
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

      updates.push("updated_at = datetime('now')");
      values.push(input.id);

      await db.execute(
        `UPDATE skills SET ${updates.join(', ')} WHERE id = $${values.length}`,
        values
      );
      await get().fetchSkills();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  deleteSkill: async (id) => {
    try {
      await db.execute('DELETE FROM skills WHERE id = $1', [id]);
      await get().fetchSkills();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  setActiveSkill: async (id) => {
    try {
      await db.execute('UPDATE skills SET is_active = 0');
      await db.execute('UPDATE skills SET is_active = 1 WHERE id = $1', [id]);
      await get().fetchSkills();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  getSkillById: (id) => {
    return get().skills.find(s => s.id === id);
  },

  addMinutesToSkill: async (id, minutes) => {
    try {
      await db.execute(
        'UPDATE skills SET current_minutes = current_minutes + $1, updated_at = datetime("now") WHERE id = $2',
        [minutes, id]
      );
      await get().fetchSkills();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },
}));
