import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSkillsStore } from '@/store/skillsStore';
import { useTasksStore } from '@/store/tasksStore';
import { useTimerStore } from '@/store/timerStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { SkeletonKanban } from '@/components/ui/skeleton';
import { Plus, Play, Trash2, Clock, Calendar, Pencil, Target, Filter, CheckCircle2, Circle, AlertCircle, Zap, ArrowRight } from 'lucide-react';
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
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Google Material Design colors and priority configurations
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-slate-500',
  medium: 'text-blue-600',
  high: 'text-amber-600',
  urgent: 'text-red-600',
};



const PRIORITY_ICONS: Record<TaskPriority, typeof Circle> = {
  low: Circle,
  medium: AlertCircle,
  high: Zap,
  urgent: AlertCircle,
};

const STATUS_ICONS: Record<TaskStatus, typeof Circle> = {
  'todo': Circle,
  'in-progress': Clock,
  'done': CheckCircle2,
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  'todo': 'text-slate-500',
  'in-progress': 'text-blue-500',
  'done': 'text-green-500',
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
  const progress = (task.pomodoroSessions / (task.estimatedPomodoros || 1)) * 100;
  const PriorityIcon = PRIORITY_ICONS[task.priority || 'medium'];

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className={cn(
        "relative bg-white dark:bg-card rounded-2xl border border-gray-100 dark:border-gray-800 p-5 mb-4 transition-all duration-200 cursor-grab active:cursor-grabbing group hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-700",
        isDragging && "shadow-2xl scale-105 rotate-1 z-50",
        isOverdue && "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20",
        task.status === 'done' && "opacity-75"
      )}>
        {/* Priority indicator bar */}
        <div 
          className={cn(
            "absolute top-0 left-0 w-full h-1 rounded-t-2xl",
            task.priority === 'urgent' && "bg-red-500",
            task.priority === 'high' && "bg-amber-500",
            task.priority === 'medium' && "bg-blue-500",
            task.priority === 'low' && "bg-slate-400"
          )}
        />

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0 mt-0.5">
                <PriorityIcon className={cn("w-4 h-4", PRIORITY_COLORS[task.priority || 'medium'])} />
              </div>
              <div className="flex-1">
                <h3 className={cn(
                  "font-medium text-base leading-tight mb-1",
                  task.status === 'done' ? "line-through text-gray-500" : "text-gray-900 dark:text-gray-100"
                )}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {task.description}
                  </p>
                )}
              </div>
            </div>

            {/* Progress section */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400 font-medium">
                  Progress: {task.pomodoroSessions}/{task.estimatedPomodoros || 1} sessions
                </span>
                <span className="text-gray-500 text-xs">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    task.status === 'done' ? "bg-green-500" : "bg-blue-500"
                  )}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {/* Meta information */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              {task.dueDate && (
                <span className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md font-medium",
                  isOverdue 
                    ? "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30" 
                    : "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800"
                )}>
                  <Calendar className="w-3 h-3" />
                  {formatDate(task.dueDate)}
                </span>
              )}
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-medium">
                <Clock className="w-3 h-3" />
                {Math.round((task.totalMinutes || 0) / 60)}h total
              </span>
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Edit task"
              >
                <Pencil className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartTimer(task.id, task.skillId);
                }}
                className="h-8 w-8 p-0 rounded-full text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                title="Start focus session"
                disabled={task.status === 'done'}
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartTimer: (taskId: string, skillId: string) => void;
}

