
"use client";

import { BookOpen, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddBookDialog } from '@/components/app/add-book-dialog';
import BookGrid from '@/components/app/book-grid';
import AuthNav from '@/components/app/auth-nav';
import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="ml-3 text-2xl font-bold text-foreground">BookBound</h1>
          </Link>
          <nav className="flex items-center space-x-4">
            {user && (
              <AddBookDialog>
                <Button>
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Add New Book
                </Button>
              </AddBookDialog>
            )}
            <AuthNav />
          </nav>
        </div>
      </header>

      <main className="flex-1 container py-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : user ? (
          <>
            <div className="mb-6">
              <h2 className="text-3xl font-semibold text-foreground">My Reading Dashboard</h2>
              <p className="text-muted-foreground">Track your literary adventures, {user.displayName || user.email}.</p>
            </div>
            <BookGrid />
          </>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="mx-auto h-24 w-24 text-primary mb-6" />
            <h2 className="text-4xl font-bold mb-4 text-foreground">Welcome to BookBound</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Your personal space to track books, monitor reading progress, and cherish literary insights.
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              Please <Link href="/login" className="text-primary hover:underline font-medium">login</Link> or <Link href="/signup" className="text-primary hover:underline font-medium">sign up</Link> to begin your journey.
            </p>
          </div>
        )}
      </main>

      <footer className="py-6 md:px-8 md:py-0 border-t">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-20 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BookBound. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
