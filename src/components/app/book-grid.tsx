
"use client";

import { useState, useEffect } from 'react';
import BookCard, { type Book } from './book-card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { List, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Mock data for books
const mockBooks: Book[] = [
  { id: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Fiction', status: 'Finished', coverUrl: 'https://picsum.photos/seed/great-gatsby/300/450' },
  { id: '2', title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', category: 'Non-Fiction', status: 'Reading', coverUrl: 'https://picsum.photos/seed/sapiens/300/450' },
  { id: '3', title: 'Dune', author: 'Frank Herbert', category: 'Science Fiction', status: 'Want to Read', coverUrl: 'https://picsum.photos/seed/dune/300/450' },
  { id: '4', title: 'To Kill a Mockingbird', author: 'Harper Lee', category: 'Fiction', status: 'Finished' },
  { id: '5', title: '1984', author: 'George Orwell', category: 'Dystopian', status: 'Reading' },
  { id: '6', title: 'The Hobbit', author: 'J.R.R. Tolkien', category: 'Fantasy', status: 'Want to Read', coverUrl: 'https://picsum.photos/seed/the-hobbit/300/450' },
  { id: '7', title: 'Cosmos', author: 'Carl Sagan', category: 'Science', status: 'Finished' },
  { id: '8', title: 'Educated: A Memoir', author: 'Tara Westover', category: 'Biography', status: 'Reading' },
];

const categories = ["All", "Fiction", "Non-Fiction", "Science Fiction", "Dystopian", "Fantasy", "Science", "Biography", "History"];
const statuses = ["All", "Want to Read", "Reading", "Finished"];

export default function BookGrid() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Default to grid view

  useEffect(() => {
    // Simulate fetching books
    setBooks(mockBooks);
    setFilteredBooks(mockBooks);
  }, []);

  useEffect(() => {
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

    setFilteredBooks(tempBooks);
  }, [searchTerm, selectedCategory, selectedStatus, books]);


  if (books.length === 0) {
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
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map(stat => <SelectItem key={stat} value={stat}>{stat}</SelectItem>)}
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

      {filteredBooks.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          // Basic List View (can be expanded later)
          <div className="space-y-4">
            {filteredBooks.map((book) => (
              <Card key={book.id} className="flex items-center p-4 shadow hover:shadow-md transition-shadow">
                <div className="w-16 h-24 relative mr-4 flex-shrink-0">
                   <img 
                    src={book.coverUrl || `https://picsum.photos/seed/${book.title.replace(/\s+/g, '-')}/100/150`} 
                    alt={book.title} 
                    className="w-full h-full object-cover rounded"
                    data-ai-hint="book cover"
                    />
                </div>
                <div className="flex-grow">
                  <h3 className="text-lg font-semibold">{book.title}</h3>
                  <p className="text-sm text-muted-foreground">{book.author}</p>
                  <p className="text-xs text-muted-foreground">{book.category}</p>
                </div>
                <Badge variant={book.status === 'Finished' ? 'default' : book.status === 'Reading' ? 'secondary' : 'outline'}>{book.status}</Badge>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-10">
          <p className="text-xl text-muted-foreground">No books match your filters.</p>
        </div>
      )}
    </div>
  );
}