function KanbanColumn({ title, status, tasks, onEdit, onDelete, onStartTimer }: KanbanColumnProps) {
  const taskIds = tasks.map(t => t.id);
  const isTodo = status === 'todo';
  const isInProgress = status === 'in-progress';
  const isDone = status === 'done';
  
  // Make the column itself droppable
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
  });

  const StatusIcon = STATUS_ICONS[status];

  return (
    <div 
      className="flex-1 min-w-[320px] max-w-[400px]"
      data-status={status}
    >
      <div className={cn(
        "bg-gray-50/80 dark:bg-gray-900/50 rounded-3xl p-6 transition-all duration-300 border border-gray-100 dark:border-gray-800",
        isOver && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900 bg-blue-50/50 dark:bg-blue-950/20"
      )}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center",
              isTodo && "bg-slate-100 dark:bg-slate-800",
              isInProgress && "bg-blue-100 dark:bg-blue-900",
              isDone && "bg-green-100 dark:bg-green-900"
            )}>
              <StatusIcon className={cn(
                "w-5 h-5",
                STATUS_COLORS[status]
              )} />
            </div>
            <div>
              <h3 className={cn(
                "font-semibold text-lg tracking-tight",
                isTodo && "text-slate-700 dark:text-slate-300",
                isInProgress && "text-blue-700 dark:text-blue-300", 
                isDone && "text-green-700 dark:text-green-300"
              )}>
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {status === 'todo' && 'Ready to start'}
                {status === 'in-progress' && 'Currently working'}
                {status === 'done' && 'Completed tasks'}
              </p>
            </div>
          </div>
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-xl font-bold text-sm",
            isTodo && "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
            isInProgress && "bg-blue-200 text-blue-700 dark:bg-blue-700 dark:text-blue-300",
            isDone && "bg-green-200 text-green-700 dark:bg-green-700 dark:text-green-300"
          )}>
            {tasks.length}
          </div>
        </div>
        
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div 
            ref={setNodeRef}
            className={cn(
              "space-y-3 min-h-[300px] rounded-2xl transition-colors p-2",
              isOver && "bg-blue-50/50 dark:bg-blue-950/20"
            )}
            data-droppable-status={status}
          >
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
              <div className={cn(
                "text-center py-12 text-gray-400 border-2 border-dashed rounded-2xl transition-all duration-200 bg-white/50 dark:bg-gray-800/50",
                isOver ? "border-blue-300 bg-blue-50 dark:bg-blue-950/30 text-blue-500" : "border-gray-200 dark:border-gray-700"
              )}>
                <div className={cn(
                  "w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-3",
                  isOver ? "bg-blue-100 dark:bg-blue-900" : "bg-gray-100 dark:bg-gray-800"
                )}>
                  <StatusIcon className={cn(
                    "w-8 h-8",
                    isOver ? "text-blue-500" : "text-gray-400"
                  )} />
                </div>
                <p className="text-sm font-medium">
                  {isOver ? "Drop task here" : "No tasks yet"}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {status === 'todo' && 'Add new tasks to get started'}
                  {status === 'in-progress' && 'Move tasks here when working'}
                  {status === 'done' && 'Completed tasks will appear here'}
                </p>
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
      pomodoroSessions: task.pomodoroSessions || 0,
      totalMinutes: task.totalMinutes || 0,
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
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          estimatedPomodoros: formData.estimatedPomodoros,
          pomodoroSessions: formData.pomodoroSessions,
          totalMinutes: formData.totalMinutes,
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
      await startTimer('pomodoro', taskId, skillId);
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
    
    setActiveId(null);
    
    if (!over) {
      return;
    }

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) {
      return;
    }

    // Determine target status from drop location
    const overId = over.id as string;
    let targetStatus: TaskStatus | null = null;

    // Check if dropped on a column (useDroppable id is 'column-{status}')
    if (overId.startsWith('column-')) {
      const status = overId.replace('column-', '');
      if (['todo', 'in-progress', 'done'].includes(status)) {
        targetStatus = status as TaskStatus;
      }
    }
    
    // Check if dropped on a task - get that task's status
    if (!targetStatus) {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    // Also check the over.data for column status (from useDroppable data)
    if (!targetStatus && over.data?.current?.status) {
      const status = over.data.current.status;
      if (['todo', 'in-progress', 'done'].includes(status)) {
        targetStatus = status as TaskStatus;
      }
    }

    if (targetStatus && activeTask.status !== targetStatus) {
      try {
        await updateTaskStatus(activeTask.id, targetStatus);
        toast.success(`Task moved to ${targetStatus === 'in-progress' ? 'In Progress' : targetStatus === 'todo' ? 'To Do' : 'Done'}`);
      } catch (error) {
        toast.error('Failed to move task');
      }
    }
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const selectedSkill = skills.find(s => s.id === selectedSkillId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Task Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Organize and track your progress with intelligent Kanban boards
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2 rounded-xl border-gray-200 hover:bg-gray-50"
                >
                  <Filter className="w-4 h-4" />
                  Filter
                </Button>
                <Button 
                  onClick={openCreateModal} 
                  disabled={!selectedSkillId}
                  className="gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl px-6 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Add Task
                </Button>
              </div>
            </div>

            {/* Skill Selector Card */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-2">
                    Active Skill Context
                  </label>
                  <select
                    value={selectedSkillId}
                    onChange={(e) => setSelectedSkillId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-100 font-medium"
                  >
                    <option value="">Select a skill to manage tasks...</option>
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name} • {Math.floor(skill.currentMinutes / 60)}h logged • {tasks.filter(t => t.skillId === skill.id).length} tasks
                      </option>
                    ))}
                  </select>
                </div>
                {selectedSkill && (
                  <div className="text-right">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-blue-600">{tasks.length}</span>
                      <span className="text-sm text-gray-500">tasks</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {tasks.filter(t => t.status === 'done').length} completed
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && <SkeletonKanban />}

          {/* Kanban Board */}
          {selectedSkillId && !loading ? (
            <div className="space-y-6">
              {/* Board Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Circle className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{todoTasks.length}</div>
                      <div className="text-sm text-gray-500">To Do</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{inProgressTasks.length}</div>
                      <div className="text-sm text-gray-500">In Progress</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{doneTasks.length}</div>
                      <div className="text-sm text-gray-500">Completed</div>
                    </div>
                  </div>
                </div>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex gap-6 overflow-x-auto pb-6">
                  <KanbanColumn
                    title="To Do"
                    status="todo"
                    tasks={todoTasks}
                    onEdit={openEditModal}
                    onDelete={confirmDelete}
                    onStartTimer={handleStartTimer}
                  />
                  <KanbanColumn
                    title="In Progress"
                    status="in-progress"
                    tasks={inProgressTasks}
                    onEdit={openEditModal}
                    onDelete={confirmDelete}
                    onStartTimer={handleStartTimer}
                  />
                  <KanbanColumn
                    title="Done"
                    status="done"
                    tasks={doneTasks}
                    onEdit={openEditModal}
                    onDelete={confirmDelete}
                    onStartTimer={handleStartTimer}
                  />
                </div>
                <DragOverlay>
                  {activeTask ? (
                    <div className="shadow-2xl p-5 rounded-2xl bg-white dark:bg-card border border-gray-200 dark:border-gray-700 rotate-2 scale-105">
                      <h3 className="font-medium text-base text-gray-900 dark:text-white">{activeTask.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">Moving task...</p>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          ) : !loading && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-16">
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Select a Skill to Begin</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                  Choose a skill from the dropdown above to view and manage its tasks in our intelligent Kanban board.
                </p>
                <Button 
                  className="mt-6 gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl"
                  onClick={() => {
                    // Focus the select element
                    const select = document.querySelector('select');
                    select?.focus();
                  }}
                >
                  <ArrowRight className="w-4 h-4" />
                  Get Started
                </Button>
              </div>
            </div>
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

          {editingTask && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Completed Pomodoros
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.pomodoroSessions}
                  onChange={(e) => setFormData({ ...formData, pomodoroSessions: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500">Sessions completed for this task</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-green-500" />
                  Total Time (minutes)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={formData.totalMinutes}
                  onChange={(e) => setFormData({ ...formData, totalMinutes: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-gray-500">Manually adjust time spent</p>
              </div>
            </div>
          )}
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
      </div>
    </div>
  );
}
