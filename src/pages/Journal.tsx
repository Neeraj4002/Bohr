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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Reflection Journal</h1>
        <p className="text-muted-foreground mt-2">
          Document your learning journey and insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Calendar Sidebar */}
        <div className="lg:col-span-2">
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => changeMonth(-1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <CardTitle className="text-lg">
                  {currentMonth.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => changeMonth(1)}
                  disabled={
                    currentMonth.getMonth() === new Date().getMonth() &&
                    currentMonth.getFullYear() === new Date().getFullYear()
                  }
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="space-y-2">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground font-medium text-center mb-2">
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
                        date && !isFutureDate(date) && "hover:bg-accent cursor-pointer",
                        date && isFutureDate(date) && "text-muted-foreground/30 cursor-not-allowed",
                        date && isSelected(date) && "bg-primary text-primary-foreground hover:bg-primary/90",
                        date && !isSelected(date) && isToday(date) && "border-2 border-primary",
                        date && !isSelected(date) && !isToday(date) && hasReflection(date) && "bg-accent/50"
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
              <div className="mt-4 pt-4 border-t text-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary rounded" />
                  <span className="text-muted-foreground">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-accent/50 rounded flex items-end justify-center pb-0.5">
                    <div className="w-1 h-1 rounded-full bg-primary" />
                  </div>
                  <span className="text-muted-foreground">Has reflection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary rounded" />
                  <span className="text-muted-foreground">Selected</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reflection Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Selected Date Display */}
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mood Selector */}
          {isEditing && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How are you feeling today?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {MOODS.map((m) => (
                    <Button
                      key={m}
                      variant={mood === m ? 'default' : 'outline'}
                      onClick={() => setMood(m)}
                      className="text-sm"
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills Linking */}
          {isEditing && skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Link to Skills</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

          {/* Reflection Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Daily Reflection
                </CardTitle>
                {!isEditing && reflection && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
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
                    className="w-full min-h-[400px] p-4 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <div className="flex gap-2">
                    <Button onClick={saveReflection} disabled={!content.trim()}>
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
                    <div className="mb-4 text-sm text-muted-foreground">
                      Mood: <span className="font-medium">{mood}</span>
                    </div>
                  )}
                  {linkedSkills.length > 0 && (
                    <div className="mb-4 flex gap-2 flex-wrap">
                      {linkedSkills.map(skillId => {
                        const skill = skills.find(s => s.id === skillId);
                        return skill ? (
                          <span
                            key={skillId}
                            className="text-xs px-2 py-1 rounded-full text-white"
                            style={{ backgroundColor: skill.color }}
                          >
                            {skill.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  No reflection for this date yet.
                  <div className="mt-4">
                    <Button onClick={() => setIsEditing(true)}>
                      Create Reflection
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
