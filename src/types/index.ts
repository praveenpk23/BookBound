
import type { Timestamp } from 'firebase/firestore';

export type BookStatus = 'Want to Read' | 'Reading' | 'Finished';

export interface BookBase {
  title: string;
  author: string;
  category: string;
  status: BookStatus;
  coverUrl?: string;
  totalPages?: number;
  isbn?: string; // Optional ISBN for book fetching
  description?: string; // Optional description
}

export interface BookDocument extends BookBase {
  id: string; // Firestore document ID
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  pagesRead?: number; 
}

export interface ReadingEntryBase {
  bookId: string;
  startPage: number;
  endPage: number;
  pagesReadThisSession: number; 
  newTotalPagesRead: number; 
  takeaway: string;
  date: Timestamp;
}

export interface ReadingEntryDocument extends ReadingEntryBase {
  id: string; // Firestore document ID
  userId: string;
}

// For AddBookForm state
export interface BookFormData {
  title: string;
  author: string;
  category: string;
  status: BookStatus;
  coverImage?: FileList;
  coverUrl?: string; // If user provides URL directly
  totalPages?: number;
  isbn?: string;
  description?: string;
}

// For AddReadingEntryForm state
export interface ReadingEntryFormData {
  startPage: number;
  endPage: number;
  takeaway: string;
  date?: Date; // Optional date override, defaults to now
}

