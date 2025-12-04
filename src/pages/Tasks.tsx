import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSkillsStore } from '@/store/skillsStore';
import { useTasksStore } from '@/store/tasksStore';
import { useTimerStore } from '@/store/timerStore';
import { useUserStore } from '@/store/userStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import {
  Plus,
  Play,
  Trash2,
  Clock,
  Target,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Task, TaskPriority } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatDateForInput = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch {
    return '';
  }
};

const isOverdue = (dateStr: string | undefined): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const formatMinutes = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// ============================================
// KPI BADGE COMPONENT
// ============================================
interface KpiBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'amber' | 'purple';
}

function KpiBadge({ icon, label, value, color }: KpiBadgeProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
  };

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border', colors[color])}>
      {icon}
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide opacity-75">{label}</span>
        <span className="text-sm font-bold">{value}</span>
      </div>
    </div>
  );
}

// ============================================
// TASK CARD (Compact Notion-style)
// ============================================
interface TaskCardProps {
  task: Task;
  skill?: { id: string; name: string; color: string };
  onEdit: (task: Task) => void;
  onComplete: (taskId: string) => void;
  onStart: (taskId: string, skillId: string) => void;
}

function TaskCard({ task, skill, onEdit, onComplete, onStart }: TaskCardProps) {
  const taskIsOverdue = isOverdue(task.dueDate);
  const hasTimeTracked = (task.totalMinutes || 0) > 0;
  const statusConfig = {
    'todo': { label: 'Not started', color: 'bg-red-50 text-red-600' },
    'in-progress': { label: 'In progress', color: 'bg-amber-50 text-amber-600' },
    'done': { label: 'Completed', color: 'bg-green-50 text-green-600' },
  };
  const status = statusConfig[task.status] || statusConfig['todo'];

  const handleComplete = async () => {
    if (!hasTimeTracked && task.status !== 'done') {
      const confirmed = window.confirm('No time tracked. Complete anyway?');
      if (!confirmed) return;
    }
    await onComplete(task.id);
  };

  // Generate light background color from skill color
  const getSkillBgStyle = (): React.CSSProperties => {
    if (!skill?.color) {
      return {};
    }
    const hex = skill.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return {
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
    };
  };

  const cardStyle = getSkillBgStyle();
  const hasCustomStyle = Object.keys(cardStyle).length > 0;

  return (
    <div 
      className={cn(
        "rounded-lg border-2 p-4 pb-5 w-[280px] h-[230px] flex-shrink-0 hover:shadow-md transition-shadow flex flex-col",
        !hasCustomStyle && "bg-white dark:bg-card border-gray-300 dark:border-gray-600"
      )}
      style={hasCustomStyle ? cardStyle : undefined}
    >
      {/* Task Title with Icon */}
      <div className="flex items-start gap-2 mb-3">
        <div className="w-5 h-5 mt-0.5 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-gray-400 dark:text-gray-500">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
            <path d="M7 8h10M7 12h10M7 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h3
          className="font-medium text-gray-900 dark:text-white text-sm cursor-pointer hover:text-blue-600 transition-colors line-clamp-2 flex-1"
          onClick={() => onEdit(task)}
        >
          {task.title}
        </h3>
      </div>

      {/* Skill/Project Tag */}
      {skill && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-red-500">★</span>
          <span className="text-xs text-gray-600 dark:text-gray-400">{skill.name}</span>
        </div>
      )}

      {/* Status Badge */}
      <div className="mb-2">
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium', status.color)}>
          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          {status.label}
        </span>
      </div>

      {/* Due Date */}
      {task.dueDate && (
        <div className={cn('flex items-center gap-1.5 text-xs mb-3', taskIsOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400')}>
          <Calendar className="w-3.5 h-3.5" />
          <span>{taskIsOverdue ? 'overdue!' : 'Due Today!'}</span>
        </div>
      )}

      {/* Spacer to push buttons to bottom */}
      <div className="flex-1" />

      {/* Mark as Completed Button */}
      <button
        onClick={handleComplete}
        className="w-full text-left text-xs text-gray-600 dark:text-gray-400 hover:text-green-600 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
      >
        {task.status === 'done' ? 'Restore task' : 'Mark as completed'}
      </button>

      {/* Start Button */}
      <button
        onClick={() => onStart(task.id, task.skillId)}
        className="w-full mt-2 flex items-center justify-center gap-2 text-xs text-white bg-blue-500 hover:bg-blue-600 py-2 px-3 rounded-lg transition-colors"
      >
        <Play className="w-3.5 h-3.5" />
        Start Session
      </button>
    </div>
  );
}

// ============================================
// TASK FORM DATA
// ============================================
interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  estimatedPomodoros: number;
  pomodoroSessions: number;
  totalMinutes: number;
}

