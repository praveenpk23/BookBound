
import { BookOpen, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddBookDialog } from '@/components/app/add-book-dialog';
import BookGrid from '@/components/app/book-grid';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="ml-3 text-2xl font-bold text-foreground">BookBound</h1>
          </div>
          <nav className="flex items-center space-x-4">
            {/* Placeholder for future navigation items like user profile dropdown */}
            <AddBookDialog>
              <Button>
                <PlusCircle className="mr-2 h-5 w-5" />
                Add New Book
              </Button>
            </AddBookDialog>
          </nav>
        </div>
      </header>

      <main className="flex-1 container py-8">
        <div className="mb-6">
          <h2 className="text-3xl font-semibold text-foreground">My Reading Dashboard</h2>
          <p className="text-muted-foreground">Track your literary adventures.</p>
        </div>
        <BookGrid />
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
