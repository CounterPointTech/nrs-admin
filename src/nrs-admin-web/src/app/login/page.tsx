'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(username, password);

    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="relative flex h-screen items-center justify-center overflow-hidden bg-background">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute inset-0 bg-radial-gradient" />

        <div className="relative flex flex-col items-center gap-4">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Shield className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <span className="absolute inset-0 rounded-2xl bg-primary/20 animate-pulse-glow" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-radial-gradient" />

      <div className="absolute top-1/4 -left-32 h-64 w-64 rounded-full bg-primary/10 blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 -right-32 h-64 w-64 rounded-full bg-primary/5 blur-[100px] animate-float" style={{ animationDelay: '1.5s' }} />

      <Card className="relative w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl animate-fade-in-scale shadow-2xl shadow-black/20">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />

        <CardHeader className="relative text-center pb-2">
          <div className="mx-auto mb-6">
            <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20">
              <Shield className="h-8 w-8 text-primary" />
              <span className="absolute inset-0 rounded-2xl animate-pulse-glow" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold gradient-text">
            NRS Admin
          </CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Novarad Administration Tools
          </CardDescription>
        </CardHeader>

        <CardContent className="relative pt-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <Alert variant="destructive" className="animate-fade-in border-destructive/50 bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your Novarad username"
                required
                disabled={isSubmitting}
                autoComplete="username"
                className="h-11 bg-background/50 border-border/50 focus:border-primary/50 transition-colors duration-200"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className="h-11 pr-10 bg-background/50 border-border/50 focus:border-primary/50 transition-colors duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-200"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full font-medium transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground/60">
            NovaPACS &amp; NovaRIS Administration
          </p>
        </CardContent>
      </Card>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/40">
        NRS Admin v1.0
      </div>
    </div>
  );
}
