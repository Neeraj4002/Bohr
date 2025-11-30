export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  skillId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  pomodoroSessions: number;
  estimatedPomodoros: number;
  totalMinutes: number;
  order: number; // For kanban ordering
  createdAt: string;
  completedAt?: string;
}

export interface CreateTaskInput {
  skillId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  estimatedPomodoros?: number;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string;
  estimatedPomodoros?: number;
  order?: number;
}
