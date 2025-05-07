
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc, onSnapshot, collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { BookDocument, ReadingEntryDocument } from '@/types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookOpen, CalendarDays, Edit, FileText, Info, Loader2, MessageSquare, Tag, User, Activity } from 'lucide-react';
import AddReadingEntryForm from '@/components/app/add-reading-entry-form';
import EditBookDialog from '@/components/app/edit-book-dialog'; // Import EditBookDialog
import Link from 'next/link';
import { format } from 'date-fns';

// Helper function to validate if a string is a valid HTTP/HTTPS URL
const isValidHttpUrl = (string?: string): string is string => {
  if (!string) return false;
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
};

export default function BookDetailPage() {
  const params = useParams();
  const bookId = params.bookId as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [book, setBook] = useState<BookDocument | null>(null);
  const [readingEntries, setReadingEntries] = useState<ReadingEntryDocument[]>([]);
  const [isLoadingBook, setIsLoadingBook] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!bookId) {
        setError("Book ID is missing.");
        setIsLoadingBook(false);
        return;
    }

    // Fetch Book Details
    const bookDocRef = doc(db, `users/${user.uid}/books/${bookId}`);
    const unsubscribeBook = onSnapshot(bookDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setBook({ id: docSnap.id, ...docSnap.data() } as BookDocument);
      } else {
        setError("Book not found.");
        setBook(null);
      }
      setIsLoadingBook(false);
    }, (err) => {
      console.error("Error fetching book:", err);
      setError("Failed to load book details.");
      setIsLoadingBook(false);
    });

    // Fetch Reading Entries
    const entriesColRef = collection(db, `users/${user.uid}/books/${bookId}/readingEntries`);
    const qEntries = query(entriesColRef, orderBy("date", "desc"));
    const unsubscribeEntries = onSnapshot(qEntries, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReadingEntryDocument));
      setReadingEntries(entries);
      setIsLoadingEntries(false);
    }, (err) => {
      console.error("Error fetching reading entries:", err);
      // setError("Failed to load reading entries."); // Don't overwrite book error
      setIsLoadingEntries(false);
    });
    
    return () => {
      unsubscribeBook();
      unsubscribeEntries();
    };
  }, [bookId, user, authLoading, router]);

  const getStatusBadgeVariant = (status?: BookDocument['status']) => {
    if (!status) return 'outline';
    switch (status) {
      case 'Finished': return 'default';
      case 'Reading': return 'secondary';
      case 'Want to Read': return 'outline';
      default: return 'outline';
    }
  };

  if (authLoading || isLoadingBook) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert variant="destructive" className="mt-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-xl text-muted-foreground">Book not found or you do not have access.</p>
        <Button onClick={() => router.push('/')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }
  
  let displayCoverUrl: string;
  if (typeof book.coverUrl === 'string' && book.coverUrl.trim() !== '' && isValidHttpUrl(book.coverUrl)) {
    displayCoverUrl = book.coverUrl;
  } else {
    const seed = book.title ? encodeURIComponent(book.title) : bookId || 'default-book-detail';
    displayCoverUrl = `https://picsum.photos/seed/${seed}/400/600`;
  }
  
  const progress = book.totalPages && book.pagesRead ? Math.round((book.pagesRead / book.totalPages) * 100) : 0;


  return (
    <div className="bg-background min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center">
            <BookOpen className="h-8 w-8 text-primary" />
            <h1 className="ml-3 text-2xl font-bold text-foreground">BookBound</h1>
          </Link>
          <Button variant="outline" onClick={() => router.back()}>Back to Library</Button>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Book Info Column */}
          <div className="md:col-span-1 space-y-6">
            <Card className="shadow-xl overflow-hidden">
              <div className="aspect-[2/3] w-full relative">
                <Image
                  src={displayCoverUrl}
                  alt={`Cover of ${book.title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                  data-ai-hint="book cover detail"
                  priority
                />
              </div>
              <CardContent className="p-4">
                <CardTitle className="text-2xl font-bold mb-2">{book.title}</CardTitle>
                <p className="text-md text-muted-foreground mb-1"><User className="inline-block h-4 w-4 mr-2" />{book.author}</p>
                <p className="text-sm text-muted-foreground mb-3"><Tag className="inline-block h-4 w-4 mr-2" />{book.category}</p>
                <Badge variant={getStatusBadgeVariant(book.status)} className="text-sm mb-3">
                  <Activity className="inline-block h-4 w-4 mr-1.5" />{book.status}
                </Badge>
                {book.totalPages && (
                  <div>
                    <Progress value={progress} className="h-2.5 w-full mb-1" />
                    <p className="text-sm text-muted-foreground">{`${book.pagesRead || 0} / ${book.totalPages} pages (${progress}%)`}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4">
                <EditBookDialog book={book}>
                    <Button className="w-full"><Edit className="mr-2 h-4 w-4" /> Edit Book</Button>
                </EditBookDialog>
              </CardFooter>
            </Card>
            {book.description && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{book.description}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Reading Entries & Form Column */}
          <div className="md:col-span-2 space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Add Reading Entry</CardTitle>
                <CardDescription>Log your progress and takeaways for this book.</CardDescription>
              </CardHeader>
              <CardContent>
                <AddReadingEntryForm bookId={book.id} currentPagesRead={book.pagesRead || 0} totalPages={book.totalPages} />
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Reading Insights & History</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingEntries ? (
                   <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
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
                  <p className="text-muted-foreground text-center py-4">No reading entries yet. Start logging your progress!</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
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
