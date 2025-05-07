
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
import { isValidHttpUrl } from '@/lib/utils';

interface EditBookDialogProps {
  book: BookDocument;
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
    // Default values are set in the useEffect hook based on the 'book' prop when dialog opens
  });

  const watchedCoverImage = watch("coverImage");
  const watchedCoverUrl = watch("coverUrl");

  // Effect to reset form and set initial preview when dialog opens or book prop changes
  useEffect(() => {
    if (open) {
      const initialCoverUrl = (book.coverUrl && isValidHttpUrl(book.coverUrl)) ? book.coverUrl : '';
      reset({
        title: book.title,
        author: book.author,
        category: book.category,
        status: book.status,
        totalPages: book.totalPages || undefined,
        coverUrl: initialCoverUrl,
        isbn: book.isbn || '',
        description: book.description || '',
        coverImage: undefined, 
      });
      setCoverPreview(initialCoverUrl || null);
    }
  }, [book, open, reset]);

  // Effect for when a new file is selected or cleared
  useEffect(() => {
    if (!open) return; 

    if (watchedCoverImage && watchedCoverImage.length > 0) {
      const file = watchedCoverImage[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setValue("coverUrl", "", { shouldValidate: true }); // Clear URL field as file takes precedence
    } else if ((!watchedCoverUrl || !isValidHttpUrl(watchedCoverUrl)) && open) {
      // File is cleared, and no valid URL is typed, revert to original book cover or null
      const originalCover = (book.coverUrl && isValidHttpUrl(book.coverUrl)) ? book.coverUrl : null;
      setCoverPreview(originalCover);
    }
  }, [watchedCoverImage, setValue, open, book.coverUrl, watchedCoverUrl]);

  // Effect for when coverUrl input changes
  useEffect(() => {
    if (!open) return;

    if (watchedCoverUrl && isValidHttpUrl(watchedCoverUrl)) {
      setCoverPreview(watchedCoverUrl);
      setValue("coverImage", undefined, { shouldValidate: true }); // Clear file input as URL takes precedence
    } else if ((!watchedCoverImage || watchedCoverImage.length === 0) && open) {
       // URL is cleared or invalid, and no file is selected, revert to original book cover or null
      const originalCover = (book.coverUrl && isValidHttpUrl(book.coverUrl)) ? book.coverUrl : null;
      setCoverPreview(originalCover);
    }
  }, [watchedCoverUrl, setValue, open, book.coverUrl, watchedCoverImage]);


  const onSubmit: SubmitHandler<BookFormData> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to edit a book.", variant: "destructive" });
      return;
    }

    try {
      let newCoverUrlForFirestore = book.coverUrl && isValidHttpUrl(book.coverUrl) ? book.coverUrl : '';

      if (data.coverImage && data.coverImage.length > 0) {
        const file = data.coverImage[0];
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
      } else if (data.coverUrl && isValidHttpUrl(data.coverUrl)) {
         // User provided a new URL or modified the existing one
        if (data.coverUrl !== book.coverUrl) {
            // If old URL was from Firebase Storage and new URL is different, delete old
            if (book.coverUrl && book.coverUrl.includes('firebasestorage.googleapis.com')) {
               try {
                const oldImageRef = ref(storage, book.coverUrl);
                await deleteObject(oldImageRef);
              } catch (deleteError: any) {
                console.warn("Could not delete old cover image on URL change:", deleteError.message);
              }
            }
        }
        newCoverUrlForFirestore = data.coverUrl;
      } else if (!data.coverImage && (!data.coverUrl || data.coverUrl === '')) {
        // No file uploaded and URL field is empty, means user wants to remove the cover
        if (book.coverUrl && book.coverUrl.includes('firebasestorage.googleapis.com')) {
           try {
            const oldImageRef = ref(storage, book.coverUrl);
            await deleteObject(oldImageRef);
          } catch (deleteError: any) {
            console.warn("Could not delete old cover image on URL clear:", deleteError.message);
          }
        }
        newCoverUrlForFirestore = ''; 
      }


      if (!newCoverUrlForFirestore && data.title) {
          newCoverUrlForFirestore = `https://picsum.photos/seed/${encodeURIComponent(data.title)}/300/450`;
      } else if (!newCoverUrlForFirestore) {
          newCoverUrlForFirestore = `https://picsum.photos/seed/${book.id || 'default-book-edit'}/300/450`;
      }

      const updatedBookData: Partial<BookDocument> = { // Use Partial for updateDoc
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
      // Ensure pagesRead is not accidentally overwritten if not part of this form
      if (book.pagesRead !== undefined) {
        updatedBookData.pagesRead = book.pagesRead;
      }


      const bookRef = doc(db, `users/${user.uid}/books/${book.id}`);
      await updateDoc(bookRef, updatedBookData);

      toast({ title: "Book Updated", description: `${data.title} has been updated.` });
      queryClient.invalidateQueries({ queryKey: ['books', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['userBooks', user?.uid] });
      queryClient.invalidateQueries({ queryKey: ['book', book.id, user?.uid] });
      setOpen(false);
    } catch (err: any) {
      console.error("Failed to update book:", err);
      toast({ title: "Error", description: err.message || "Failed to update book. Please try again.", variant: "destructive" });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      // Reset logic is now in useEffect hook based on 'open' state
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
              {coverPreview && isValidHttpUrl(coverPreview) ? (
                <Image src={coverPreview} alt="Cover preview" width={80} height={120} className="h-20 w-auto rounded-md object-cover" data-ai-hint="book cover preview"/>
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
