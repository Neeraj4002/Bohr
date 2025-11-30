import { create } from 'zustand';
import { db, generateId } from '@/lib/database';
import { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from '@/types';

interface TasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  
  fetchTasks: (skillId?: string) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (input: UpdateTaskInput) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  getTasksByStatus: (status: TaskStatus) => Task[];
  reorderTasks: (taskIds: string[]) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,

  fetchTasks: async (skillId) => {
    set({ loading: true, error: null });
    try {
      const query = skillId
        ? 'SELECT * FROM tasks WHERE skill_id = $1 ORDER BY order_index, created_at DESC'
        : 'SELECT * FROM tasks ORDER BY order_index, created_at DESC';
      const params = skillId ? [skillId] : [];
      const tasks = await db.select<any[]>(query, params);
      
      const mappedTasks: Task[] = tasks.map((t: any) => ({
        id: t.id,
        skillId: t.skill_id,
        title: t.title,
        description: t.description,
        status: t.status as TaskStatus,
        priority: t.priority || 'medium',
        dueDate: t.due_date,
        pomodoroSessions: t.pomodoro_sessions,
        estimatedPomodoros: t.estimated_pomodoros || 1,
        totalMinutes: t.total_minutes,
        order: t.order_index,
        createdAt: t.created_at,
        completedAt: t.completed_at,
      }));
      
      set({ tasks: mappedTasks, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },

  createTask: async (input) => {
    const id = generateId('task');
    try {
      await db.execute(
        `INSERT INTO tasks (id, skill_id, title, description, status, priority, due_date, estimated_pomodoros) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id, 
          input.skillId, 
          input.title, 
          input.description || null, 
          input.status || 'todo',
          input.priority || 'medium',
          input.dueDate || null,
          input.estimatedPomodoros || 1
        ]
      );
      await get().fetchTasks(input.skillId);
      
      const task = get().tasks.find(t => t.id === id);
      return task!;
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateTask: async (input) => {
    try {
      const updates: string[] = [];
      const values: any[] = [];

      if (input.title !== undefined) {
        updates.push('title = $' + (values.length + 1));
        values.push(input.title);
      }
      if (input.description !== undefined) {
        updates.push('description = $' + (values.length + 1));
        values.push(input.description);
      }
      if (input.status !== undefined) {
        updates.push('status = $' + (values.length + 1));
        values.push(input.status);
        
        if (input.status === 'done') {
          updates.push('completed_at = NOW()');
        }
      }
      if (input.priority !== undefined) {
        updates.push('priority = $' + (values.length + 1));
        values.push(input.priority);
      }
      if (input.dueDate !== undefined) {
        updates.push('due_date = $' + (values.length + 1));
        values.push(input.dueDate);
      }
      if (input.estimatedPomodoros !== undefined) {
        updates.push('estimated_pomodoros = $' + (values.length + 1));
        values.push(input.estimatedPomodoros);
      }
      if (input.order !== undefined) {
        updates.push('order_index = $' + (values.length + 1));
        values.push(input.order);
      }

      values.push(input.id);

      await db.execute(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${values.length}`,
        values
      );
      await get().fetchTasks();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  deleteTask: async (id) => {
    try {
      await db.execute('DELETE FROM tasks WHERE id = $1', [id]);
      await get().fetchTasks();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  updateTaskStatus: async (id, status) => {
    try {
      const updates = ['status = $1'];
      const values: any[] = [status];
      
      if (status === 'done') {
        updates.push('completed_at = NOW()');
      }
      
      values.push(id);
      
      await db.execute(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${values.length}`,
        values
      );
      await get().fetchTasks();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },

  getTasksByStatus: (status) => {
    return get().tasks.filter(t => t.status === status);
  },

  reorderTasks: async (taskIds) => {
    try {
      for (let i = 0; i < taskIds.length; i++) {
        await db.execute(
          'UPDATE tasks SET order_index = $1 WHERE id = $2',
          [i, taskIds[i]]
        );
      }
      await get().fetchTasks();
    } catch (error) {
      set({ error: String(error) });
      throw error;
    }
  },
}));
