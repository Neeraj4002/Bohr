import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
          'UPDATE user_settings SET name = $1 WHERE id = 1',
          [name]
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
    <div className="h-full overflow-y-auto p-6">
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-medium tracking-tight text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 mt-1">
          Customize your 10,000 Hours experience
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Navigation */}
        <div className="w-48 flex-shrink-0">
          <nav className="elevation-1 rounded-xl bg-white dark:bg-card p-2 space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                  activeSection === section.id
                    ? "bg-primary text-white"
                    : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
            <div className="elevation-1 rounded-xl bg-white dark:bg-card">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Profile</h3>
                <p className="text-sm text-gray-500 mt-1">Your personal information</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="border-gray-200 dark:border-gray-700 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <Input
                    value={profile?.email || ''}
                    disabled
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
              </div>
            </div>
          )}

          {/* Timer Section */}
          {activeSection === 'timer' && (
            <div className="elevation-1 rounded-xl bg-white dark:bg-card">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Timer Settings</h3>
                <p className="text-sm text-gray-500 mt-1">Configure your Pomodoro timer</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Focus Time (min)</label>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={pomodoroMinutes}
                      onChange={(e) => setPomodoroMinutes(parseInt(e.target.value) || 25)}
                      className="border-gray-200 dark:border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Short Break (min)</label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={shortBreakMinutes}
                      onChange={(e) => setShortBreakMinutes(parseInt(e.target.value) || 5)}
                      className="border-gray-200 dark:border-gray-700"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Long Break (min)</label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={longBreakMinutes}
                      onChange={(e) => setLongBreakMinutes(parseInt(e.target.value) || 15)}
                      className="border-gray-200 dark:border-gray-700"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Auto-start Breaks</p>
                    <p className="text-sm text-gray-500">
                      Automatically start break timer after focus session
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoStartBreaks(!autoStartBreaks)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors",
                      autoStartBreaks ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                        autoStartBreaks && "translate-x-5"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Goals Section */}
          {activeSection === 'goals' && (
            <div className="elevation-1 rounded-xl bg-white dark:bg-card">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Goals</h3>
                <p className="text-sm text-gray-500 mt-1">Set your daily and weekly targets</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Daily Goal (hours)</label>
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={dailyGoalHours}
                      onChange={(e) => setDailyGoalHours(parseInt(e.target.value) || 4)}
                      className="border-gray-200 dark:border-gray-700"
                    />
                    <p className="text-xs text-gray-500">Hours to practice each day</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Weekly Goal (hours)</label>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={weeklyGoalHours}
                      onChange={(e) => setWeeklyGoalHours(parseInt(e.target.value) || 40)}
                      className="border-gray-200 dark:border-gray-700"
                    />
                    <p className="text-xs text-gray-500">Hours to practice each week</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="elevation-1 rounded-xl bg-white dark:bg-card">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Appearance</h3>
                <p className="text-sm text-gray-500 mt-1">Customize how the app looks</p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">Theme</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all",
                        theme === 'light' ? "border-primary bg-primary/5" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      )}
                    >
                      <Sun className="w-5 h-5" />
                      <span>Light</span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all",
                        theme === 'dark' ? "border-primary bg-primary/5" : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                      )}
                    >
                      <Moon className="w-5 h-5" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="elevation-1 rounded-xl bg-white dark:bg-card">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Notifications</h3>
                <p className="text-sm text-gray-500 mt-1">Configure alerts and sounds</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Desktop Notifications</p>
                    <p className="text-sm text-gray-500">
                      Show notifications when timer completes
                    </p>
                  </div>
                  <button
                    onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors",
                      notificationsEnabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                        notificationsEnabled && "translate-x-5"
                      )}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-800">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Sound Effects</p>
                    <p className="text-sm text-gray-500">
                      Play sounds for timer events
                    </p>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={cn(
                      "relative w-11 h-6 rounded-full transition-colors",
                      soundEnabled ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm",
                        soundEnabled && "translate-x-5"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Section */}
          {activeSection === 'data' && (
            <div className="space-y-6">
              <div className="elevation-1 rounded-xl bg-white dark:bg-card">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-base font-medium text-gray-900 dark:text-white">Export Data</h3>
                  <p className="text-sm text-gray-500 mt-1">Download a backup of all your data</p>
                </div>
                <div className="p-5">
                  <Button onClick={handleExportData} className="elevation-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export to JSON
                  </Button>
                </div>
              </div>

              <div className="elevation-1 rounded-xl bg-white dark:bg-card border-2 border-gred/30">
                <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-base font-medium text-gred">Danger Zone</h3>
                  <p className="text-sm text-gray-500 mt-1">Irreversible actions</p>
                </div>
                <div className="p-5">
                  <Button variant="destructive" onClick={handleClearData}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    This will permanently delete all your skills, tasks, sessions, and achievements.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          {activeSection !== 'data' && (
            <div className="flex justify-end">
              <Button onClick={handleSaveSettings} disabled={saving} className="elevation-1 hover:elevation-2">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
