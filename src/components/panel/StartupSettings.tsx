import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Play, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Panel {
  id: string;
  name: string;
  language: 'nodejs' | 'python';
  status: string;
  created_at: string;
  entry_point?: string | null;
}

interface StartupSettingsProps {
  panel: Panel;
  onUpdate: () => void;
}

export function StartupSettings({ panel, onUpdate }: StartupSettingsProps) {
  const [entryPoint, setEntryPoint] = useState(panel.entry_point || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const defaultEntryPoint = panel.language === 'python' ? 'main.py' : 'index.js';
  const examples = panel.language === 'python' 
    ? ['main.py', 'app.py', 'bot.py', 'server.py', 'run.py']
    : ['index.js', 'app.js', 'server.js', 'bot.js', 'main.js'];

  useEffect(() => {
    setEntryPoint(panel.entry_point || '');
  }, [panel.entry_point]);

  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase
      .from('panels')
      .update({ entry_point: entryPoint.trim() || null })
      .eq('id', panel.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update startup settings',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Saved',
        description: 'Startup configuration updated successfully',
      });
      onUpdate();
    }

    setSaving(false);
  };

  const handleQuickSelect = (file: string) => {
    setEntryPoint(file);
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Startup Configuration
          </CardTitle>
          <CardDescription>
            Configure how your {panel.language === 'python' ? 'Python' : 'Node.js'} application starts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              The entry point is the main file that runs when your panel starts. 
              If not set, it defaults to <code className="bg-muted px-1 rounded">{defaultEntryPoint}</code>.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="entryPoint">Entry Point File</Label>
            <Input
              id="entryPoint"
              value={entryPoint}
              onChange={(e) => setEntryPoint(e.target.value)}
              placeholder={defaultEntryPoint}
            />
            <p className="text-xs text-muted-foreground">
              Enter the filename of your main script (e.g., {defaultEntryPoint})
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              {examples.map((file) => (
                <Button
                  key={file}
                  variant={entryPoint === file ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleQuickSelect(file)}
                  className="text-xs"
                >
                  {file}
                </Button>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current entry point:</span>
              <code className="bg-muted px-2 py-1 rounded font-mono">
                {entryPoint || defaultEntryPoint}
              </code>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Startup Settings
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {panel.language === 'python' ? (
            <>
              <p>Your Python application will be started using:</p>
              <code className="block bg-muted p-2 rounded font-mono text-xs">
                python3 {entryPoint || defaultEntryPoint}
              </code>
              <p>Make sure your entry file exists in the Files tab before starting.</p>
            </>
          ) : (
            <>
              <p>Your Node.js application will be started using:</p>
              <code className="block bg-muted p-2 rounded font-mono text-xs">
                node {entryPoint || defaultEntryPoint}
              </code>
              <p>Make sure your entry file exists in the Files tab before starting.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
