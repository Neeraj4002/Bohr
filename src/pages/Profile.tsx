import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSkillsStore } from '@/store/skillsStore';
import { useUserStore } from '@/store/userStore';
import Database from '@tauri-apps/plugin-sql';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Award, TrendingUp, Target, Calendar as CalendarIcon, Flame } from 'lucide-react';

let db: Database | null = null;

async function getDb() {
  if (!db) {
    db = await Database.load('sqlite:app.db');
  }
  return db;
}

interface DayActivity {
  date: string;
  minutes: number;
  level: number; // 0-4 for heatmap intensity
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked_at?: string;
}

export default function Profile() {
  const { skills } = useSkillsStore();
  const { profile, fetchProfile } = useUserStore();
  const [dailyActivities, setDailyActivities] = useState<DayActivity[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const database = await getDb();
      
      // Get last 365 days of activity for heatmap
      const activities = await database.select<any[]>(
        `SELECT date, SUM(minutes) as total_minutes 
         FROM daily_activities 
         WHERE date >= date('now', '-365 days')
         GROUP BY date
         ORDER BY date ASC`
      );

      // Calculate intensity levels
      const maxMinutes = Math.max(...activities.map(a => a.total_minutes), 1);
      const activitiesWithLevel: DayActivity[] = activities.map(a => ({
        date: a.date,
        minutes: a.total_minutes,
        level: Math.ceil((a.total_minutes / maxMinutes) * 4),
      }));

      setDailyActivities(activitiesWithLevel);

      // Get last 7 days for chart
      const weekly = await database.select<any[]>(
        `SELECT date, SUM(total_minutes) as minutes
         FROM daily_activities
         WHERE date >= date('now', '-7 days')
         GROUP BY date
         ORDER BY date ASC`
      );
      
      const weeklyFormatted = weekly.map(w => ({
        date: new Date(w.date).toLocaleDateString('en-US', { weekday: 'short' }),
        hours: (w.minutes / 60).toFixed(1),
        minutes: w.minutes,
      }));
      setWeeklyData(weeklyFormatted);

      // Get achievements
      const achievementsList = await database.select<Achievement[]>(
        'SELECT * FROM achievements ORDER BY unlocked_at DESC'
      );
      setAchievements(achievementsList);

      setLoading(false);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setLoading(false);
    }
  };

  const totalHours = skills.reduce((sum, skill) => sum + Math.floor(skill.currentMinutes / 60), 0);
  const activeStreak = profile?.currentStreak || 0;
  const longestStreak = profile?.longestStreak || 0;
  const unlockedAchievements = achievements.filter(a => a.unlocked_at).length;

  // Generate heatmap grid (last 52 weeks)
  const generateHeatmapData = () => {
    const weeks: DayActivity[][] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);

    let currentWeek: DayActivity[] = [];
    
    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const activity = dailyActivities.find(a => a.date === dateStr) || {
        date: dateStr,
        minutes: 0,
        level: 0,
      };

      currentWeek.push(activity);

      if (currentWeek.length === 7) {
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  };

  const heatmapWeeks = generateHeatmapData();

  const getLevelColor = (level: number) => {
    // Google Blue-based heatmap colors
    const colors = ['#ebedf0', '#c6e2ff', '#78b9ff', '#1A73E8', '#0d47a1'];
    return colors[level] || colors[0];
  };

  if (loading) {
    return <div className="text-center py-16 text-gray-500">Loading analytics...</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-6">
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-medium tracking-tight text-gray-900 dark:text-white">Profile & Analytics</h1>
        <p className="text-gray-500 mt-1">
          Track your progress and achievements
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="elevation-1 rounded-xl bg-white dark:bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalHours.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="elevation-1 rounded-xl bg-white dark:bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gyellow/10 rounded-xl flex items-center justify-center">
              <Flame className="w-6 h-6 text-gyellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeStreak} days</p>
            </div>
          </div>
        </div>

        <div className="elevation-1 rounded-xl bg-white dark:bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-ggreen/10 rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-ggreen" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Longest Streak</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{longestStreak} days</p>
            </div>
          </div>
        </div>

        <div className="elevation-1 rounded-xl bg-white dark:bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Achievements</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{unlockedAchievements}/{achievements.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Activity Chart */}
      <div className="elevation-1 rounded-xl bg-white dark:bg-card">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-900 dark:text-white">Last 7 Days Activity</h3>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: 'none', 
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }} 
              />
              <Bar dataKey="hours" fill="#1A73E8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="elevation-1 rounded-xl bg-white dark:bg-card">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="flex items-center gap-2 text-base font-medium text-gray-900 dark:text-white">
            <CalendarIcon className="w-5 h-5 text-primary" />
            365-Day Consistency Calendar
          </h3>
        </div>
        <div className="p-5">
          <div className="overflow-x-auto">
            <div className="inline-flex gap-1">
              {heatmapWeeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      className="w-3 h-3 rounded-sm cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      style={{ backgroundColor: getLevelColor(day.level) }}
                      title={`${day.date}: ${Math.floor(day.minutes / 60)}h ${day.minutes % 60}m`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: getLevelColor(level) }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Skills Progress */}
      <div className="elevation-1 rounded-xl bg-white dark:bg-card">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-900 dark:text-white">Skills Progress</h3>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            {skills.map((skill) => {
              const hours = Math.floor(skill.currentMinutes / 60);
              const percent = (hours / skill.goalHours) * 100;
              return (
                <div key={skill.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">{skill.name}</span>
                    <span className="text-sm text-gray-500">
                      {hours} / {skill.goalHours} hours ({percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(percent, 100)}%`,
                        backgroundColor: skill.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="elevation-1 rounded-xl bg-white dark:bg-card">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-base font-medium text-gray-900 dark:text-white">Achievements</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-xl text-center transition-all ${
                  achievement.unlocked_at
                    ? 'bg-primary text-white elevation-2'
                    : 'bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <div className="font-medium text-sm">{achievement.name}</div>
                <div className="text-xs mt-1 opacity-75">{achievement.description}</div>
                {achievement.unlocked_at && (
                  <div className="text-xs mt-2 opacity-75">
                    {new Date(achievement.unlocked_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
