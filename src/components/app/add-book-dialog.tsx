
"use client";

import type { ReactNode } from 'react';
import { useState, useEffect }from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { BookUp, Loader2 } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { BookFormData, BookStatus } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { isValidHttpUrl } from '@/lib/utils';

interface AddBookDialogProps {
  children: ReactNode;
}

const categories = ["Fiction", "Non-Fiction", "Science", "Fantasy", "Biography", "History", "Sci-Fi", "Mystery", "Thriller", "Romance", "Self-Help", "Other"];
const readingStatuses: BookStatus[] = ["Want to Read", "Reading", "Finished"];

const bookFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  category: z.string().min(1, "Category is required"),
  status: z.enum(["Want to Read", "Reading", "Finished"]),
  totalPages: z.coerce.number().int().positive().optional().nullable(),
  coverUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  isbn: z.string().optional(),
  description: z.string().optional(),
});


export function AddBookDialog({ children }: AddBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<BookFormData>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      status: "Want to Read",
      title: "",
      author: "",
      category: "",
      coverUrl: "", 
      isbn: "",
      description: "",
    }
  });

  const watchedCoverUrl = watch("coverUrl");

  useEffect(() => {
    if (watchedCoverUrl && isValidHttpUrl(watchedCoverUrl)) {
      setCoverPreview(watchedCoverUrl);
    } else { 
      setCoverPreview(null);
    }
  }, [watchedCoverUrl]);

  const onSubmit: SubmitHandler<BookFormData> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to add a book.", variant: "destructive" });
      return;
    }

    try {
      let processedCoverUrlForFirestore = data.coverUrl || ''; 
      
      if (!processedCoverUrlForFirestore && data.title) {
        // If no URL is provided, use a placeholder based on the title
        processedCoverUrlForFirestore = `https://picsum.photos/seed/${encodeURIComponent(data.title)}/300/450`;
      } else if (!processedCoverUrlForFirestore) {
        // Default placeholder if no title and no URL
        processedCoverUrlForFirestore = `https://picsum.photos/seed/default-new-book/300/450`;
      }


      const bookDataForFirestore = {
        title: data.title,
        author: data.author,
        category: data.category,
        status: data.status,
        totalPages: data.totalPages ?? null,
        isbn: data.isbn ?? null,
        description: data.description ?? null,
        coverUrl: processedCoverUrlForFirestore, 
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pagesRead: 0,
      };
      
      await addDoc(collection(db, `users/${user.uid}/books`), bookDataForFirestore);

      toast({ title: "Book Added", description: `${data.title} has been added to your library.` });
      queryClient.invalidateQueries({ queryKey: ['books', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['userBooks', user?.uid] });
      reset();
      setCoverPreview(null);
      setOpen(false);
    } catch (err: any) { 
      console.error("Failed to add book:", err);
      toast({ title: "Error", description: err.message || "Failed to add book. Please try again.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        reset();
        setCoverPreview(null);
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px] bg-card text-card-foreground rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Add New Book</DialogTitle>
          <DialogDescription>
            Fill in the details of the book you want to track.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          
          <div className="space-y-1">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="author">Author</Label>
            <Input id="author" {...register("author")} />
            {errors.author && <p className="text-sm text-destructive">{errors.author.message}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="category">Category</Label>
              <Controller name="category" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="status">Status</Label>
               <Controller name="status" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select reading status" /></SelectTrigger>
                  <SelectContent>
                    {readingStatuses.map((stat) => <SelectItem key={stat} value={stat}>{stat}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="totalPages">Total Pages (Optional)</Label>
            <Input id="totalPages" type="number" {...register("totalPages")} />
            {errors.totalPages && <p className="text-sm text-destructive">{errors.totalPages.message}</p>}
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="isbn">ISBN (Optional)</Label>
            <Input id="isbn" {...register("isbn")} placeholder="e.g., 978-0321765723"/>
            {errors.isbn && <p className="text-sm text-destructive">{errors.isbn.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...register("description")} placeholder="Brief summary or notes..." />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="coverUrl">Cover Image URL (Optional)</Label>
            <Input id="coverUrl" {...register("coverUrl")} placeholder="Enter image URL (e.g., https://...)" />
            {errors.coverUrl && <p className="text-sm text-destructive">{errors.coverUrl.message}</p>}
            {coverPreview && isValidHttpUrl(coverPreview) ? (
                <div className="mt-2 flex justify-center">
                    <Image src={coverPreview} alt="Cover preview" width={120} height={180} className="h-36 w-auto rounded-md object-cover" data-ai-hint="book cover preview" />
                </div>
              ) : (
                 <div className="mt-2 h-36 w-full bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">No Preview Available / Invalid URL</div>
            )}
          </div>

          {errors.root && <p className="col-span-full text-sm text-destructive text-center bg-destructive/10 p-2 rounded-md">{errors.root.message}</p>}
          
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
