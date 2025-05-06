
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookUp, Loader2 } from "lucide-react";

// Mock service import for now
// import { storeBookCover } from '@/services/book-covers'; 

interface AddBookDialogProps {
  children: ReactNode;
}

// Mock categories and statuses
const categories = ["Fiction", "Non-Fiction", "Science", "Fantasy", "Biography", "History"];
const readingStatuses = ["Want to Read", "Reading", "Finished"];

export function AddBookDialog({ children }: AddBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For client-side only rendering of file input related logic
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setCoverImage(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title || !author || !category || !status) {
      setError("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Mock submission logic
      console.log("Submitting book:", { title, author, category, status, coverImage });
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      // if (coverImage) {
      //   const coverData = await storeBookCover(coverImage);
      //   console.log("Cover stored:", coverData.coverUrl);
      // }
      console.log("Book added successfully (mock)");
      
      // Reset form and close dialog
      setTitle("");
      setAuthor("");
      setCategory("");
      setStatus("");
      setCoverImage(null);
      setCoverPreview(null);
      setOpen(false);
    } catch (err) {
      console.error("Failed to add book:", err);
      setError("Failed to add book. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px] bg-card text-card-foreground rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Add New Book</DialogTitle>
          <DialogDescription>
            Fill in the details of the book you want to track.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="author" className="text-right">
              Author
            </Label>
            <Input
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={status} onValueChange={setStatus} required>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select reading status" />
              </SelectTrigger>
              <SelectContent>
                {readingStatuses.map((stat) => (
                  <SelectItem key={stat} value={stat}>
                    {stat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isClient && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cover" className="text-right">
                Cover
              </Label>
              <div className="col-span-3">
                <Input
                  id="cover"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="file:text-primary file:font-medium"
                />
                {coverPreview && (
                  <div className="mt-2">
                    { /* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coverPreview}
                      alt="Cover preview"
                      className="h-32 w-auto rounded-md object-cover"
                      data-ai-hint="book cover"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
           {error && (
            <p className="col-span-4 text-sm text-destructive text-center bg-destructive/10 p-2 rounded-md">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                 <BookUp className="mr-2 h-4 w-4" />
                 Add Book
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
