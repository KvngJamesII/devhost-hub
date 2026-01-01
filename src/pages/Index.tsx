import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Server, Terminal, Zap, Shield, Users, ChevronRight } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/50 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-primary" />
            </div>
            <span className="font-mono font-bold text-primary">iDev<span className="text-foreground">Host</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button size="sm" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90">
                  ~/dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="font-mono text-muted-foreground hover:text-foreground">
                    login
                  </Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button size="sm" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90">
                    signup --free
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-14">
        <section className="relative min-h-[90vh] flex items-center py-20 px-4 overflow-hidden">
          {/* Background grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
          
          <div className="container relative z-10 grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-primary/30 bg-primary/5 font-mono text-sm text-primary">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                v2.0 — Now with Python support
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-muted-foreground">$</span> deploy{' '}
                <span className="text-primary">--fast</span>
                <br />
                <span className="text-muted-foreground font-mono text-2xl md:text-3xl">
                  # Node.js & Python hosting
                </span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-lg">
                Ship your backend in seconds. Upload code, click run, watch it scale.
                No DevOps required.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="w-full sm:w-auto font-mono bg-primary text-primary-foreground hover:bg-primary/90 gap-2">
                    npm start
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto font-mono border-border hover:bg-muted">
                    ssh login
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right side - Terminal mockup */}
            <div className="relative">
              <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xl shadow-primary/5">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-destructive/70" />
                    <div className="w-3 h-3 rounded-full bg-warning/70" />
                    <div className="w-3 h-3 rounded-full bg-primary/70" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground ml-2">~/my-app — zsh</span>
                </div>
                
                {/* Terminal content */}
                <div className="p-4 font-mono text-sm space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-primary">❯</span>
                    <span className="text-foreground">idev deploy ./server.js</span>
                  </div>
                  <div className="text-muted-foreground pl-4 space-y-1">
                    <p>📦 Uploading files... <span className="text-primary">done</span></p>
                    <p>🔧 Installing dependencies... <span className="text-primary">done</span></p>
                    <p>🚀 Starting server... <span className="text-primary">done</span></p>
                  </div>
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-primary">✓ Deployed successfully!</p>
                    <p className="text-muted-foreground">
                      → <span className="text-accent underline">https://my-app.idevhost.io</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-primary">❯</span>
                    <span className="w-2 h-4 bg-foreground animate-pulse" />
                  </div>
                </div>
              </div>
              
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 px-3 py-1.5 rounded bg-nodejs/20 border border-nodejs/30 font-mono text-xs text-nodejs">
                Node.js 20
              </div>
              <div className="absolute -bottom-4 -left-4 px-3 py-1.5 rounded bg-python/20 border border-python/30 font-mono text-xs text-python">
                Python 3.12
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-4 border-t border-border">
          <div className="container">
            <div className="text-center mb-12">
              <p className="font-mono text-primary text-sm mb-2">// features</p>
              <h2 className="text-2xl md:text-3xl font-bold">
                Everything you need to ship
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  icon: Terminal,
                  title: 'Live Terminal',
                  description: 'SSH into your app. Debug in real-time. Full shell access.',
                  code: 'ssh panel@idev',
                },
                {
                  icon: Server,
                  title: 'File Manager',
                  description: 'Upload, edit, rename. Full control over your codebase.',
                  code: 'vim server.js',
                },
                {
                  icon: Zap,
                  title: 'One-Click Deploy',
                  description: 'Push code, click run. We handle the infrastructure.',
                  code: 'idev start',
                },
                {
                  icon: Shield,
                  title: 'Isolated Containers',
                  description: 'Each panel runs in its own secure container.',
                  code: 'docker run',
                },
                {
                  icon: Users,
                  title: '5 Panels / Account',
                  description: 'Premium users get 5 separate project environments.',
                  code: 'panels --list',
                },
                {
                  icon: Terminal,
                  title: 'Real-time Logs',
                  description: 'Stream stdout/stderr live. Never miss an error.',
                  code: 'tail -f logs',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group p-5 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-3">
                    <feature.icon className="w-6 h-6 text-primary" />
                    <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                      {feature.code}
                    </code>
                  </div>
                  <h3 className="font-semibold mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 border-t border-border">
          <div className="container">
            <div className="relative rounded-lg border border-primary/30 bg-primary/5 p-8 md:p-12 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(34,197,94,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(34,197,94,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
              
              <div className="relative z-10 space-y-6">
                <div className="font-mono text-sm text-primary">
                  <span className="text-muted-foreground">$</span> ready --to-deploy<span className="animate-pulse">_</span>
                </div>
                <h2 className="text-2xl md:text-4xl font-bold">
                  Start shipping today
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Free to start. Upgrade when you're ready to go premium.
                </p>
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="font-mono bg-primary text-primary-foreground hover:bg-primary/90">
                    Create Free Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 px-4 border-t border-border">
          <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              <span className="font-mono text-sm">
                <span className="text-primary">iDev</span>Host
              </span>
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              © 2026 iDevHost. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
