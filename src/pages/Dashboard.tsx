import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Target, ChevronRight, Trophy, Flame, Play, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Modal } from '../components/ui/modal';
import { Input } from '../components/ui/input';
import { useSkillsStore } from '../store/skillsStore';
import { useTasksStore } from '../store/tasksStore';
import { useTimerStore } from '../store/timerStore';
import { cn } from '../lib/utils';

// Format minutes to human readable string
const formatHours = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Format percentage
const formatPercent = (current: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
};

// Get today's date string
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Generate last 365 days for consistency calendar
const generateYearDays = () => {
  const days = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push({
      date: date.toISOString().split('T')[0],
      dayOfWeek: date.getDay(),
    });
  }
  return days;
};

// Semicircle Progress Component
function SemicircleProgress({ 
  current, 
  total, 
  size = 140,
  strokeWidth = 15,
}: { 
  current: number; 
  total: number; 
  size?: number;
  strokeWidth?: number;
}) {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size / 2 + 16 }}>
      <svg width={size} height={size / 2 + strokeWidth} className="overflow-visible">
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="dark:stroke-gray-700"
        />
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="#1A73E8"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatHours(current)}</span>
        <span className="text-xs text-gray-500">of {formatHours(total)}</span>
      </div>
    </div>
  );
}

// GitHub-style Consistency Calendar
function ConsistencyCalendar({ activityData }: { activityData: Record<string, number> }) {
  const yearDays = useMemo(() => generateYearDays(), []);
  const weeks: typeof yearDays[] = [];
  
  let currentWeek: typeof yearDays = [];
  yearDays.forEach((day, index) => {
    currentWeek.push(day);
    if (day.dayOfWeek === 6 || index === yearDays.length - 1) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const getIntensity = (minutes: number) => {
    if (minutes === 0) return 0;
    if (minutes < 30) return 1;
    if (minutes < 60) return 2;
    if (minutes < 120) return 3;
    return 4;
  };

  const intensityColors = [
    'bg-gray-100 dark:bg-gray-800',
    'bg-green-200 dark:bg-green-900',
    'bg-green-300 dark:bg-green-700',
    'bg-green-500 dark:bg-green-500',
    'bg-green-600 dark:bg-green-400',
  ];

  return (
    <div className="flex gap-[2px] overflow-x-auto">
      {weeks.map((week, weekIndex) => (
        <div key={weekIndex} className="flex flex-col gap-[2px]">
          {week.map((day) => {
            const minutes = activityData[day.date] || 0;
            const intensity = getIntensity(minutes);
            return (
              <div
                key={day.date}
                className={cn("w-[10px] h-[10px] rounded-[2px]", intensityColors[intensity])}
                title={`${day.date}: ${formatHours(minutes)}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { skills, fetchSkills, createSkill } = useSkillsStore();
  const { tasks, fetchTasks } = useTasksStore();
  const { settings, startTimer, fetchTodayActivity, fetchYearlyActivity, todayMinutesBySkill, dailyActivity } = useTimerStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillGoalHours, setNewSkillGoalHours] = useState('10000');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchSkills(), 
        fetchTasks(),
        fetchTodayActivity(),
        fetchYearlyActivity()
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchSkills, fetchTasks, fetchTodayActivity, fetchYearlyActivity]);
  
  const todayTasks = useMemo(() => {
    const today = getTodayString();
    return tasks.filter(t => 
      t.status !== 'done' && 
      (!t.dueDate || t.dueDate.startsWith(today) || new Date(t.dueDate) <= new Date())
    ).slice(0, 5);
  }, [tasks]);
  
  // Calculate today's total minutes from actual timer sessions
  const totalTodayMinutes = useMemo(() => {
    return Object.values(todayMinutesBySkill).reduce((sum, mins) => sum + mins, 0);
  }, [todayMinutesBySkill]);
  
  const totalDailyGoal = useMemo(() => 
    skills.reduce((sum, s) => sum + (s.dailyGoalMinutes || 60), 0), [skills]);

  // Use actual activity data for consistency calendar
  const activityData = useMemo(() => dailyActivity, [dailyActivity]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      if (activityData[date.toISOString().split('T')[0]] > 0) streak++;
      else if (i > 0) break;
    }
    return streak;
  }, [activityData]);

  const handleCreateSkill = async () => {
    if (!newSkillName.trim()) return;
    await createSkill({ name: newSkillName, goalHours: parseInt(newSkillGoalHours) || 10000 });
    setNewSkillName('');
    setNewSkillGoalHours('10000');
    setShowCreateModal(false);
  };

  const handleStartTask = (taskId: string, skillId: string) => {
    startTimer('pomodoro', taskId, skillId);
    navigate('/focus');
  };

  const currentHour = new Date().getHours();

  return (
    <div className="p-4 space-y-3 h-full overflow-auto">
      {/* Row 1: Quick Stats + Achievements - Thin bar */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-8 elevation-1 rounded-lg bg-white dark:bg-card px-4 py-2 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs text-gray-500">Skills</span>
            <span className="text-sm font-bold">{skills.length}</span>
          </div>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500">Pending</span>
            <span className="text-sm font-bold">{tasks.filter(t => t.status !== 'done').length}</span>
          </div>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500">Streak</span>
            <span className="text-sm font-bold">{currentStreak}d</span>
          </div>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Focus</span>
            <span className="text-sm font-bold">{settings.pomodoroDuration}m</span>
          </div>
        </div>
        <div className="col-span-4 elevation-1 rounded-lg bg-white dark:bg-card px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-gray-500">Achievements</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold">3/15</span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Row 2: Progress + Tasks */}
      <div className="grid grid-cols-12 gap-4 h-[350px]">
        {/* Today's Progress */}
        <div className="col-span-7 elevation-1 rounded-xl bg-white dark:bg-card p-6 h-full flex flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-m font">Today's Progress</h2>
            <span className="text-sm text-gray-500">{formatPercent(totalTodayMinutes, totalDailyGoal)}%</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <SemicircleProgress current={totalTodayMinutes} total={totalDailyGoal} size={250} />
          </div>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-gray-500">{formatPercent(totalTodayMinutes, totalDailyGoal)}% complete</span>
            <button 
              onClick={() => navigate('/focus')} 
              className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg"
            >
              <Play className="w-6 h-6 ml-0.5" />
            </button>
            <span className="text-sm text-gray-500">{formatHours(Math.max(0, totalDailyGoal - totalTodayMinutes))} left</span>
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="col-span-5 elevation-1 rounded-xl bg-white dark:bg-card p-4 h-full">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-m font">Today's Tasks</h2>
            <button onClick={() => navigate('/tasks')} className="text-xs text-primary">View All →</button>
          </div>
          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {todayTasks.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-gray-500 mb-2">No tasks for today</p>
                <Button onClick={() => navigate('/tasks')} variant="ghost" size="sm">
                  <Plus className="w-3 h-3 mr-1" />Add Task
                </Button>
              </div>
            ) : (
              todayTasks.map((task, index) => {
                const skill = skills.find(s => s.id === task.skillId);
                const estimatedMinutes = (task.estimatedPomodoros || 1) * settings.pomodoroDuration;
                const scheduledHour = currentHour + index;
                const scheduleLabel = scheduledHour >= 24 ? `${scheduledHour - 24}:00` : scheduledHour === 12 ? '12:00 PM' : scheduledHour < 12 ? `${scheduledHour}:00 AM` : `${scheduledHour - 12}:00 PM`;
                
                return (
                  <div key={task.id} className={cn("flex items-center gap-2 p-2 rounded-lg group", index === 0 ? "bg-primary/5" : "hover:bg-gray-50 dark:hover:bg-gray-800/50")}>
                    <span className="text-xs text-gray-400 w-16">{scheduleLabel}</span>
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: skill?.color || '#1A73E8' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-gray-500">{skill?.name} • {formatHours(estimatedMinutes)}</p>
                    </div>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded", task.priority === 'high' || task.priority === 'urgent' ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500")}>{task.priority}</span>
                    <button onClick={() => handleStartTask(task.id, task.skillId)} className="p-1 rounded-full bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Skills */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-m  flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />Your Skills
          </h2>
          <Button onClick={() => setShowCreateModal(true)} variant="default" size="sm" className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" />Add Skill
          </Button>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="elevation-1 rounded-lg bg-white dark:bg-card p-3 animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-1.5 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : skills.length === 0 ? (
          <div className="elevation-1 rounded-lg bg-white dark:bg-card p-4 text-center">
            <p className="text-xs text-gray-500 mb-2">No skills yet</p>
            <Button onClick={() => setShowCreateModal(true)} variant="default" size="sm">
              <Plus className="w-3 h-3 mr-1" />Add Skill
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {skills.slice(0, 4).map(skill => {
              // Use today's actual minutes from timer sessions
              const todayMins = todayMinutesBySkill[skill.id] || 0;
              const dailyGoal = skill.dailyGoalMinutes || 60;
              const progress = formatPercent(todayMins, dailyGoal);
              return (
                <div key={skill.id} onClick={() => navigate('/skills')} className="elevation-1 rounded-lg bg-white dark:bg-card p-3 cursor-pointer hover:elevation-2 transition-all">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded flex items-center justify-center text-sm" style={{ backgroundColor: `${skill.color}20` }}>🎯</div>
                    <span className="text-sm font-medium truncate flex-1">{skill.name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Today: {formatHours(todayMins)} / {formatHours(dailyGoal)}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, progress)}%`, backgroundColor: skill.color }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: skill.color }}>{progress}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Row 4: Consistency Calendar */}
      <div className="elevation-1 rounded-xl bg-white dark:bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Flame className="w-4 h-4 text-green-500" />Consistency
          </h2>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{currentStreak} day streak</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <div className="flex gap-[2px]">
                <div className="w-2 h-2 rounded-sm bg-gray-100 dark:bg-gray-800" />
                <div className="w-2 h-2 rounded-sm bg-green-200" />
                <div className="w-2 h-2 rounded-sm bg-green-300" />
                <div className="w-2 h-2 rounded-sm bg-green-500" />
                <div className="w-2 h-2 rounded-sm bg-green-600" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
        <ConsistencyCalendar activityData={activityData} />
      </div>

      {/* Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Add New Skill">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Skill Name</label>
            <Input value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} placeholder="e.g., Piano, Programming" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Goal (hours)</label>
            <Input type="number" value={newSkillGoalHours} onChange={(e) => setNewSkillGoalHours(e.target.value)} placeholder="10000" min="1" />
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)} className="flex-1">Cancel</Button>
            <Button variant="default" onClick={handleCreateSkill} className="flex-1" disabled={!newSkillName.trim()}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
