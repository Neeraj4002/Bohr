import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, 
  Bell, 
  Moon, 
  Sun, 
  Clock, 
  Target,
  Save,
  Download,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { db } from '@/lib/database';
import { cn } from '@/lib/utils';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

const SECTIONS: SettingsSection[] = [
  { id: 'profile', title: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'timer', title: 'Timer', icon: <Clock className="w-4 h-4" /> },
  { id: 'goals', title: 'Goals', icon: <Target className="w-4 h-4" /> },
  { id: 'appearance', title: 'Appearance', icon: <Moon className="w-4 h-4" /> },
  { id: 'notifications', title: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'data', title: 'Data', icon: <Download className="w-4 h-4" /> },
];

export default function Settings() {
  const { profile, settings, fetchProfile, updateSettings } = useUserStore();
  const { theme, setTheme } = useThemeStore();
  
  const [activeSection, setActiveSection] = useState('profile');
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [dailyGoalHours, setDailyGoalHours] = useState(4);
  const [weeklyGoalHours, setWeeklyGoalHours] = useState(40);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
    }
    if (settings) {
      setPomodoroMinutes(settings.pomodoroMinutes || 25);
      setShortBreakMinutes(settings.shortBreakMinutes || 5);
      setLongBreakMinutes(settings.longBreakMinutes || 15);
      setDailyGoalHours(settings.dailyGoalHours || 4);
      setWeeklyGoalHours(settings.weeklyGoalHours || 40);
      setSoundEnabled(settings.soundEnabled ?? true);
      setNotificationsEnabled(settings.notificationsEnabled ?? true);
      setAutoStartBreaks(settings.autoStartBreaks ?? false);
    }
  }, [profile, settings]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings({
        pomodoroMinutes,
        shortBreakMinutes,
        longBreakMinutes,
        dailyGoalHours,
        weeklyGoalHours,
        soundEnabled,
        notificationsEnabled,
        autoStartBreaks,
      });
      
      // Update name separately if changed
      if (profile && name !== profile.name) {
        await db.execute(
          'UPDATE users SET name = $1 WHERE id = $2',
          [name, profile.id]
        );
      }
      
      toast.success('Settings saved');
      await fetchProfile();
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const skills = await db.select('SELECT * FROM skills');
      const tasks = await db.select('SELECT * FROM tasks');
      const sessions = await db.select('SELECT * FROM timer_sessions');
      const achievements = await db.select('SELECT * FROM achievements');
      const reflections = await db.select('SELECT * FROM reflections');
      
      const data = {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        skills,
        tasks,
        sessions,
        achievements,
        reflections,
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `10k-hours-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
      return;
    }
    
    try {
      await db.execute('DELETE FROM timer_sessions');
      await db.execute('DELETE FROM tasks');
      await db.execute('DELETE FROM reflections');
      await db.execute('DELETE FROM daily_activities');
      await db.execute('DELETE FROM skills');
      await db.execute('DELETE FROM achievements');
      
      toast.success('All data cleared');
      window.location.reload();
    } catch (error) {
      toast.error('Failed to clear data');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Customize your 10,000 Hours experience
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {section.icon}
                {section.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 space-y-6">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Display Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timer Section */}
          {activeSection === 'timer' && (
            <Card>
              <CardHeader>
                <CardTitle>Timer Settings</CardTitle>
                <CardDescription>Configure your Pomodoro timer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Focus Time (min)</label>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={pomodoroMinutes}
                      onChange={(e) => setPomodoroMinutes(parseInt(e.target.value) || 25)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Short Break (min)</label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={shortBreakMinutes}
                      onChange={(e) => setShortBreakMinutes(parseInt(e.target.value) || 5)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Long Break (min)</label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={longBreakMinutes}
                      onChange={(e) => setLongBreakMinutes(parseInt(e.target.value) || 15)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-3 border-t">
                  <div>
                    <p className="font-medium">Auto-start Breaks</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically start break timer after focus session
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoStartBreaks(!autoStartBreaks)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors",
                      autoStartBreaks ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                        autoStartBreaks && "translate-x-5"
                      )}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Goals Section */}
          {activeSection === 'goals' && (
            <Card>
              <CardHeader>
                <CardTitle>Goals</CardTitle>
                <CardDescription>Set your daily and weekly targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Daily Goal (hours)</label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={dailyGoalHours}
                      onChange={(e) => setDailyGoalHours(parseInt(e.target.value) || 4)}
                    />
                    <p className="text-xs text-muted-foreground">Hours to practice each day</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Weekly Goal (hours)</label>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={weeklyGoalHours}
                      onChange={(e) => setWeeklyGoalHours(parseInt(e.target.value) || 40)}
                    />
                    <p className="text-xs text-muted-foreground">Hours to practice each week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-3 block">Theme</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all",
                        theme === 'light' ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"
                      )}
                    >
                      <Sun className="w-5 h-5" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all",
                        theme === 'dark' ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30"
                      )}
                    >
                      <Moon className="w-5 h-5" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure alerts and sounds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">Desktop Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Show notifications when timer completes
                    </p>
                  </div>
                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors",
                      notificationsEnabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                        notificationsEnabled && "translate-x-5"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-t">
                  <div>
                    <p className="font-medium">Sound Effects</p>
                    <p className="text-sm text-muted-foreground">
                      Play sounds for timer events
                    </p>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors",
                      soundEnabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                        soundEnabled && "translate-x-5"
                      )}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data Section */}
          {activeSection === 'data' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Export Data</CardTitle>
                  <CardDescription>Download a backup of all your data</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Export to JSON
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription>Irreversible actions</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="destructive" onClick={handleClearData}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    This will permanently delete all your skills, tasks, sessions, and achievements.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Save Button */}
          {activeSection !== 'data' && (
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
