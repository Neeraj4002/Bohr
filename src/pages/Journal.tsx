import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSkillsStore } from '@/store/skillsStore';
import Database from '@tauri-apps/plugin-sql';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft, ChevronRight, Save, Edit, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

let db: Database | null = null;

async function getDb() {
  if (!db) {
    db = await Database.load('sqlite:app.db');
  }
  return db;
}

interface Reflection {
  id: string;
  date: string;
  content: string;
  mood?: string;
  created_at: string;
}

const MOODS = ['😊 Great', '🙂 Good', '😐 Okay', '😔 Struggling', '😓 Difficult'];

export default function Journal() {
  const { skills } = useSkillsStore();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [linkedSkills, setLinkedSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [reflectionDates, setReflectionDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReflection(selectedDate);
    loadReflectionDates();
  }, [selectedDate]);

  const loadReflectionDates = async () => {
    try {
      const database = await getDb();
      const results = await database.select<{ date: string }[]>(
        'SELECT date FROM reflections'
      );
      setReflectionDates(new Set(results.map(r => r.date)));
    } catch (error) {
      console.error('Failed to load reflection dates:', error);
    }
  };

  const loadReflection = async (date: string) => {
    try {
      setLoading(true);
      const database = await getDb();
      
      const result = await database.select<Reflection[]>(
        'SELECT * FROM reflections WHERE date = $1 LIMIT 1',
        [date]
      );

      if (result.length > 0) {
        const r = result[0];
        setReflection(r);
        setContent(r.content);
        setMood(r.mood || '');
        setIsEditing(false);

        // Load linked skills
        const skillLinks = await database.select<any[]>(
          'SELECT skill_id FROM reflection_skills WHERE reflection_id = $1',
          [r.id]
        );
        setLinkedSkills(skillLinks.map(s => s.skill_id));
      } else {
        setReflection(null);
        setContent('');
        setMood('');
        setLinkedSkills([]);
        setIsEditing(false);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load reflection:', error);
      setLoading(false);
    }
  };

  const saveReflection = async () => {
    if (!content.trim()) return;

    try {
      const database = await getDb();
      
      if (reflection) {
        // Update existing
        await database.execute(
          'UPDATE reflections SET content = $1, mood = $2 WHERE id = $3',
          [content, mood, reflection.id]
        );
      } else {
        // Create new
        const id = `reflection_${Date.now()}`;
        await database.execute(
          'INSERT INTO reflections (id, date, content, mood) VALUES ($1, $2, $3, $4)',
          [id, selectedDate, content, mood || null]
        );

        // Link skills
        for (const skillId of linkedSkills) {
          await database.execute(
            'INSERT INTO reflection_skills (reflection_id, skill_id) VALUES ($1, $2)',
            [id, skillId]
          );
        }
      }

      await loadReflection(selectedDate);
      await loadReflectionDates();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save reflection:', error);
    }
  };

  const changeMonth = (delta: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
  };

  const toggleSkillLink = (skillId: string) => {
    setLinkedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return formatDateKey(date) === selectedDate;
  };

  const hasReflection = (date: Date) => {
    return reflectionDates.has(formatDateKey(date));
  };

  const isFutureDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  return (
    <div className="h-full overflow-y-auto p-6">
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-medium tracking-tight text-gray-900 dark:text-white">Reflection Journal</h1>
        <p className="text-gray-500 mt-1">
          Document your learning journey and insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar Sidebar */}
        <div className="lg:col-span-2">
          <div className="elevation-1 rounded-xl bg-white dark:bg-card sticky top-4">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => changeMonth(-1)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {currentMonth.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => changeMonth(1)}
                  disabled={
                    currentMonth.getMonth() === new Date().getMonth() &&
                    currentMonth.getFullYear() === new Date().getFullYear()
                  }
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-5">
              {/* Calendar Grid */}
              <div className="space-y-2">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 text-xs text-gray-500 font-medium text-center mb-2">
                  <div>Sun</div>
                  <div>Mon</div>
                  <div>Tue</div>
                  <div>Wed</div>
                  <div>Thu</div>
                  <div>Fri</div>
                  <div>Sat</div>
                </div>
                
                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-1">
                  {getDaysInMonth().map((date, index) => (
                    <button
                      key={index}
                      onClick={() => date && !isFutureDate(date) && setSelectedDate(formatDateKey(date))}
                      disabled={!date || isFutureDate(date)}
                      className={cn(
                        "aspect-square p-1 rounded-lg text-sm font-medium transition-all relative",
                        !date && "invisible",
                        date && !isFutureDate(date) && "hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
                        date && isFutureDate(date) && "text-gray-300 dark:text-gray-600 cursor-not-allowed",
                        date && isSelected(date) && "bg-primary text-white hover:bg-primary/90",
                        date && !isSelected(date) && isToday(date) && "border-2 border-primary text-primary",
                        date && !isSelected(date) && !isToday(date) && hasReflection(date) && "bg-primary/10"
                      )}
                    >
                      {date && (
                        <>
                          <div>{date.getDate()}</div>
                          {hasReflection(date) && !isSelected(date) && (
                            <div className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                          )}
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary rounded" />
                  <span className="text-gray-500">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary/10 rounded flex items-end justify-center pb-0.5">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                  </div>
                  <span className="text-gray-500">Has reflection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary rounded" />
                  <span className="text-gray-500">Selected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reflection Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Selected Date Display */}
          <div className="elevation-1 rounded-xl bg-white dark:bg-card p-5">
            <div className="text-center">
              <div className="text-xl font-medium text-gray-900 dark:text-white">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>

          {/* Mood Selector */}
          {isEditing && (
            <div className="elevation-1 rounded-xl bg-white dark:bg-card">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">How are you feeling today?</h3>
              </div>
              <div className="p-5">
                <div className="flex gap-2 flex-wrap">
                  {MOODS.map((m) => (
                    <Button
                      key={m}
                      variant={mood === m ? 'default' : 'outline'}
                      onClick={() => setMood(m)}
                      className={cn(
                        "text-sm",
                        mood === m && "elevation-1"
                      )}
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Skills Linking */}
          {isEditing && skills.length > 0 && (
            <div className="elevation-1 rounded-xl bg-white dark:bg-card">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Link to Skills</h3>
              </div>
              <div className="p-5">
                <div className="flex gap-2 flex-wrap">
                  {skills.map((skill) => (
                    <Button
                      key={skill.id}
                      variant={linkedSkills.includes(skill.id) ? 'default' : 'outline'}
                      onClick={() => toggleSkillLink(skill.id)}
                      className="text-sm"
                      style={
                        linkedSkills.includes(skill.id)
                          ? { backgroundColor: skill.color, color: 'white' }
                          : {}
                      }
                    >
                      {skill.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reflection Content */}
          <div className="elevation-1 rounded-xl bg-white dark:bg-card">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-medium text-gray-900 dark:text-white">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Daily Reflection
                </h3>
                {!isEditing && reflection && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="elevation-1 hover:elevation-2">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </div>
            <div className="p-5">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : isEditing ? (
                <div className="space-y-4">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What did you learn today? What challenges did you face? What insights did you gain?

You can use Markdown:
- **bold text**
- *italic text*
- # Headings
- - bullet points
- [links](url)"
                    className="w-full min-h-[400px] p-4 border border-gray-200 dark:border-gray-700 rounded-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50 dark:bg-gray-800"
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveReflection} disabled={!content.trim()} className="elevation-1">
                      <Save className="w-4 h-4 mr-2" />
                      Save Reflection
                    </Button>
                    {reflection && (
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : reflection ? (
                <div>
                  {mood && (
                    <div className="mb-4 text-sm text-gray-500">
                      Mood: <span className="font-medium text-gray-700 dark:text-gray-300">{mood}</span>
                    </div>
                  )}
                  {linkedSkills.length > 0 && (
                    <div className="mb-4 flex gap-2 flex-wrap">
                      {linkedSkills.map(skillId => {
                        const skill = skills.find(s => s.id === skillId);
                        return skill ? (
                          <span
                            key={skillId}
                            className="text-xs px-2.5 py-1 rounded-full text-white"
                            style={{ backgroundColor: skill.color }}
                          >
                            {skill.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-gray-500">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                  No reflection for this date yet.
                  <div className="mt-4">
                    <Button onClick={() => setIsEditing(true)} className="elevation-1">
                      Create Reflection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
