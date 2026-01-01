import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';

interface Panel {
  id: string;
  name: string;
  language: 'nodejs' | 'python';
  status: string;
  created_at: string;
}

interface PanelSettingsProps {
  panel: Panel;
  onUpdate: () => void;
}

export function PanelSettings({ panel, onUpdate }: PanelSettingsProps) {
  const [name, setName] = useState(panel.name);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('panels')
      .update({ name: name.trim() })
      .eq('id', panel.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: 'Settings updated successfully',
      });
      onUpdate();
    }

    setSaving(false);
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Configure your panel settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Panel Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome App"
            />
          </div>

          <div className="space-y-2">
            <Label>Language</Label>
            <Input
              value={panel.language === 'nodejs' ? 'Node.js' : 'Python'}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Language cannot be changed after creation
            </p>
          </div>

          <div className="space-y-2">
            <Label>Created At</Label>
            <Input
              value={new Date(panel.created_at).toLocaleString()}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>Panel ID</Label>
            <Input value={panel.id} disabled className="bg-muted font-mono text-xs" />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
