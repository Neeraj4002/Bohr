import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Target, Clock, Flame, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { SkeletonCard, SkeletonText } from '@/components/ui/skeleton';
import { NumberTicker, AnimatedProgress, FadeIn, StaggerContainer, StaggerItem, HoverCard, Sparkles } from '@/components/ui/magic';
import FlipTimer from '@/components/timer/FlipTimer';
import { useSkillsStore } from '@/store/skillsStore';
import { useUserStore } from '@/store/userStore';
import { useTimerStore } from '@/store/timerStore';
import { useTasksStore } from '@/store/tasksStore';
import { formatHours, cn } from '@/lib/utils';
import { toast } from 'sonner';

// Color presets for skills
const SKILL_COLORS = [
  '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { skills, activeSkill, loading: skillsLoading, fetchSkills, createSkill, setActiveSkill } = useSkillsStore();
  const { profile, fetchProfile } = useUserStore();
  const { startTimer } = useTimerStore();
  const { tasks, fetchTasks } = useTasksStore();
  
  const [showNewSkillModal, setShowNewSkillModal] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillColor, setNewSkillColor] = useState(SKILL_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSkills();
    fetchProfile();
  }, [fetchSkills, fetchProfile]);

  // Fetch tasks for active skill
  useEffect(() => {
    if (activeSkill) {
      fetchTasks(activeSkill.id);
    }
  }, [activeSkill, fetchTasks]);

  const handleCreateSkill = async () => {
    if (!newSkillName.trim()) {
      toast.error('Please enter a skill name');
      return;
    }

    setSaving(true);
    try {
      await createSkill({
        name: newSkillName.trim(),
        color: newSkillColor,
        goalHours: 10000,
      });
      toast.success('Skill created!');
      setShowNewSkillModal(false);
      setNewSkillName('');
    } catch (error) {
      toast.error('Failed to create skill');
    } finally {
      setSaving(false);
    }
  };

  const handleStartSession = async (skillId?: string) => {
    const skill = skillId ? skills.find(s => s.id === skillId) : activeSkill;
    if (skill) {
      await setActiveSkill(skill.id);
      await startTimer('pomodoro', undefined, skill.id, skill.name);
      navigate('/focus');
    } else {
      toast.error('Please select a skill first');
    }
  };

  const handleSkillClick = async (skillId: string) => {
    await setActiveSkill(skillId);
    toast.success('Active skill changed');
  };

  // Calculate stats
  const totalHours = profile?.totalMinutes ? profile.totalMinutes / 60 : 0;
  const todayHours = 0; // TODO: Calculate from daily_activities
  const weeklyGoal = profile?.weeklyGoalHours || 40;
  const dailyGoal = profile?.dailyGoalHours || 4;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const completedToday = tasks.filter(t => 
    t.status === 'done' && 
    t.completedAt && 
    new Date(t.completedAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <FadeIn direction="down">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Welcome back, {profile?.name || 'User'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {activeSkill 
                ? `Currently working on: ${activeSkill.name}`
                : 'Select a skill to start tracking your progress'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewSkillModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Skill
            </Button>
            <Button onClick={() => handleStartSession()} disabled={!activeSkill}>
              <Play className="w-4 h-4 mr-2" />
              Start Session
            </Button>
          </div>
        </div>
      </FadeIn>

      {/* Main Flip Timer */}
      <Card className="border-2">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">
            {activeSkill ? activeSkill.name : '10,000 Hour Journey'}
          </CardTitle>
          <CardDescription>
            {activeSkill 
              ? `${formatHours(activeSkill.currentMinutes)} / ${activeSkill.goalHours} hours completed`
              : 'Select a skill to begin tracking'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <FlipTimer skillId={activeSkill?.id} />
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {skillsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StaggerItem>
              <HoverCard>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      <NumberTicker value={Math.floor((profile?.totalMinutes || 0) / 60)} />
                      <span className="text-lg text-muted-foreground ml-1">h</span>
                    </div>
                    <p className="text-xs text-muted-foreground">across all skills</p>
                  </CardContent>
                </Card>
              </HoverCard>
            </StaggerItem>

            <StaggerItem>
              <HoverCard>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                    <Flame className="w-4 h-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <Sparkles active={(profile?.currentStreak || 0) >= 7} sparklesCount={6}>
                      <div className="text-3xl font-bold">
                        <NumberTicker value={profile?.currentStreak || 0} /> <span className="text-xl">🔥</span>
                      </div>
                    </Sparkles>
                    <p className="text-xs text-muted-foreground">consecutive days</p>
                  </CardContent>
                </Card>
              </HoverCard>
            </StaggerItem>

            <StaggerItem>
              <HoverCard>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Active Skills</CardTitle>
                    <Target className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      <NumberTicker value={skills.length} />
                    </div>
                    <p className="text-xs text-muted-foreground">skills in progress</p>
                  </CardContent>
                </Card>
              </HoverCard>
            </StaggerItem>

            <StaggerItem>
              <HoverCard>
                <Card className="hover:border-primary/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Tasks Active</CardTitle>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      <NumberTicker value={inProgressTasks} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {completedToday > 0 ? `${completedToday} completed today` : 'none completed today'}
                    </p>
                  </CardContent>
                </Card>
              </HoverCard>
            </StaggerItem>
          </>
        )}
      </StaggerContainer>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Jump into your practice</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={() => setShowNewSkillModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Skill
          </Button>
          <Button variant="outline" onClick={() => navigate('/tasks')}>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
          <Button variant="outline" onClick={() => navigate('/journal')}>
            <Calendar className="w-4 h-4 mr-2" />
            View Journal
          </Button>
          <Button variant="outline" onClick={() => navigate('/skills')}>
            <TrendingUp className="w-4 h-4 mr-2" />
            View Progress
          </Button>
        </CardContent>
      </Card>

      {/* Your Skills */}
      {skillsLoading ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Skills</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      ) : skills.length > 0 ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">Your Skills</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.slice(0, 6).map(skill => (
              <Card 
                key={skill.id} 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  activeSkill?.id === skill.id && "ring-2 ring-primary"
                )}
                onClick={() => handleSkillClick(skill.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{skill.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {formatHours(skill.currentMinutes)} / {skill.goalHours}h
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: skill.color }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartSession(skill.id);
                        }}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <AnimatedProgress 
                    value={skill.currentMinutes} 
                    max={skill.goalHours * 60}
                    variant="gradient"
                    size="md"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.floor((skill.currentMinutes / (skill.goalHours * 60)) * 100)}% complete
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {skills.length > 6 && (
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => navigate('/skills')}>
                View All Skills ({skills.length})
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Skills Yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Start your 10,000 hour journey by creating your first skill to track
            </p>
            <Button onClick={() => setShowNewSkillModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Skill
            </Button>
          </CardContent>
        </Card>
      )}

      {/* New Skill Modal */}
      <Modal
        open={showNewSkillModal}
        onClose={() => setShowNewSkillModal(false)}
        title="Create New Skill"
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Skill Name *</label>
            <Input
              placeholder="e.g., Piano, Programming, Drawing..."
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSkill()}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {SKILL_COLORS.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-8 h-8 rounded-full transition-transform hover:scale-110",
                    newSkillColor === color && "ring-2 ring-offset-2 ring-primary"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setNewSkillColor(color)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" onClick={() => setShowNewSkillModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateSkill} disabled={saving || !newSkillName.trim()}>
            {saving ? 'Creating...' : 'Create Skill'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
