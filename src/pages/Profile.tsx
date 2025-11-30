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
    const colors = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
    return colors[level] || colors[0];
  };

  if (loading) {
    return <div className="text-center py-16">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Profile & Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track your progress and achievements
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{totalHours.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Flame className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">{activeStreak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Longest Streak</p>
                <p className="text-2xl font-bold">{longestStreak} days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Achievements</p>
                <p className="text-2xl font-bold">{unlockedAchievements}/{achievements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Last 7 Days Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="hours" fill="#000000" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            365-Day Consistency Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="inline-flex gap-1">
              {heatmapWeeks.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      className="w-3 h-3 rounded-sm cursor-pointer hover:ring-2 hover:ring-black transition-all"
                      style={{ backgroundColor: getLevelColor(day.level) }}
                      title={`${day.date}: ${Math.floor(day.minutes / 60)}h ${day.minutes % 60}m`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
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
        </CardContent>
      </Card>

      {/* Skills Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Skills Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {skills.map((skill) => {
              const hours = Math.floor(skill.currentMinutes / 60);
              const percent = (hours / skill.goalHours) * 100;
              return (
                <div key={skill.id}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{skill.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {hours} / {skill.goalHours} hours ({percent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
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
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border-2 text-center ${
                  achievement.unlocked_at
                    ? 'border-black bg-black text-white'
                    : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <div className="font-semibold text-sm">{achievement.name}</div>
                <div className="text-xs mt-1 opacity-75">{achievement.description}</div>
                {achievement.unlocked_at && (
                  <div className="text-xs mt-2">
                    {new Date(achievement.unlocked_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
