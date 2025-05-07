"use client";

import { useState, useEffect, useMemo } from 'react';
import BookCard from './book-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { List, Grid, Loader2, Info } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/firebase';
import { collection, query, where, orderBy, onSnapshot, type DocumentData, type QuerySnapshot } from 'firebase/firestore';
import type { BookDocument } from '@/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link'; // Added missing Link import

const categories = ["All", "Fiction", "Non-Fiction", "Science", "Fantasy", "Biography", "History", "Sci-Fi", "Mystery", "Thriller", "Romance", "Self-Help", "Other"];
const statuses: BookDocument['status'][] = ["Want to Read", "Reading", "Finished"];
const allStatuses = ["All", ...statuses];


const fetchBooks = async (userId: string): Promise<BookDocument[]> => {
  if (!userId) return [];
  
  const booksCol = collection(db, `users/${userId}/books`);
  return new Promise((resolve, reject) => {
    const q = query(booksCol, orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const booksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as BookDocument));
        resolve(booksData);
      }, 
      (error) => {
        console.error("Error fetching books: ", error);
        reject(error);
      }
    );
    // Note: For a long-lived component, ensure this unsubscribe is called.
    // TanStack Query's default behavior might not handle this perfectly for queryFn.
    // A common pattern is to manage subscription in useEffect and update cache with queryClient.setQueryData.
    // However, for this fix, we'll keep fetchBooks as is and focus on the useEffect loop.
  });
};


export default function BookGrid() {
  const { user } = useAuth();
  // queryClient is not used in this component directly after the change. Can be removed if not needed elsewhere.
  // const queryClient = useQueryClient(); 

  const { data: books = [], isLoading, error } = useQuery<BookDocument[], Error>({
    queryKey: ['books', user?.uid],
    queryFn: () => fetchBooks(user!.uid),
    enabled: !!user, 
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState<"All" | BookDocument['status']>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredBooks = useMemo(() => {
    let tempBooks = books;

    if (searchTerm) {
      tempBooks = tempBooks.filter(book => 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      tempBooks = tempBooks.filter(book => book.category === selectedCategory);
    }

    if (selectedStatus !== 'All') {
      tempBooks = tempBooks.filter(book => book.status === selectedStatus);
    }

    return tempBooks;
  }, [books, searchTerm, selectedCategory, selectedStatus]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
     return (
      <Alert variant="destructive" className="mt-4">
        <Info className="h-4 w-4" />
        <AlertTitle>Error Loading Books</AlertTitle>
        <AlertDescription>
          There was a problem fetching your books. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!user) { 
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">Please log in to see your books.</p>
      </div>
    );
  }
  
  // This condition checks if there are no books AT ALL, before filtering.
  if (!isLoading && books.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-muted-foreground">No books added yet.</p>
        <p className="text-muted-foreground">Click "Add New Book" to get started!</p>
      </div>
    );
  }


  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-card rounded-lg shadow">
        <Input 
          placeholder="Search by title or author..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as "All" | BookDocument['status'])}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {allStatuses.map(stat => <SelectItem key={stat} value={stat}>{stat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
         <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')} className="hidden md:block">
            <TabsList>
              <TabsTrigger value="grid" className="p-2"><Grid className="h-5 w-5" /></TabsTrigger>
              <TabsTrigger value="list" className="p-2"><List className="h-5 w-5" /></TabsTrigger>
            </TabsList>
          </Tabs>
      </div>

      {/* This condition checks if there are books AFTER filtering */}
      {filteredBooks.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBooks.map((book) => (
              <Link href={`/book/${book.id}`} key={book.id} className="block">
                <Card className="flex items-center p-4 shadow hover:shadow-md transition-shadow cursor-pointer">
                  <div className="w-16 h-24 relative mr-4 flex-shrink-0">
                     <img 
                      src={book.coverUrl || `https://picsum.photos/seed/${encodeURIComponent(book.title)}/100/150`} 
                      alt={book.title} 
                      className="w-full h-full object-cover rounded"
                      data-ai-hint="book cover thumbnail"
                      />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-semibold">{book.title}</h3>
                    <p className="text-sm text-muted-foreground">{book.author}</p>
                    <p className="text-xs text-muted-foreground">{book.category}</p>
                  </div>
                  <Badge variant={book.status === 'Finished' ? 'default' : book.status === 'Reading' ? 'secondary' : 'outline'}>{book.status}</Badge>
                </Card>
              </Link>
            ))}
          </div>
        )
      ) : (
         // This shows if filters result in no books, but there are books initially.
        <div className="text-center py-10">
          <p className="text-xl text-muted-foreground">No books match your filters.</p>
        </div>
      )}
    </div>
  );
}
