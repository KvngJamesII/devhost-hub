import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Server, Code, Terminal, Zap, Shield, Users } from 'lucide-react';

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Server className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">iDev Host</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-gradient-primary hover:opacity-90">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button size="sm" className="bg-gradient-primary hover:opacity-90">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-16">
        <section className="relative overflow-hidden py-20 px-4">
          <div className="absolute inset-0 bg-gradient-dark opacity-50" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          
          <div className="container relative z-10 text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm">
              <Zap className="w-4 h-4 text-primary" />
              <span>Deploy in seconds, scale forever</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Host Your <span className="text-gradient-primary">Node.js</span> & 
              <span className="text-gradient-accent"> Python</span> Apps
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Deploy, manage, and scale your applications with a beautiful panel. 
              Upload your code, run it, and monitor logs in real-time.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-primary hover:opacity-90 glow-primary">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Login to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 px-4 bg-card/50">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              Everything you need to host your apps
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Code,
                  title: 'Multi-Language Support',
                  description: 'Deploy Node.js and Python applications with ease. More languages coming soon.',
                  color: 'text-nodejs',
                },
                {
                  icon: Terminal,
                  title: 'Live Terminal',
                  description: 'Interact with your app through a real-time terminal. Debug and manage directly.',
                  color: 'text-primary',
                },
                {
                  icon: Server,
                  title: 'File Management',
                  description: 'Upload, edit, rename, and organize your project files right from the panel.',
                  color: 'text-accent',
                },
                {
                  icon: Zap,
                  title: 'One-Click Deploy',
                  description: 'Click start and your code gets deployed instantly to our cloud infrastructure.',
                  color: 'text-warning',
                },
                {
                  icon: Shield,
                  title: 'Secure & Reliable',
                  description: 'Your applications run in isolated containers with enterprise-grade security.',
                  color: 'text-success',
                },
                {
                  icon: Users,
                  title: '5 Panels Per Account',
                  description: 'Premium users can create up to 5 panels to host multiple projects.',
                  color: 'text-python',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300"
                >
                  <feature.icon className={`w-10 h-10 ${feature.color} mb-4`} />
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4">
          <div className="container">
            <div className="relative rounded-2xl overflow-hidden p-8 md:p-12 text-center bg-gradient-dark border border-border">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
              
              <div className="relative z-10 space-y-6">
                <h2 className="text-2xl md:text-4xl font-bold">
                  Ready to deploy your first app?
                </h2>
                <p className="text-muted-foreground max-w-xl mx-auto">
                  Join thousands of developers hosting their applications on iDev Host. 
                  Start for free and upgrade when you're ready.
                </p>
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="bg-gradient-primary hover:opacity-90">
                    Create Free Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-border">
          <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-primary flex items-center justify-center">
                <Server className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">iDev Host</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 iDev Host. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
