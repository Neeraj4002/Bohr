import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Target, Clock, TrendingUp, Star, Trophy, BookOpen, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { SkeletonCard } from '@/components/ui/skeleton';
import { NumberTicker } from '@/components/ui/magic';
import { useSkillsStore } from '@/store/skillsStore';
import { Skill } from '@/types';
import { toast } from 'sonner';
import { formatHours, cn } from '@/lib/utils';

// Google-style color palette for skills
const SKILL_COLORS = [
  '#1A73E8', // Google Blue
  '#34A853', // Google Green
  '#EA4335', // Google Red
  '#FBBC04', // Google Yellow
  '#5F6368', // Google Gray
  '#8AB4F8', // Light Blue
  '#81C995', // Light Green
  '#F28B82', // Light Red
  '#FDD663', // Light Yellow
  '#9AA0A6', // Light Gray
];

interface SkillFormData {
  name: string;
  description: string;
  goalHours: number;
  color: string;
}

const defaultFormData: SkillFormData = {
  name: '',
  description: '',
  goalHours: 10000,
  color: SKILL_COLORS[0],
};

export default function Skills() {
  const { skills, loading, fetchSkills, createSkill, updateSkill, setActiveSkill, deleteSkill } = useSkillsStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [formData, setFormData] = useState<SkillFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const openCreateModal = () => {
    setFormData(defaultFormData);
    setShowCreateModal(true);
  };

  const openEditModal = (skill: Skill) => {
    setSelectedSkill(skill);
    setFormData({
      name: skill.name,
      description: skill.description || '',
      goalHours: skill.goalHours,
      color: skill.color,
    });
    setShowEditModal(true);
  };

  const openDeleteDialog = (skill: Skill) => {
    setSelectedSkill(skill);
    setShowDeleteDialog(true);
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a skill name');
      return;
    }

    setSaving(true);
    try {
      await createSkill(formData);
      toast.success('Skill created successfully!');
      setShowCreateModal(false);
      setFormData(defaultFormData);
    } catch (error) {
      toast.error('Failed to create skill');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedSkill || !formData.name.trim()) {
      toast.error('Please enter a skill name');
      return;
    }

    setSaving(true);
    try {
      await updateSkill({
        id: selectedSkill.id,
        ...formData,
      });
      toast.success('Skill updated successfully!');
      setShowEditModal(false);
      setSelectedSkill(null);
    } catch (error) {
      toast.error('Failed to update skill');
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const skill = skills.find(s => s.id === id);
      await setActiveSkill(skill || null);
      toast.success('Active skill updated!');
    } catch (error) {
      toast.error('Failed to set active skill');
    }
  };

  const handleDelete = async () => {
    if (!selectedSkill) return;
    
    setSaving(true);
    try {
      await deleteSkill(selectedSkill.id);
      toast.success('Skill deleted');
      setShowDeleteDialog(false);
      setSelectedSkill(null);
    } catch (error) {
      toast.error('Failed to delete skill');
    } finally {
      setSaving(false);
    }
  };

  const calculateRemainingHours = (skill: Skill) => {
    const currentHours = skill.currentMinutes / 60;
    return Math.max(0, skill.goalHours - currentHours);
  };

  const SkillForm = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="skill-name" className="text-sm font-medium">Skill Name *</label>
        <Input
          id="skill-name"
          placeholder="e.g., Python Programming"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="skill-description" className="text-sm font-medium">Description</label>
        <Input
          id="skill-description"
          placeholder="What do you want to achieve?"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="skill-goal" className="text-sm font-medium">Goal Hours</label>
        <Input
          id="skill-goal"
          type="number"
          min={1}
          max={100000}
          value={formData.goalHours}
          onChange={(e) => setFormData({ ...formData, goalHours: parseInt(e.target.value) || 10000 })}
        />
        <p className="text-xs text-muted-foreground">
          The 10,000 hour rule suggests this is the time needed for mastery
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Color</label>
        <div className="flex flex-wrap gap-2">
          {SKILL_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-8 h-8 rounded-full transition-all ${
                formData.color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setFormData({ ...formData, color })}
            />
          ))}
          <input
            type="color"
            value={formData.color}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-8 h-8 rounded-full cursor-pointer border-2"
            title="Custom color"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="h-full overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Skills Mastery
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Track your 10,000-hour journey to expertise across multiple domains
                  </p>
                </div>
              </div>
              <Button 
                onClick={openCreateModal} 
                className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl px-6 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-4 h-4" />
                New Skill
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          {skills.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-2xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      <NumberTicker value={skills.length} />
                    </div>
                    <div className="text-sm text-gray-500">Active Skills</div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-2xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      <NumberTicker value={Math.floor(skills.reduce((sum, s) => sum + s.currentMinutes, 0) / 60)} />
                      <span className="text-lg text-gray-500 ml-0.5">h</span>
                    </div>
                    <div className="text-sm text-gray-500">Total Hours</div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      <NumberTicker value={Math.floor(skills.reduce((sum, s) => sum + (s.currentMinutes / (s.goalHours * 60)) * 100, 0) / skills.length)} />
                      <span className="text-lg text-gray-500 ml-0.5">%</span>
                    </div>
                    <div className="text-sm text-gray-500">Avg Progress</div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center">
                    <Award className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      <NumberTicker value={skills.filter(s => s.currentMinutes >= s.goalHours * 60).length} />
                    </div>
                    <div className="text-sm text-gray-500">Mastered</div>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Loading State */}
      {loading && skills.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

          {/* Skills Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {skills.map(skill => {
              const progressPercent = Math.min((skill.currentMinutes / (skill.goalHours * 60)) * 100, 100);
              const remainingHours = calculateRemainingHours(skill);
              const isMastered = skill.currentMinutes >= skill.goalHours * 60;

              
              return (
                <Card 
                  key={skill.id} 
                  className={cn(
                    "group relative overflow-hidden transition-all duration-300 cursor-pointer border-0 shadow-sm hover:shadow-xl bg-white dark:bg-gray-900",
                    skill.isActive ? "ring-2 ring-indigo-500 ring-offset-2 shadow-lg" : ""
                  )}
                  onClick={() => handleSetActive(skill.id)}
                >
                  {/* Background gradient */}
                  <div 
                    className="absolute inset-0 opacity-10"
                    style={{ 
                      background: `linear-gradient(135deg, ${skill.color}20, ${skill.color}05)` 
                    }}
                  />
                  
                  {/* Mastery badge */}
                  {isMastered && (
                    <div className="absolute top-4 right-4 w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center z-10">
                      <Star className="w-4 h-4 text-white fill-current" />
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div 
                            className="w-12 h-12 rounded-2xl flex items-center justify-center"
                            style={{ 
                              backgroundColor: skill.color + '20',
                              border: `2px solid ${skill.color}30`
                            }}
                          >
                            <BookOpen 
                              className="w-6 h-6" 
                              style={{ color: skill.color }} 
                            />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">
                              {skill.name}
                            </CardTitle>
                            {skill.description && (
                              <CardDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {skill.description}
                              </CardDescription>
                            )}
                          </div>
                        </div>
                      </div>
                      <div 
                        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                          onClick={() => openEditModal(skill)}
                        >
                          <Pencil className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                          onClick={() => openDeleteDialog(skill)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-5 pt-0">
                    {/* Progress Stats */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatHours(skill.currentMinutes)}h
                        </div>
                        <div className="text-sm text-gray-500">
                          of {skill.goalHours.toLocaleString()}h goal
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold" style={{ color: skill.color }}>
                          {progressPercent.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-500">
                          complete
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-2">
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(progressPercent, 100)}%`,
                            backgroundColor: skill.color
                          }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Started: {new Date(skill.createdAt).toLocaleDateString()}</span>
                        <span>{remainingHours.toLocaleString()}h remaining</span>
                      </div>
                    </div>
                    
                    {/* Status indicator */}
                    {skill.isActive && (
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                          Currently Active
                        </span>
                      </div>
                    )}
                    
                    {isMastered && (
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                          Mastery Achieved!
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty State */}
          {!loading && skills.length === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-16">
              <div className="text-center">
                <div className="w-20 h-20 rounded-3xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mx-auto mb-6">
                  <Target className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Start Your Mastery Journey</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed mb-8">
                  Create your first skill to begin tracking your 10,000-hour journey to expertise. Every expert was once a beginner.
                </p>
                <Button 
                  onClick={openCreateModal} 
                  className="gap-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl px-8 py-3"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Skill
                </Button>
              </div>
            </div>
          )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Skill"
        description="Define a new skill you want to master"
        size="md"
      >
        <SkillForm />
        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? 'Creating...' : 'Create Skill'}
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Skill"
        description="Update your skill details"
        size="md"
      >
        <SkillForm />
        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Skill?"
        description={`Are you sure you want to delete "${selectedSkill?.name}"? This will also delete all associated tasks and session history. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={saving}
      />
        </div>
      </div>
    </div>
  );
}
