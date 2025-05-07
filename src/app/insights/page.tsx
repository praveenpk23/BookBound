
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc, Timestamp, type DocumentData, type QuerySnapshot, getDocs } from 'firebase/firestore';
import type { BookDocument, ReadingEntryDocument } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, BookOpen, Info, CalendarDays, MessageSquare, Tag, User, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';

// Helper function from book detail page
const isValidHttpUrl = (string?: string): string is string => {
  if (!string) return false;
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

// Fetch books function (can be adapted from BookGrid or kept similar)
const fetchUserBooks = async (userId: string): Promise<BookDocument[]> => {
  if (!userId) return [];
  const booksCol = collection(db, `users/${userId}/books`);
  const q = query(booksCol, orderBy("title", "asc")); // Order by title for dropdown
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


export default function InsightsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [readingEntries, setReadingEntries] = useState<ReadingEntryDocument[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [fetchEntriesError, setFetchEntriesError] = useState<string | null>(null);

  const { data: userBooks = [], isLoading: isLoadingBooks, error: booksError } = useQuery<BookDocument[], Error>({
    queryKey: ['userBooks', user?.uid],
    queryFn: () => fetchUserBooks(user!.uid),
    enabled: !!user,
  });

  const selectedBook = useMemo(() => {
    if (!selectedBookId || !userBooks) return null;
    return userBooks.find(book => book.id === selectedBookId) || null;
  }, [selectedBookId, userBooks]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!selectedBookId || !user) {
      setReadingEntries([]);
      return;
    }

    setIsLoadingEntries(true);
    setFetchEntriesError(null);
    const entriesColRef = collection(db, `users/${user.uid}/books/${selectedBookId}/readingEntries`);
    const qEntries = query(entriesColRef, orderBy("date", "desc"));
    
    const unsubscribeEntries = onSnapshot(qEntries, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReadingEntryDocument));
      setReadingEntries(entries);
      setIsLoadingEntries(false);
    }, (err) => {
      console.error("Error fetching reading entries for insights:", err);
      setFetchEntriesError("Failed to load reading entries.");
      setIsLoadingEntries(false);
    });
    
    return () => unsubscribeEntries();
  }, [selectedBookId, user]);


  if (authLoading || isLoadingBooks) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (booksError) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="mt-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{booksError.message || "Failed to load your books."}</AlertDescription>
        </Alert>
         <Button onClick={() => router.push('/')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }
  
  let displayCoverUrl: string | undefined;
  if (selectedBook) {
    if (typeof selectedBook.coverUrl === 'string' && selectedBook.coverUrl.trim() !== '' && isValidHttpUrl(selectedBook.coverUrl)) {
      displayCoverUrl = selectedBook.coverUrl;
    } else {
      const seed = selectedBook.title ? encodeURIComponent(selectedBook.title) : selectedBook.id || 'default-book-insight';
      displayCoverUrl = `https://picsum.photos/seed/${seed}/300/450`;
    }
  }

  return (
    <div className="bg-background min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="ml-3 text-2xl font-bold text-foreground">BookBound Insights</h1>
          </Link>
          <Button variant="outline" onClick={() => router.push('/')}>Back to Library</Button>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Select a Book to View Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {userBooks.length > 0 ? (
              <Select onValueChange={setSelectedBookId} value={selectedBookId || undefined}>
                <SelectTrigger className="w-full md:w-[400px]">
                  <SelectValue placeholder="Choose a book..." />
                </SelectTrigger>
                <SelectContent>
                  {userBooks.map(book => (
                    <SelectItem key={book.id} value={book.id}>
                      {book.title} by {book.author}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-muted-foreground">You haven't added any books yet. <Link href="/" className="text-primary hover:underline">Add a book</Link> to see insights.</p>
            )}
          </CardContent>
        </Card>

        {selectedBookId && !selectedBook && !isLoadingBooks && (
           <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Book Not Found</AlertTitle>
            <AlertDescription>The selected book could not be found in your library.</AlertDescription>
          </Alert>
        )}

        {selectedBook && (
          <div className="grid md:grid-cols-3 gap-8">
            {/* Selected Book Info */}
            <div className="md:col-span-1 space-y-6">
               <Card className="shadow-xl overflow-hidden">
                {displayCoverUrl && (
                  <div className="aspect-[2/3] w-full relative">
                    <Image
                      src={displayCoverUrl}
                      alt={`Cover of ${selectedBook.title}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                      data-ai-hint="book cover insight"
                      priority
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <CardTitle className="text-2xl font-bold mb-2">{selectedBook.title}</CardTitle>
                  <p className="text-md text-muted-foreground mb-1"><User className="inline-block h-4 w-4 mr-2" />{selectedBook.author}</p>
                  <p className="text-sm text-muted-foreground mb-3"><Tag className="inline-block h-4 w-4 mr-2" />{selectedBook.category}</p>
                  <Badge variant={selectedBook.status === 'Finished' ? 'default' : selectedBook.status === 'Reading' ? 'secondary' : 'outline'} className="text-sm mb-3">
                    <Activity className="inline-block h-4 w-4 mr-1.5" />{selectedBook.status}
                  </Badge>
                  <Link href={`/book/${selectedBook.id}`} className="mt-2">
                    <Button variant="outline" className="w-full">View Full Details</Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Reading Entries for Selected Book */}
            <div className="md:col-span-2 space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Reading History &amp; Takeaways</CardTitle>
                  <CardDescription>Insights from your reading sessions for "{selectedBook.title}".</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingEntries ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : fetchEntriesError ? (
                     <Alert variant="destructive">
                        <Info className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{fetchEntriesError}</AlertDescription>
                    </Alert>
                  ) : readingEntries.length > 0 ? (
                    <ul className="space-y-6">
                      {readingEntries.map(entry => (
                        <li key={entry.id} className="border p-4 rounded-md shadow-sm bg-muted/20">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-primary">
                                Pages {entry.startPage} → {entry.endPage}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ({entry.pagesReadThisSession} page{entry.pagesReadThisSession !== 1 ? 's' : ''} read)
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center whitespace-nowrap">
                              <CalendarDays className="inline-block h-3 w-3 mr-1" />
                              {entry.date instanceof Timestamp ? format(entry.date.toDate(), 'MMM d, yyyy') : 'Invalid Date'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            Total pages read after session: {entry.newTotalPagesRead}
                          </p>
                          {entry.takeaway && (
                            <div className="mt-3 text-sm">
                              <h4 className="font-medium mb-1 text-foreground flex items-center">
                                <MessageSquare className="inline-block h-4 w-4 mr-1.5 text-primary" />
                                Takeaway:
                              </h4>
                              <p className="pl-1 text-muted-foreground bg-background p-2 rounded-md whitespace-pre-wrap">{entry.takeaway}</p>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No reading entries yet for this book.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
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
