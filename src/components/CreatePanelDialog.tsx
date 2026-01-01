import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface CreatePanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export function CreatePanelDialog({ open, onOpenChange, onCreated }: CreatePanelDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'nodejs' | 'python'>('nodejs');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your panel',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('panels').insert({
      user_id: user?.id,
      name: name.trim(),
      language,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create panel',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Panel created successfully',
      });
      setName('');
      setLanguage('nodejs');
      onOpenChange(false);
      onCreated();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Panel</DialogTitle>
          <DialogDescription>
            Set up a new hosting panel for your application
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Panel Name</Label>
            <Input
              id="name"
              placeholder="My Awesome App"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Programming Language</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLanguage('nodejs')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  language === 'nodejs'
                    ? 'border-nodejs bg-nodejs/10'
                    : 'border-border hover:border-nodejs/50'
                }`}
              >
                <div className="text-center">
                  <span className="font-mono font-bold text-2xl text-nodejs">JS</span>
                  <p className="text-sm text-muted-foreground mt-1">Node.js</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('python')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  language === 'python'
                    ? 'border-python bg-python/10'
                    : 'border-border hover:border-python/50'
                }`}
              >
                <div className="text-center">
                  <span className="font-mono font-bold text-2xl text-python">PY</span>
                  <p className="text-sm text-muted-foreground mt-1">Python</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-primary hover:opacity-90"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Panel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
