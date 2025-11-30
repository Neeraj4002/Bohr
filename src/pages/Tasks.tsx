import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSkillsStore } from '@/store/skillsStore';
import { useTasksStore } from '@/store/tasksStore';
import { useTimerStore } from '@/store/timerStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Google Material Design colors
const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'text-gray-500',
  medium: 'text-gblue',
  high: 'text-gyellow-600',
  urgent: 'text-gred',
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
      <div className={cn(
        "elevation-1 hover:elevation-2 p-4 mb-3 rounded-xl transition-all cursor-grab active:cursor-grabbing group bg-white dark:bg-card",
        isDragging && "elevation-3 scale-105 rotate-1",
        isOverdue && "border-2 border-gred/50"
      )}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {task.priority && task.priority !== 'medium' && (
                <Flag className={cn("w-3 h-3", PRIORITY_COLORS[task.priority])} />
              )}
              <h3 className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">{task.title}</h3>
            </div>
            {task.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{task.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.pomodoroSessions}/{task.estimatedPomodoros || 1}
              </span>
              {task.dueDate && (
                <span className={cn(
                  "flex items-center gap-1",
                  isOverdue && "text-gred font-medium"
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
              className="h-7 w-7 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
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
              className="h-7 w-7 p-0 text-ggreen hover:text-ggreen hover:bg-ggreen/10"
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
              className="h-7 w-7 p-0 text-gred hover:text-gred hover:bg-gred/10"
            >
              <Trash2 className="w-3 h-3" />
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
  color: string;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartTimer: (taskId: string, skillId: string) => void;
}

function KanbanColumn({ title, status, tasks, color, onEdit, onDelete, onStartTimer }: KanbanColumnProps) {
  const taskIds = tasks.map(t => t.id);
  const isTodo = status === 'todo';
  
  // Make the column itself droppable
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
  });

  return (
    <div 
      className="flex-1 min-w-[280px]"
      data-status={status}
    >
      <div className={cn(
        "bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 elevation-1 transition-all duration-200",
        isOver && "ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", color)} />
            <h3 className={cn(
              "font-medium text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300",
              isTodo && "text-primary"
            )}>
              {title}
            </h3>
          </div>
          <span className={cn(
            "text-xs px-2.5 py-1 rounded-md font-medium",
            isTodo ? "bg-primary text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 elevation-1"
          )}>
            {tasks.length}
          </span>
        </div>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div 
            ref={setNodeRef}
            className={cn(
              "space-y-2 min-h-[200px] rounded-lg transition-colors",
              isOver && "bg-primary/5"
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
                "text-center py-8 text-gray-400 text-sm border-2 border-dashed rounded-xl transition-colors",
                isOver ? "border-primary bg-primary/10 text-primary" : "border-gray-200 dark:border-gray-700"
              )}>
                Drop tasks here
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
    <div className="h-full overflow-y-auto p-6">
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-gray-900 dark:text-white">Tasks</h1>
          <p className="text-gray-500 mt-1">
            Organize your work with Kanban boards
          </p>
        </div>
        <Button onClick={openCreateModal} disabled={!selectedSkillId} className="elevation-1 hover:elevation-2">
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Skill Selector */}
      <div className="elevation-1 rounded-xl p-5 bg-white dark:bg-card">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block text-gray-700 dark:text-gray-300">Select Skill</label>
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
              <div className="text-3xl font-bold text-primary">{tasks.length}</div>
              <div className="text-xs text-gray-500">Total Tasks</div>
            </div>
          )}
        </div>
      </div>

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
              color="bg-primary"
              tasks={todoTasks}
              onEdit={openEditModal}
              onDelete={confirmDelete}
              onStartTimer={handleStartTimer}
            />
            <KanbanColumn
              title="In Progress"
              status="in-progress"
              color="bg-gyellow"
              tasks={inProgressTasks}
              onEdit={openEditModal}
              onDelete={confirmDelete}
              onStartTimer={handleStartTimer}
            />
            <KanbanColumn
              title="Done"
              status="done"
              color="bg-ggreen"
              tasks={doneTasks}
              onEdit={openEditModal}
              onDelete={confirmDelete}
              onStartTimer={handleStartTimer}
            />
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="elevation-4 p-4 rounded-xl bg-white dark:bg-card rotate-2">
                <h3 className="font-medium text-sm text-gray-900 dark:text-white">{activeTask.title}</h3>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : !loading && (
        <div className="elevation-1 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-white dark:bg-card">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">Select a Skill</h3>
            <p className="text-gray-500 text-center max-w-sm">
              Choose a skill above to view and manage its tasks
            </p>
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
  );
}
