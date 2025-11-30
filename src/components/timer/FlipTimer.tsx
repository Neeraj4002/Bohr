import { useEffect, useState } from 'react';
import '@leenguyen/react-flip-clock-countdown/dist/index.css';
import { useSkillsStore } from '@/store/skillsStore';
import { Calendar } from 'lucide-react';

interface FlipTimerProps {
  skillId?: string;
}

export default function FlipTimer({ skillId }: FlipTimerProps) {
  const { skills } = useSkillsStore();
  const [currentHours, setCurrentHours] = useState<number>(0);
  const [currentMinutes, setCurrentMinutes] = useState<number>(0);
  const [currentSeconds, setCurrentSeconds] = useState<number>(0);

  useEffect(() => {
    const skill = skillId 
      ? skills.find(s => s.id === skillId)
      : skills.find(s => s.isActive);

    if (skill) {
      const totalSeconds = skill.currentMinutes * 60;
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      setCurrentHours(hours);
      setCurrentMinutes(minutes);
      setCurrentSeconds(seconds);
    } else {
      setCurrentHours(0);
      setCurrentMinutes(0);
      setCurrentSeconds(0);
    }
  }, [skills, skillId]);

  // Calculate progress
  const activeSkill = skillId 
    ? skills.find(s => s.id === skillId)
    : skills.find(s => s.isActive);
  const goalHours = activeSkill?.goalHours || 10000;
  const progressPercent = (currentHours / goalHours) * 100;

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      {/* Manual Flip Display for Hours Completed (Counting UP) */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center">
          <div className="bg-gray-900 text-white rounded-lg px-4 py-3 min-w-[120px] text-center shadow-lg">
            <div className="text-5xl font-bold font-mono tabular-nums">
              {String(currentHours).padStart(4, '0')}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 uppercase font-medium tracking-wider">Hours</div>
        </div>
        
        <div className="text-4xl font-bold text-gray-400 pb-6">:</div>
        
        <div className="flex flex-col items-center">
          <div className="bg-gray-900 text-white rounded-lg px-4 py-3 min-w-[80px] text-center shadow-lg">
            <div className="text-5xl font-bold font-mono tabular-nums">
              {String(currentMinutes).padStart(2, '0')}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 uppercase font-medium tracking-wider">Minutes</div>
        </div>
        
        <div className="text-4xl font-bold text-gray-400 pb-6">:</div>
        
        <div className="flex flex-col items-center">
          <div className="bg-gray-900 text-white rounded-lg px-4 py-3 min-w-[80px] text-center shadow-lg">
            <div className="text-5xl font-bold font-mono tabular-nums">
              {String(currentSeconds).padStart(2, '0')}
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2 uppercase font-medium tracking-wider">Seconds</div>
        </div>
      </div>
      
      {/* Hours Completed Display */}
      <div className="text-center space-y-3">
        <div className="text-4xl font-bold">{currentHours.toLocaleString()} hours</div>
        <div className="text-sm text-gray-500">
          Goal: {goalHours.toLocaleString()} hours · {progressPercent.toFixed(1)}% complete
        </div>
        {activeSkill && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3 max-w-md mx-auto">
              <div 
                className="h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(progressPercent, 100)}%`,
                  backgroundColor: activeSkill.color 
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Consistency Tracker */}
      {activeSkill && <ConsistencyTracker skillId={activeSkill.id} />}
    </div>
  );
}

function ConsistencyTracker({ skillId }: { skillId: string }) {
  const [weekData, setWeekData] = useState<{ date: string; minutes: number }[]>([]);

  useEffect(() => {
    loadWeekData();
  }, [skillId]);

  const loadWeekData = async () => {
    try {
      const Database = (await import('@tauri-apps/plugin-sql')).default;
      const db = await Database.load('sqlite:app.db');
      
      // Get last 7 days
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      const data = await Promise.all(
        dates.map(async (date) => {
          const result = await db.select<{ minutes: number }[]>(
            `SELECT SUM(duration) as minutes FROM timer_sessions 
             WHERE skill_id = $1 AND DATE(created_at) = $2 AND completed = 1`,
            [skillId, date]
          );
          return { date, minutes: result[0]?.minutes || 0 };
        })
      );
      
      setWeekData(data);
    } catch (error) {
      console.error('Failed to load week data:', error);
    }
  };

  const maxMinutes = Math.max(...weekData.map(d => d.minutes), 60);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <div className="w-full max-w-md mt-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-700">7-Day Consistency</h3>
      </div>
      <div className="flex items-end justify-between gap-2 h-24">
        {weekData.map((data) => {
          const height = maxMinutes > 0 ? (data.minutes / maxMinutes) * 100 : 0;
          const date = new Date(data.date);
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <div key={data.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: `${height}%`,
                    backgroundColor: data.minutes > 0 ? '#10B981' : '#E5E7EB',
                    minHeight: data.minutes > 0 ? '4px' : '2px',
                  }}
                  title={`${data.minutes} minutes`}
                />
              </div>
              <div className={`text-xs ${isToday ? 'font-bold text-black' : 'text-gray-500'}`}>
                {days[date.getDay()]}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-gray-500 text-center">
        {weekData.reduce((sum, d) => sum + d.minutes, 0)} minutes this week
      </div>
    </div>
  );
}
