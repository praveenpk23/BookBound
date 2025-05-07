
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, UserPlus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, type FirebaseError } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { GoogleIcon } from '@/components/icons/google-icon';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  // Simplified error state for react-hook-form compatibility, though not fully using RHF here
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; form?: string }>({});


  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleEmailSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setErrors({});

    if (password !== confirmPassword) {
      const msg = "Passwords do not match.";
      setError(msg);
      setErrors(prev => ({ ...prev, confirmPassword: msg }));
      setIsLoading(false);
      toast({ title: "Signup Failed", description: msg, variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      const msg = "Password should be at least 6 characters.";
      setError(msg);
      setErrors(prev => ({ ...prev, password: msg }));
      setIsLoading(false);
      toast({ title: "Signup Failed", description: msg, variant: "destructive" });
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: "Signup Successful", description: "Your account has been created." });
      router.push('/');
    } catch (err: any) {
      console.error('Signup failed:', err);
      let errorMessage = "Signup failed. Please try again.";
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use. Please try logging in or use a different email.";
        setErrors(prev => ({ ...prev, email: "Email already in use."}));
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast({ title: "Signup Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError(null);
    setErrors({});
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: "Signup Successful", description: "Welcome!" });
      router.push('/');
    } catch (err: any) {
      console.error('Google Sign-up failed:', err);
      let errorMessage = "Google Sign-up failed. Please try again.";
       if (err.code === 'auth/popup-closed-by-user') {
          errorMessage = "Sign-up cancelled. The sign-up popup was closed before completion.";
      } else if (err.code === 'auth/cancelled-popup-request') {
          errorMessage = "Sign-up cancelled. Multiple popups were opened.";
      } else if (err.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already associated with an account. Try logging in.";
      } else if (err.code === 'auth/account-exists-with-different-credential') {
          errorMessage = "An account already exists with this email address using a different sign-in method. Try logging in with that method.";
      }
      setError(errorMessage);
      toast({ title: "Google Sign-up Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || (!authLoading && user)) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Create your BookBound Account</CardTitle>
          <CardDescription>Join us and start tracking your reading journey.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSignup} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="you@example.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                aria-describedby={errors.email ? "email-error" : undefined}
                aria-invalid={!!errors.email}
              />
              {errors.email && <p id="email-error" className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="•••••••• (min. 6 characters)" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                aria-describedby={errors.password ? "password-error" : undefined}
                aria-invalid={!!errors.password}
              />
              {errors.password && <p id="password-error" className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input 
                id="confirm-password" 
                type="password" 
                placeholder="••••••••" 
                required 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && <p id="confirm-password-error" className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>
            {error && !errors.email && !errors.password && !errors.confirmPassword && (
              <p id="form-error" className="text-sm text-destructive bg-destructive/10 p-2 rounded-md" role="alert">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Sign Up with Email
                </>
              )}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or sign up with
              </span>
            </div>
          </div>

          <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignUp} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            Sign up with Google
          </Button>

        </CardContent>
        <CardFooter className="flex flex-col items-center text-sm pt-6">
          <p className="text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

