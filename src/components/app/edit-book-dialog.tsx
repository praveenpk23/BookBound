"use client";

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
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
import { BookUp, Loader2, ImageUp, Edit } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { db, storage } from '@/lib/firebase/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import type { BookDocument, BookFormData, BookStatus } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { isValidHttpUrl } from '@/lib/utils'; // Updated import

interface EditBookDialogProps {
  book: BookDocument;
  children: ReactNode;
}

const categories = ["Fiction", "Non-Fiction", "Science", "Fantasy", "Biography", "History", "Sci-Fi", "Mystery", "Thriller", "Romance", "Self-Help", "Other"];
const readingStatuses: BookStatus[] = ["Want to Read", "Reading", "Finished"];

// Schema can be largely reused from AddBookDialog
const bookFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  category: z.string().min(1, "Category is required"),
  status: z.enum(["Want to Read", "Reading", "Finished"]),
  totalPages: z.coerce.number().int().positive().optional().nullable(),
  coverImage: z.instanceof(FileList).optional(),
  coverUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  isbn: z.string().optional(),
  description: z.string().optional(),
});

export default function EditBookDialog({ book, children }: EditBookDialogProps) {
  const [open, setOpen] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<BookFormData>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: book.title,
      author: book.author,
      category: book.category,
      status: book.status,
      totalPages: book.totalPages || undefined,
      coverUrl: book.coverUrl || '',
      isbn: book.isbn || '',
      description: book.description || '',
    }
  });

  const watchedCoverImage = watch("coverImage");
  const watchedCoverUrl = watch("coverUrl");

  useEffect(() => {
    if (watchedCoverImage && watchedCoverImage.length > 0) {
      const file = watchedCoverImage[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setValue("coverUrl", ""); // Clear URL if file is chosen
    } else if (watchedCoverUrl && isValidHttpUrl(watchedCoverUrl)) {
      setCoverPreview(watchedCoverUrl);
    } else if (book.coverUrl && isValidHttpUrl(book.coverUrl)) {
      setCoverPreview(book.coverUrl);
    } else {
      setCoverPreview(null);
    }
  }, [watchedCoverImage, watchedCoverUrl, book.coverUrl, setValue]);


  useEffect(() => {
    // Reset form when dialog opens with new book data or when book prop changes
    if (open) {
      reset({
        title: book.title,
        author: book.author,
        category: book.category,
        status: book.status,
        totalPages: book.totalPages || undefined,
        coverUrl: book.coverUrl && isValidHttpUrl(book.coverUrl) ? book.coverUrl : '',
        isbn: book.isbn || '',
        description: book.description || '',
      });
       if (book.coverUrl && isValidHttpUrl(book.coverUrl)) {
        setCoverPreview(book.coverUrl);
      } else {
        setCoverPreview(null);
      }
    }
  }, [book, open, reset]);

  const onSubmit: SubmitHandler<BookFormData> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to edit a book.", variant: "destructive" });
      return;
    }

    try {
      let newCoverUrlForFirestore = (book.coverUrl && isValidHttpUrl(book.coverUrl)) ? book.coverUrl : '';

      // Handle new image upload
      if (data.coverImage && data.coverImage.length > 0) {
        const file = data.coverImage[0];
        // Delete old image from Firebase Storage if it exists and is from Firebase Storage
        if (book.coverUrl && book.coverUrl.includes('firebasestorage.googleapis.com')) {
          try {
            const oldImageRef = ref(storage, book.coverUrl);
            await deleteObject(oldImageRef);
          } catch (deleteError: any) {
            console.warn("Could not delete old cover image:", deleteError.message);
          }
        }
        
        const storageRef = ref(storage, `covers/${user.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        newCoverUrlForFirestore = await getDownloadURL(snapshot.ref);
      } else if (data.coverUrl && isValidHttpUrl(data.coverUrl) && data.coverUrl !== book.coverUrl) {
        // Handle new URL input (if different from old and valid)
        newCoverUrlForFirestore = data.coverUrl;
         // If old URL was from Firebase Storage and new URL is different (or empty), delete old
        if (book.coverUrl && book.coverUrl.includes('firebasestorage.googleapis.com') && newCoverUrlForFirestore !== book.coverUrl) {
           try {
            const oldImageRef = ref(storage, book.coverUrl);
            await deleteObject(oldImageRef);
          } catch (deleteError: any) {
            console.warn("Could not delete old cover image on URL change:", deleteError.message);
          }
        }
      } else if (!data.coverImage && (!data.coverUrl || !isValidHttpUrl(data.coverUrl))) {
        // If no new file, and new URL is empty or invalid, try to keep old valid URL, or clear it
        if (book.coverUrl && book.coverUrl.includes('firebasestorage.googleapis.com') && (!data.coverUrl || data.coverUrl === '')) {
           // If URL field was cleared and old was firebase, delete from storage
           try {
            const oldImageRef = ref(storage, book.coverUrl);
            await deleteObject(oldImageRef);
          } catch (deleteError: any) {
            console.warn("Could not delete old cover image on URL clear:", deleteError.message);
          }
        }
        newCoverUrlForFirestore = ''; // Clear URL if no valid new one and no file
      }


      // If no cover URL after all processing, set a placeholder
      if (!newCoverUrlForFirestore && data.title) {
          newCoverUrlForFirestore = `https://picsum.photos/seed/${encodeURIComponent(data.title)}/300/450`;
      } else if (!newCoverUrlForFirestore) {
          // Fallback if title also becomes empty (though schema should prevent)
          newCoverUrlForFirestore = `https://picsum.photos/seed/${book.id || 'default-book-edit'}/300/450`;
      }


      const updatedBookData = {
        title: data.title,
        author: data.author,
        category: data.category,
        status: data.status,
        totalPages: data.totalPages ?? null,
        isbn: data.isbn ?? null,
        description: data.description ?? null,
        coverUrl: newCoverUrlForFirestore,
        updatedAt: serverTimestamp(),
      };

      const bookRef = doc(db, `users/${user.uid}/books/${book.id}`);
      await updateDoc(bookRef, updatedBookData);

      toast({ title: "Book Updated", description: `${data.title} has been updated.` });
      queryClient.invalidateQueries({ queryKey: ['books', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['userBooks', user.uid] });
      queryClient.invalidateQueries({ queryKey: ['book', book.id, user.uid] });
      setOpen(false);
    } catch (err: any) {
      console.error("Failed to update book:", err);
      toast({ title: "Error", description: err.message || "Failed to update book. Please try again.", variant: "destructive" });
    }
  };
  
  const currentCoverPreviewSrc = coverPreview && isValidHttpUrl(coverPreview) 
    ? coverPreview 
    : (book.coverUrl && isValidHttpUrl(book.coverUrl) 
        ? book.coverUrl 
        : `https://picsum.photos/seed/${book.title || book.id || 'preview'}/80/120`);


  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        // Reset form and preview to original book values when dialog is closed without saving
        const originalCover = (book.coverUrl && isValidHttpUrl(book.coverUrl)) ? book.coverUrl : '';
        reset({
            title: book.title,
            author: book.author,
            category: book.category,
            status: book.status,
            totalPages: book.totalPages || undefined,
            coverUrl: originalCover,
            isbn: book.isbn || '',
            description: book.description || '',
            coverImage: undefined,
        });
        setCoverPreview(originalCover || null);
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[520px] bg-card text-card-foreground rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Edit Book</DialogTitle>
          <DialogDescription>
            Update the details of your book.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
          
          <div className="space-y-1">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-author">Author</Label>
            <Input id="edit-author" {...register("author")} />
            {errors.author && <p className="text-sm text-destructive">{errors.author.message}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-category">Category</Label>
              <Controller name="category" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="edit-category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-status">Status</Label>
               <Controller name="status" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="edit-status"><SelectValue placeholder="Select reading status" /></SelectTrigger>
                  <SelectContent>
                    {readingStatuses.map((stat) => <SelectItem key={stat} value={stat}>{stat}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
              {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-totalPages">Total Pages (Optional)</Label>
            <Input id="edit-totalPages" type="number" {...register("totalPages")} />
            {errors.totalPages && <p className="text-sm text-destructive">{errors.totalPages.message}</p>}
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="edit-isbn">ISBN (Optional)</Label>
            <Input id="edit-isbn" {...register("isbn")} placeholder="e.g., 978-0321765723"/>
            {errors.isbn && <p className="text-sm text-destructive">{errors.isbn.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-description">Description (Optional)</Label>
            <Textarea id="edit-description" {...register("description")} placeholder="Brief summary or notes..." />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label>Cover Image (Optional)</Label>
            <div className="flex items-center space-x-2">
              <Label htmlFor="edit-coverImage-upload" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center w-full h-20 border-2 border-dashed rounded-md hover:border-primary transition-colors">
                  <ImageUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <Input id="edit-coverImage-upload" type="file" accept="image/*" {...register("coverImage")} className="sr-only" />
              </Label>
              {(coverPreview && isValidHttpUrl(coverPreview)) ? (
                <Image src={coverPreview} alt="Cover preview" width={80} height={120} className="h-20 w-auto rounded-md object-cover" data-ai-hint="book cover preview"/>
              ) : (book.coverUrl && isValidHttpUrl(book.coverUrl)) ? (
                 <Image src={book.coverUrl} alt="Current cover" width={80} height={120} className="h-20 w-auto rounded-md object-cover" data-ai-hint="book cover current"/>
              ) : (
                 <div className="h-20 w-[53px] bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">No Preview</div>
              )}
            </div>
            {errors.coverImage && <p className="text-sm text-destructive">{errors.coverImage.message}</p>}
             <p className="text-xs text-muted-foreground text-center">OR</p>
            <Input id="edit-coverUrl" {...register("coverUrl")} placeholder="Enter image URL (e.g., https://...)" />
            {errors.coverUrl && <p className="text-sm text-destructive">{errors.coverUrl.message}</p>}
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
                  Saving...
                </>
              ) : (
                <>
                 <Edit className="mr-2 h-4 w-4" />
                 Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
