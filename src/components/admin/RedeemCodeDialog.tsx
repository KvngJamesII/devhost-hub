import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, Check, Gift } from 'lucide-react';

interface RedeemCodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const generateCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const segment2 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `IDEV-${segment1}-${segment2}`;
};

const DURATION_OPTIONS = [
  { value: '2', label: '2 hours' },
  { value: '24', label: '1 day' },
  { value: '168', label: '1 week' },
  { value: '720', label: '1 month' },
  { value: '1440', label: '2 months' },
  { value: '2160', label: '3 months' },
  { value: '4320', label: '6 months' },
  { value: '8640', label: '1 year' },
];

export function RedeemCodeDialog({ open, onOpenChange, onCreated }: RedeemCodeDialogProps) {
  const [step, setStep] = useState(1);
  const [maxUses, setMaxUses] = useState<string>('1');
  const [panelsGranted, setPanelsGranted] = useState<string>('1');
  const [durationHours, setDurationHours] = useState<string>('720'); // 1 month default
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    setLoading(true);
    const code = generateCode();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('redeem_codes').insert({
      code,
      max_uses: maxUses === 'unlimited' ? null : parseInt(maxUses),
      panels_granted: parseInt(panelsGranted),
      duration_hours: parseInt(durationHours),
      created_by: user.id,
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setGeneratedCode(code);
      setStep(4);
      onCreated();
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Copied!', description: 'Code copied to clipboard' });
    }
  };

  const handleClose = () => {
    setStep(1);
    setMaxUses('1');
    setPanelsGranted('1');
    setDurationHours('720');
    setGeneratedCode(null);
    onOpenChange(false);
  };

  const getDurationLabel = (hours: string) => {
    return DURATION_OPTIONS.find(o => o.value === hours)?.label || `${hours} hours`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Generate Redeem Code
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>How many users can use this code?</Label>
              <Select value={maxUses} onValueChange={setMaxUses}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 user</SelectItem>
                  <SelectItem value="2">2 users</SelectItem>
                  <SelectItem value="5">5 users</SelectItem>
                  <SelectItem value="10">10 users</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>How many panels should be granted?</Label>
              <Select value={panelsGranted} onValueChange={setPanelsGranted}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} panel{num > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => setStep(3)}>
              Next
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Panel duration (how long panels last)</Label>
              <Select value={durationHours} onValueChange={setDurationHours}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Code'}
              </Button>
            </div>
          </div>
        )}

        {step === 4 && generatedCode && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-3">Your redeem code is ready!</p>
              <div className="bg-muted rounded-lg p-4 font-mono text-xl font-bold text-primary flex items-center justify-center gap-3">
                {generatedCode}
                <Button size="icon" variant="ghost" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <div className="mt-4 text-xs text-muted-foreground space-y-1">
                <p>Uses: {maxUses === 'unlimited' ? 'Unlimited' : maxUses}</p>
                <p>Panels: {panelsGranted}</p>
                <p>Duration: {getDurationLabel(durationHours)}</p>
              </div>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
