import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSkillsStore } from '@/store/skillsStore';
import { useTasksStore } from '@/store/tasksStore';
import { useTimerStore } from '@/store/timerStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { SkeletonKanban } from '@/components/ui/skeleton';
import { Plus, Play, Trash2, Clock, ChevronDown, CheckCircle2 } from 'lucide-react';
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

// ============================================
// MATERIAL DESIGN TASK CARD
// ============================================
interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartTimer: (taskId: string, skillId: string) => void;
}

function TaskCard({ task, onEdit, onDelete: _onDelete, onStartTimer: _onStartTimer }: TaskCardProps) {
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
  };

  const isCompleted = task.status === 'done';
  const progress = task.pomodoroSessions || 0;
  const estimated = task.estimatedPomodoros || 1;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div 
        className={cn(
          // Base card styling - Material Design Elevation 1
          "bg-white dark:bg-gray-900 rounded-lg p-4 mb-3 cursor-grab active:cursor-grabbing",
          "shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]",
          "transition-all duration-200 ease-out",
          // Hover state - increased elevation
          "hover:shadow-[0_3px_6px_rgba(0,0,0,0.16),0_3px_6px_rgba(0,0,0,0.23)]",
          // Dragging state - Elevation 6
          isDragging && "shadow-[0_10px_20px_rgba(0,0,0,0.19),0_6px_6px_rgba(0,0,0,0.23)] scale-[1.02] rotate-[1deg] z-50 opacity-95",
          // Completed state
          isCompleted && "opacity-70"
        )}
        onClick={(e) => {
          // Only open edit modal if not dragging
          if (!isDragging) {
            e.stopPropagation();
            onEdit(task);
          }
        }}
      >
        {/* Task Title */}
        <h4 className={cn(
          "font-medium text-[15px] text-[#202124] dark:text-gray-100 leading-snug mb-1",
          isCompleted && "line-through text-gray-500 dark:text-gray-500"
        )}>
          {task.title}
        </h4>

        {/* Task Description */}
        {task.description && (
          <p className="text-[13px] text-[#5f6368] dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Bottom row: Progress + Due Date */}
        <div className="flex items-center justify-between mt-2">
          {/* Progress indicator */}
          <div className="flex items-center gap-1.5 text-[12px] text-[#5f6368] dark:text-gray-400">
            {isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-[#34A853]" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
            <span className={cn(isCompleted && "text-[#34A853] font-medium")}>
              {progress}/{estimated}
            </span>
          </div>

          {/* Due date if exists */}
          {task.dueDate && (
            <span className={cn(
              "text-[11px] px-2 py-0.5 rounded-full",
              new Date(task.dueDate) < new Date() && !isCompleted
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : "bg-gray-100 text-[#5f6368] dark:bg-gray-800 dark:text-gray-400"
            )}>
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MATERIAL DESIGN KANBAN COLUMN
// ============================================
interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartTimer: (taskId: string, skillId: string) => void;
  isLast?: boolean;
}

function KanbanColumn({ title, status, tasks, onEdit, onDelete, onStartTimer, isLast }: KanbanColumnProps) {
  const taskIds = tasks.map(t => t.id);
  
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
  });

  return (
    <div className={cn(
      "flex-1 min-w-[280px] max-w-[360px] flex flex-col",
      !isLast && "border-r border-[#E0E0E0] dark:border-gray-800"
    )}>
      {/* Column Header */}
      <div className="px-4 py-3 flex items-center gap-2">
        <h3 className="font-medium text-[14px] text-[#202124] dark:text-gray-200 uppercase tracking-wide">
          {title}
        </h3>
        <span className="bg-[#E8EAED] dark:bg-gray-700 text-[#5f6368] dark:text-gray-300 text-[12px] font-medium px-2 py-0.5 rounded-full min-w-[24px] text-center">
          {tasks.length}
        </span>
      </div>

      {/* Column Content */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div 
          ref={setNodeRef}
          className={cn(
            "flex-1 px-3 pb-4 transition-colors duration-200 rounded-lg mx-1 min-h-[400px]",
            isOver && "bg-[#E8F0FE] dark:bg-blue-900/20 ring-2 ring-[#1A73E8] ring-inset"
          )}
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
          
          {/* Empty state */}
          {tasks.length === 0 && (
            <div className={cn(
              "py-8 text-center transition-all duration-200",
              isOver ? "opacity-0" : "opacity-100"
            )}>
              <p className="text-[13px] text-[#9AA0A6] dark:text-gray-500">
                {status === 'todo' && 'No tasks to do'}
                {status === 'in-progress' && 'Nothing in progress'}
                {status === 'done' && 'No completed tasks'}
              </p>
            </div>
          )}
        </div>
      </SortableContext>
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
// MAIN TASKS PAGE COMPONENT
// ============================================
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
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowSkillDropdown(false);
    if (showSkillDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSkillDropdown]);

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
    <div className="h-full flex flex-col bg-white dark:bg-gray-950">
      {/* ========== HEADER AREA ========== */}
      <div className="px-6 pt-6 pb-4 border-b border-[#E0E0E0] dark:border-gray-800">
        {/* Title */}
        <h1 className="text-[28px] font-bold text-[#202124] dark:text-white tracking-tight mb-4">
          Tasks
        </h1>

        {/* Skill Selector Chip */}
        <div className="relative inline-block">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSkillDropdown(!showSkillDropdown);
            }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-[14px] font-medium transition-all",
              "bg-[#F1F3F4] dark:bg-gray-800 hover:bg-[#E8EAED] dark:hover:bg-gray-700",
              "text-[#3C4043] dark:text-gray-300",
              "border border-transparent hover:border-[#DADCE0] dark:hover:border-gray-600"
            )}
          >
            {selectedSkill ? (
              <>
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: selectedSkill.color }}
                />
                {selectedSkill.name}
              </>
            ) : (
              'Select Skill'
            )}
            <ChevronDown className="w-4 h-4 text-[#5f6368]" />
          </button>

          {/* Dropdown Menu */}
          {showSkillDropdown && (
            <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-900 rounded-lg shadow-[0_4px_6px_rgba(0,0,0,0.1),0_1px_3px_rgba(0,0,0,0.08)] border border-[#DADCE0] dark:border-gray-700 py-1 z-50">
              {skills.length === 0 ? (
                <p className="px-4 py-3 text-[13px] text-[#5f6368]">No skills found</p>
              ) : (
                skills.map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => {
                      setSelectedSkillId(skill.id);
                      setShowSkillDropdown(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left text-[14px] transition-colors",
                      "hover:bg-[#F1F3F4] dark:hover:bg-gray-800",
                      selectedSkillId === skill.id && "bg-[#E8F0FE] dark:bg-blue-900/30"
                    )}
                  >
                    <span 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: skill.color }}
                    />
                    <span className="text-[#202124] dark:text-gray-200 truncate">{skill.name}</span>
                    {selectedSkillId === skill.id && (
                      <CheckCircle2 className="w-4 h-4 text-[#1A73E8] ml-auto flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========== MAIN KANBAN BOARD ========== */}
      <div className="flex-1 overflow-hidden">
        {loading && <SkeletonKanban />}

        {selectedSkillId && !loading ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full overflow-x-auto">
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
                isLast
              />
            </div>

            {/* Drag Overlay - The "lifted" card */}
            <DragOverlay>
              {activeTask ? (
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-[0_10px_20px_rgba(0,0,0,0.19),0_6px_6px_rgba(0,0,0,0.23)] rotate-[2deg] scale-105">
                  <h4 className="font-medium text-[15px] text-[#202124] dark:text-gray-100">
                    {activeTask.title}
                  </h4>
                  {activeTask.description && (
                    <p className="text-[13px] text-[#5f6368] dark:text-gray-400 line-clamp-1 mt-1">
                      {activeTask.description}
                    </p>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : !loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-[#F1F3F4] dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-[#5f6368]" />
              </div>
              <h3 className="text-[18px] font-medium text-[#202124] dark:text-white mb-2">
                Select a skill to view tasks
              </h3>
              <p className="text-[14px] text-[#5f6368] max-w-sm">
                Choose a skill from the dropdown above to see and manage its tasks
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========== FLOATING ACTION BUTTON (FAB) ========== */}
      {selectedSkillId && (
        <button
          onClick={openCreateModal}
          className={cn(
            "fixed bottom-6 right-6 w-14 h-14 rounded-full",
            "bg-[#1A73E8] hover:bg-[#1765CC] active:bg-[#1557B0]",
            "shadow-[0_3px_5px_-1px_rgba(0,0,0,0.2),0_6px_10px_0_rgba(0,0,0,0.14),0_1px_18px_0_rgba(0,0,0,0.12)]",
            "hover:shadow-[0_5px_5px_-3px_rgba(0,0,0,0.2),0_8px_10px_1px_rgba(0,0,0,0.14),0_3px_14px_2px_rgba(0,0,0,0.12)]",
            "flex items-center justify-center transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:ring-offset-2"
          )}
          title="Add Task"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      )}

      {/* ========== TASK DETAIL MODAL ========== */}
      <Modal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editingTask ? 'Edit Task' : 'New Task'}
        size="md"
      >
        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-[12px] font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">
              Title
            </label>
            <Input
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="text-[15px]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">
              Description
            </label>
            <textarea
              placeholder="Add details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A73E8] focus:border-transparent resize-none"
            />
          </div>

          {/* Priority & Estimated Pomodoros */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                className="w-full px-3 py-2 text-[14px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A73E8]"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">
                Est. Pomodoros
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={formData.estimatedPomodoros}
                onChange={(e) => setFormData({ ...formData, estimatedPomodoros: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-[12px] font-medium text-[#5f6368] uppercase tracking-wide mb-1.5">
              Due Date
            </label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          {/* Manual Time Adjustment (Edit mode only) */}
          {editingTask && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-[12px] font-medium text-[#5f6368] uppercase tracking-wide mb-3">
                Progress Tracking
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] text-[#5f6368] mb-1.5">
                    Completed Sessions
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.pomodoroSessions}
                    onChange={(e) => setFormData({ ...formData, pomodoroSessions: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-[#5f6368] mb-1.5">
                    Total Minutes
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.totalMinutes}
                    onChange={(e) => setFormData({ ...formData, totalMinutes: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Actions in Edit Mode */}
          {editingTask && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStartTimer(editingTask.id, editingTask.skillId)}
                className="gap-2 text-[#34A853] border-[#34A853] hover:bg-[#34A853]/10"
                disabled={editingTask.status === 'done'}
              >
                <Play className="w-4 h-4" />
                Start Timer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowTaskModal(false);
                  confirmDelete(editingTask.id);
                }}
                className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button 
            variant="ghost" 
            onClick={() => setShowTaskModal(false)}
            className="text-[#5f6368] hover:bg-[#F1F3F4]"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveTask} 
            disabled={saving}
            className="bg-[#1A73E8] hover:bg-[#1765CC] text-white px-6"
          >
            {saving ? 'Saving...' : editingTask ? 'Save' : 'Create'}
          </Button>
        </div>
      </Modal>

      {/* ========== DELETE CONFIRMATION ========== */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteTask}
        title="Delete Task?"
        description="This action cannot be undone. The task will be permanently deleted."
        confirmText="Delete"
        variant="destructive"
        loading={saving}
      />
    </div>
  );
}