const defaultTaskForm: TaskFormData = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
  estimatedPomodoros: 1,
  pomodoroSessions: 0,
  totalMinutes: 0,
};

// ============================================
// MAIN TASKS PAGE
// ============================================
export default function Tasks() {
  const navigate = useNavigate();
  const { skills, fetchSkills } = useSkillsStore();
  const { tasks, loading, fetchTasks, createTask, updateTask, updateTaskStatus, deleteTask } =
    useTasksStore();
  const { startTimer, todayMinutesBySkill, fetchTodayActivity, recordManualTime } = useTimerStore();
  const { profile } = useUserStore();

  // UI State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(defaultTaskForm);
  const [newTaskSkillId, setNewTaskSkillId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchSkills();
    fetchTasks();
    fetchTodayActivity();
  }, [fetchSkills, fetchTasks, fetchTodayActivity]);

  // Today's date string
  const todayStr = new Date().toISOString().split('T')[0];

  // Computed values
  const todayMinutesTotal = Object.values(todayMinutesBySkill).reduce((a, b) => a + b, 0);

  // Today's tasks (due today, overdue, or in-progress, NOT done)
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => {
          if (t.status === 'done') return false;
          if (t.status === 'in-progress') return true;
          if (t.dueDate) {
            const dueDate = formatDateForInput(t.dueDate);
            return dueDate === todayStr || dueDate < todayStr;
          }
          return false;
        })
        .sort((a, b) => {
          const order = { urgent: 0, high: 1, medium: 2, low: 3 };
          return (order[a.priority || 'medium'] || 2) - (order[b.priority || 'medium'] || 2);
        }),
    [tasks, todayStr]
  );

  // Completed tasks
  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === 'done'),
    [tasks]
  );

  // Handlers
  const getSkillById = (id: string) => skills.find((s) => s.id === id);

  const openCreateModal = () => {
    setEditingTask(null);
    setFormData({ ...defaultTaskForm, dueDate: todayStr });
    setNewTaskSkillId(skills[0]?.id || '');
    setShowTaskModal(true);
  };

  const openEditModal = (task: Task) => {
    const latestTask = tasks.find((t) => t.id === task.id) || task;
    setEditingTask(latestTask);
    setFormData({
      title: latestTask.title,
      description: latestTask.description || '',
      priority: latestTask.priority || 'medium',
      dueDate: formatDateForInput(latestTask.dueDate),
      estimatedPomodoros: latestTask.estimatedPomodoros || 1,
      pomodoroSessions: latestTask.pomodoroSessions || 0,
      totalMinutes: latestTask.totalMinutes || 0,
    });
    setNewTaskSkillId(latestTask.skillId);
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    if (!newTaskSkillId) {
      toast.error('Please select a skill');
      return;
    }

    setSaving(true);
    try {
      if (editingTask) {
        // Calculate the difference in minutes if user manually changed it
        const oldMinutes = editingTask.totalMinutes || 0;
        const newMinutes = formData.totalMinutes;
        const minutesDiff = newMinutes - oldMinutes;

        await updateTask({
          id: editingTask.id,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          estimatedPomodoros: formData.estimatedPomodoros,
          pomodoroSessions: formData.pomodoroSessions,
          totalMinutes: formData.totalMinutes,
          dueDate: formData.dueDate || undefined,
        });

        // If user manually added/removed time, record it as a timer session and update skill
        if (minutesDiff !== 0) {
          const { addMinutesToSkill } = useSkillsStore.getState();
          await addMinutesToSkill(editingTask.skillId, minutesDiff);
          // Record manual time as a timer session so it shows in Dashboard/Focus Today
          await recordManualTime(editingTask.skillId, editingTask.id, minutesDiff);
        }

        // Auto-complete: if totalMinutes >= estimatedPomodoros * pomodoroDuration, mark as done
        const pomodoroDuration = profile?.settings?.pomodoroDuration || 25;
        const estimatedMinutes = formData.estimatedPomodoros * pomodoroDuration;
        if (formData.totalMinutes >= estimatedMinutes && editingTask.status !== 'done') {
          await updateTaskStatus(editingTask.id, 'done');
          toast.success('Task auto-completed! 🎉');
        } else {
          toast.success('Task updated');
        }
      } else {
        await createTask({
          skillId: newTaskSkillId,
          ...formData,
          dueDate: formData.dueDate || undefined,
        });
        toast.success('Task created');
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setFormData(defaultTaskForm);
    } catch (error) {
      toast.error('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setSaving(true);
    try {
      await deleteTask(taskToDelete);
      toast.success('Task deleted');
      setShowDeleteDialog(false);
      setTaskToDelete(null);
    } catch (error) {
      toast.error('Failed to delete task');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      const newStatus = task.status === 'done' ? 'in-progress' : 'done';
      await updateTaskStatus(taskId, newStatus);
      toast.success(newStatus === 'done' ? 'Task completed! 🎉' : 'Task restored');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleStartTimer = async (taskId: string, skillId: string) => {
    try {
      await startTimer('pomodoro', taskId, skillId);
      navigate('/focus');
    } catch (error) {
      toast.error('Failed to start timer');
    }
  };

  return (
    <div className="h-full overflow-auto bg-gray-50 dark:bg-background">
      <div className="p-7 space-y-10">
        {/* ========== TOP BAR: KPIs ========== */}
        <div className="flex flex-wrap items-center gap-3">
          <KpiBadge
            icon={<Clock className="w-4 h-4" />}
            label="Focus Today"
            value={formatMinutes(todayMinutesTotal)}
            color="blue"
          />
          <KpiBadge
            icon={<Target className="w-4 h-4" />}
            label="Tasks Left"
            value={todayTasks.length}
            color="amber"
          />
          <KpiBadge
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Completed"
            value={completedTasks.length}
            color="purple"
          />
        </div>

        {/* ========== TODAY'S TASKS - Notion-style Container ========== */}
        <section className="bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden elevation-1">
          {/* Section Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-white">
              📋 Today's Tasks
            </h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={openCreateModal}
              className="text-gray-500 hover:text-blue-600 gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>

          {/* Horizontal Scrolling Cards */}
          <div className="p-4">
            {loading ? (
              <div className="flex gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 w-56 bg-black-100 dark:bg-white-800 rounded-lg animate-pulse flex-shrink-0" />
                ))}
              </div>
            ) : todayTasks.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 -mb-2">
                {todayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    skill={getSkillById(task.skillId)}
                    onEdit={openEditModal}
                    onComplete={handleCompleteTask}
                    onStart={handleStartTimer}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">All caught up! No tasks for today.</p>
              </div>
            )}
          </div>
        </section>

        {/* ========== COMPLETED TASKS ========== */}
        {completedTasks.length > 0 && (
          <section className="bg-white dark:bg-card rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden elevation-1">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                <CheckCircle2 className="w-4 h-4" />
                Completed ({completedTasks.length})
              </h2>
            </div>
            <div className="p-4 space-y-2">
              {completedTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 line-through flex-1">{task.title}</span>
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ========== TASK MODAL ========== */}
      <Modal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editingTask ? 'Edit Task' : 'New Task'}
        size="md"
      >
        <div className="space-y-5">
          {/* Skill Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Project / Skill
            </label>
            <select
              value={newTaskSkillId}
              onChange={(e) => setNewTaskSkillId(e.target.value)}
              disabled={!!editingTask}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Select a project...</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Task Title
            </label>
            <Input
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              placeholder="Add details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Priority & Sessions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Est. Sessions
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={formData.estimatedPomodoros}
                onChange={(e) =>
                  setFormData({ ...formData, estimatedPomodoros: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Due Date
            </label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          {/* Progress (Edit mode) */}
          {editingTask && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Progress Tracking
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Completed Sessions</label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.pomodoroSessions}
                    onChange={(e) =>
                      setFormData({ ...formData, pomodoroSessions: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Total Minutes</label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.totalMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, totalMinutes: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions (Edit mode) */}
          {editingTask && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartTimer(editingTask.id, editingTask.skillId)}
                className="gap-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                disabled={editingTask.status === 'done'}
              >
                <Play className="w-2 h-4" />
                Start Session
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowTaskModal(false);
                  setTaskToDelete(editingTask.id);
                  setShowDeleteDialog(true);
                }}
                className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <Button variant="ghost" onClick={() => setShowTaskModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveTask} disabled={saving} className="bg-blue-500 hover:bg-blue-600 px-6">
            {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </Modal>

      {/* ========== DELETE DIALOG ========== */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task?"
        description="This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        loading={saving}
      />
    </div>
  );
}
