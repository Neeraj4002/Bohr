import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSkillsStore } from '@/store/skillsStore';
import { useTasksStore } from '@/store/tasksStore';
import { useTimerStore } from '@/store/timerStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { SkeletonKanban } from '@/components/ui/skeleton';
import { Plus, Play, Trash2, Clock, Calendar, Flag, Pencil, Target } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

const PRIORITY_BG: Record<TaskPriority, string> = {
  low: 'bg-gray-100 dark:bg-gray-800',
  medium: 'bg-blue-100 dark:bg-blue-900/30',
  high: 'bg-orange-100 dark:bg-orange-900/30',
  urgent: 'bg-red-100 dark:bg-red-900/30',
};

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartTimer: (taskId: string, skillId: string) => void;
}

function TaskCard({ task, onEdit, onDelete, onStartTimer }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className={cn(
        "p-4 mb-3 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group",
        isOverdue && "border-red-300 dark:border-red-800"
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {task.priority && task.priority !== 'medium' && (
                <Flag className={cn("w-3 h-3", PRIORITY_COLORS[task.priority])} />
              )}
              <h3 className="font-semibold text-sm truncate">{task.title}</h3>
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.pomodoroSessions}/{task.estimatedPomodoros || 1}
              </span>
              {task.dueDate && (
                <span className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-red-500 font-medium"
                )}>
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(task);
              }}
              className="h-7 w-7 p-0"
            >
              <Pencil className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onStartTimer(task.id, task.skillId);
              }}
              className="h-7 w-7 p-0 text-green-600"
            >
              <Play className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  color: string;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartTimer: (taskId: string, skillId: string) => void;
}

function KanbanColumn({ title, status, tasks, color, onEdit, onDelete, onStartTimer }: KanbanColumnProps) {
  const taskIds = tasks.map(t => t.id);

  return (
    <div className="flex-1 min-w-[300px]">
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", color)} />
            <h3 className="font-semibold text-sm uppercase tracking-wide">
              {title}
            </h3>
          </div>
          <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2 min-h-[200px]">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
                onStartTimer={onStartTimer}
              />
            ))}
            {tasks.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No tasks
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  estimatedPomodoros: number;
}

const defaultTaskForm: TaskFormData = {
  title: '',
  description: '',
  priority: 'medium',
  dueDate: '',
  estimatedPomodoros: 1,
};

export default function Tasks() {
  const navigate = useNavigate();
  const { skills, activeSkill, fetchSkills } = useSkillsStore();
  const { tasks, loading, fetchTasks, createTask, updateTask, updateTaskStatus, deleteTask } = useTasksStore();
  const { startTimer } = useTimerStore();
  
  const [selectedSkillId, setSelectedSkillId] = useState<string>('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(defaultTaskForm);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  useEffect(() => {
    if (activeSkill && !selectedSkillId) {
      setSelectedSkillId(activeSkill.id);
    }
  }, [activeSkill, selectedSkillId]);

  useEffect(() => {
    if (selectedSkillId) {
      fetchTasks(selectedSkillId);
    }
  }, [selectedSkillId, fetchTasks]);

  const openCreateModal = () => {
    setEditingTask(null);
    setFormData(defaultTaskForm);
    setShowTaskModal(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate || '',
      estimatedPomodoros: task.estimatedPomodoros || 1,
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    if (!selectedSkillId) {
      toast.error('Please select a skill first');
      return;
    }

    setSaving(true);
    try {
      if (editingTask) {
        await updateTask({
          id: editingTask.id,
          ...formData,
          dueDate: formData.dueDate || undefined,
        });
        toast.success('Task updated');
      } else {
        await createTask({
          skillId: selectedSkillId,
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

  const confirmDelete = (id: string) => {
    setTaskToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleStartTimer = async (taskId: string, skillId: string) => {
    try {
      const skill = skills.find(s => s.id === skillId);
      await startTimer('pomodoro', taskId, skillId, skill?.name);
      navigate('/focus');
    } catch (error) {
      toast.error('Failed to start timer');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) {
      setActiveId(null);
      return;
    }

    // Determine target status from drop location
    const overId = over.id as string;
    let targetStatus: TaskStatus | null = null;

    // Check if dropped on a task or column
    const overTask = tasks.find(t => t.id === overId);
    if (overTask) {
      targetStatus = overTask.status;
    }

    if (targetStatus && activeTask.status !== targetStatus) {
      await updateTaskStatus(activeTask.id, targetStatus);
      toast.success(`Task moved to ${targetStatus.replace('-', ' ')}`);
    }

    setActiveId(null);
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const selectedSkill = skills.find(s => s.id === selectedSkillId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-2">
            Organize your work with Kanban boards
          </p>
        </div>
        <Button onClick={openCreateModal} disabled={!selectedSkillId}>
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Skill Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Target className="w-5 h-5 text-muted-foreground" />
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Select Skill</label>
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              <option value="">Choose a skill...</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name} ({Math.floor(skill.currentMinutes / 60)}h logged)
                </option>
              ))}
            </select>
          </div>
          {selectedSkill && (
            <div className="text-right">
              <div className="text-2xl font-bold">{tasks.length}</div>
              <div className="text-xs text-muted-foreground">Total Tasks</div>
            </div>
          )}
        </div>
      </Card>

      {/* Loading State */}
      {loading && <SkeletonKanban />}

      {/* Kanban Board */}
      {selectedSkillId && !loading ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            <KanbanColumn
              title="To Do"
              status="todo"
              color="bg-gray-400"
              tasks={todoTasks}
              onEdit={openEditModal}
              onDelete={confirmDelete}
              onStartTimer={handleStartTimer}
            />
            <KanbanColumn
              title="In Progress"
              status="in-progress"
              color="bg-blue-500"
              tasks={inProgressTasks}
              onEdit={openEditModal}
              onDelete={confirmDelete}
              onStartTimer={handleStartTimer}
            />
            <KanbanColumn
              title="Done"
              status="done"
              color="bg-green-500"
              tasks={doneTasks}
              onEdit={openEditModal}
              onDelete={confirmDelete}
              onStartTimer={handleStartTimer}
            />
          </div>
          <DragOverlay>
            {activeTask ? (
              <Card className="p-4 shadow-lg">
                <h3 className="font-semibold text-sm">{activeTask.title}</h3>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : !loading && (
        <Card className="border-dashed">
          <div className="flex flex-col items-center justify-center py-16">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Select a Skill</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Choose a skill above to view and manage its tasks
            </p>
          </div>
        </Card>
      )}

      {/* Task Modal */}
      <Modal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editingTask ? 'Edit Task' : 'Create Task'}
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title *</label>
            <Input
              placeholder="Task title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input
              placeholder="Optional description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Est. Pomodoros</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={formData.estimatedPomodoros}
                onChange={(e) => setFormData({ ...formData, estimatedPomodoros: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" onClick={() => setShowTaskModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveTask} disabled={saving}>
            {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task?"
        description="This action cannot be undone. The task and all its data will be permanently deleted."
        confirmText="Delete"
        variant="destructive"
        loading={saving}
      />
    </div>
  );
}
