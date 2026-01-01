import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown } from 'lucide-react';

interface RequestPremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestPremiumDialog({ open, onOpenChange }: RequestPremiumDialogProps) {
  const { user, refreshProfile } = useAuth();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRequest = async () => {
    setLoading(true);

    // Create premium request
    const { error: requestError } = await supabase.from('premium_requests').insert({
      user_id: user?.id,
      message: message.trim() || null,
    });

    if (requestError) {
      toast({
        title: 'Error',
        description: 'Failed to submit request',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Update profile status to pending
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ premium_status: 'pending' })
      .eq('id', user?.id);

    if (profileError) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Request Submitted',
        description: 'Your premium request has been submitted for review.',
      });
      await refreshProfile();
      setMessage('');
      onOpenChange(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center mb-2">
            <Crown className="w-7 h-7 text-accent-foreground" />
          </div>
          <DialogTitle className="text-center">Request Premium Access</DialogTitle>
          <DialogDescription className="text-center">
            Premium users can create up to 5 panels to host their applications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Tell us why you'd like premium access..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-accent hover:opacity-90"
            onClick={handleRequest}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
