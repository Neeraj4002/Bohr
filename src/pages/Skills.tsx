import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Target, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { SkeletonCard } from '@/components/ui/skeleton';
import { NumberTicker, AnimatedProgress, StaggerContainer, StaggerItem } from '@/components/ui/magic';
import { useSkillsStore } from '@/store/skillsStore';
import { Skill } from '@/types';
import { toast } from 'sonner';
import { formatHours } from '@/lib/utils';

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
      await setActiveSkill(id);
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
        <label className="text-sm font-medium">Skill Name *</label>
        <Input
          placeholder="e.g., Python Programming"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input
          placeholder="What do you want to achieve?"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Goal Hours</label>
        <Input
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
    <div className="h-full overflow-y-auto p-8 bg-background">
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tight font-display">Skills</h1>
          <p className="text-muted-foreground mt-1">
            Manage your 10,000 hour journey to mastery
          </p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 rounded-full px-6">
          <Plus className="w-4 h-4" />
          New Skill
        </Button>
      </div>

      {/* Stats Overview */}
      {skills.length > 0 && (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StaggerItem>
            <Card className="elevation-1 hover:elevation-2 transition-all bg-white dark:bg-card">
              <CardContent className="pt-5">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold font-display">
                      <NumberTicker value={skills.length} />
                    </p>
                    <p className="text-sm text-muted-foreground">Active Skills</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="elevation-1 hover:elevation-2 transition-all bg-white dark:bg-card">
              <CardContent className="pt-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-success/10 rounded-full">
                      <Clock className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold font-display">
                        <NumberTicker value={Math.floor(skills.reduce((sum, s) => sum + s.currentMinutes, 0) / 60)} />
                        <span className="text-lg text-muted-foreground">h</span>
                      </p>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                    </div>
                  </div>
                </CardContent>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="elevation-1 hover:elevation-2 transition-all bg-white dark:bg-card">
              <CardContent className="pt-5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold font-display">
                        <NumberTicker value={Math.floor(skills.reduce((sum, s) => sum + (s.currentMinutes / (s.goalHours * 60)) * 100, 0) / skills.length)} />
                        <span className="text-lg text-muted-foreground">%</span>
                      </p>
                      <p className="text-sm text-muted-foreground">Avg Progress</p>
                    </div>
                  </div>
                </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {skills.map(skill => {
          const progressPercent = Math.min((skill.currentMinutes / (skill.goalHours * 60)) * 100, 100);
          const remainingHours = calculateRemainingHours(skill);
          
          return (
            <Card 
              key={skill.id} 
              className={`group transition-all cursor-pointer elevation-1 hover:elevation-2 bg-white dark:bg-card ${
                skill.isActive ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
              onClick={() => handleSetActive(skill.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full shrink-0" 
                        style={{ backgroundColor: skill.color }}
                      />
                      <CardTitle className="text-lg truncate font-medium">{skill.name}</CardTitle>
                    </div>
                    {skill.description && (
                      <CardDescription className="mt-1 line-clamp-1 text-xs">
                        {skill.description}
                      </CardDescription>
                    )}
                  </div>
                  <div 
                    className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 rounded-full"
                      onClick={() => openEditModal(skill)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive hover:text-destructive rounded-full"
                      onClick={() => openDeleteDialog(skill)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="font-semibold text-base">
                      {formatHours(skill.currentMinutes)}h
                    </span>
                    <span className="text-muted-foreground text-sm">
                      / {skill.goalHours.toLocaleString()}h
                    </span>
                  </div>
                  <AnimatedProgress 
                    value={skill.currentMinutes} 
                    max={skill.goalHours * 60}
                    variant={skill.isActive ? 'success' : 'glow'}
                    size="md"
                  />
                  <div className="flex justify-between mt-1.5">
                    <p className="text-xs text-muted-foreground">
                      {progressPercent.toFixed(1)}% complete
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {remainingHours.toLocaleString()}h remaining
                    </p>
                  </div>
                </div>
                
                {skill.isActive && (
                  <div className="pt-2 border-t flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-medium text-primary">
                      Currently Active
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
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No skills yet</h3>
            <p className="text-muted-foreground mb-6 text-center max-w-sm">
              Start your 10,000 hour journey by creating your first skill to track
            </p>
            <Button onClick={openCreateModal} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Skill
            </Button>
          </CardContent>
        </Card>
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
  );
}
