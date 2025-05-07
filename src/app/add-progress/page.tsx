"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter, redirect } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/firebase';
import { collection, query, orderBy, onSnapshot, type DocumentData, type QuerySnapshot, getDocs } from 'firebase/firestore';
import type { BookDocument } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, BookOpen, Info, ListPlus } from 'lucide-react';
import AddReadingEntryForm from '@/components/app/add-reading-entry-form';
import { useQuery } from '@tanstack/react-query';

// Fetch books function (can be adapted from other pages or be a shared utility)
const fetchUserBooks = async (userId: string): Promise<BookDocument[]> => {
  if (!userId) return [];
  const booksCol = collection(db, `users/${userId}/books`);
  const q = query(booksCol, orderBy("title", "asc")); 
  try {
    const snapshot = await getDocs(q);
    const booksData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as BookDocument));
    return booksData;
  } catch (error) {
    console.error("Error fetching user books: ", error);
    throw error;
  }
};

export default function AddProgressPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);

  const { data: userBooks = [], isLoading: isLoadingBooks, error: booksError } = useQuery<BookDocument[], Error>({
    queryKey: ['userBooks', user?.uid], // Unique query key including user ID
    queryFn: () => fetchUserBooks(user!.uid),
    enabled: !!user, // Only run query if user exists
  });

  const selectedBook = useMemo(() => {
    if (!selectedBookId || !userBooks) return null;
    return userBooks.find(book => book.id === selectedBookId) || null;
  }, [selectedBookId, userBooks]);

  useEffect(() => {
    if (!authLoading && !user) {
      redirect('/login');
    }
  }, [user, authLoading, router]);


  if (authLoading || (user && isLoadingBooks)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) { // Should be caught by useEffect, but good for safety
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  if (booksError) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="mt-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Error Loading Books</AlertTitle>
          <AlertDescription>{booksError.message || "Failed to load your books. Please try again."}</AlertDescription>
        </Alert>
         <Button onClick={() => router.push('/')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="ml-3 text-2xl font-bold text-foreground">BookBound</h1>
          </Link>
          <Button variant="outline" onClick={() => router.push('/')}>Back to Library</Button>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <Card className="mb-8 shadow-lg max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
                <ListPlus className="mr-3 h-6 w-6 text-primary" />
                Log Reading Progress
            </CardTitle>
            <CardDescription>Select a book and log your reading session details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
                <label htmlFor="book-select" className="block text-sm font-medium text-foreground mb-1">Choose a Book</label>
                {userBooks.length > 0 ? (
                <Select onValueChange={setSelectedBookId} value={selectedBookId || undefined}>
                    <SelectTrigger id="book-select" className="w-full">
                    <SelectValue placeholder="Select a book..." />
                    </SelectTrigger>
                    <SelectContent>
                    {userBooks.map(book => (
                        <SelectItem key={book.id} value={book.id}>
                        {book.title} (by {book.author})
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                ) : (
                <p className="text-muted-foreground text-sm">You haven't added any books yet. <Link href="/" className="text-primary hover:underline">Add a book</Link> to log progress.</p>
                )}
            </div>

            {selectedBook && (
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-1">Logging progress for: <span className="text-primary">{selectedBook.title}</span></h3>
                {selectedBook.totalPages && <p className="text-sm text-muted-foreground mb-3">Current progress: {selectedBook.pagesRead || 0} / {selectedBook.totalPages} pages.</p>}
                <AddReadingEntryForm 
                  bookId={selectedBook.id} 
                  currentPagesRead={selectedBook.pagesRead || 0} 
                  totalPages={selectedBook.totalPages} 
                />
              </div>
            )}
             {!selectedBookId && !isLoadingBooks && userBooks.length > 0 && (
                <div className="text-center text-muted-foreground py-4">
                    <p>Please select a book above to log your reading progress.</p>
                </div>
             )}
          </CardContent>
        </Card>
      </main>
       <footer className="py-6 md:px-8 md:py-0 border-t mt-12">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-20 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BookBound. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
