
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
import { BookUp, Loader2, ImageUp } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { db, storage } from '@/lib/firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import type { BookFormData, BookStatus } from '@/types';
import { useQueryClient } from '@tanstack/react-query';

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
  coverImage: z.instanceof(FileList).optional(),
  coverUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  isbn: z.string().optional(),
  description: z.string().optional(),
}).refine(data => data.coverImage || data.coverUrl, {
   // message: "Either upload a cover image or provide a URL.", // This makes one of them required
   // path: ["coverImage"], // you can specify a path for the error
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
    }
  });

  const watchedCoverImage = watch("coverImage");

  useEffect(() => {
    if (watchedCoverImage && watchedCoverImage.length > 0) {
      const file = watchedCoverImage[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  }, [watchedCoverImage]);

  const onSubmit: SubmitHandler<BookFormData> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to add a book.", variant: "destructive" });
      return;
    }

    try {
      let coverImageUrl = data.coverUrl || ''; // Use provided URL if available

      if (data.coverImage && data.coverImage.length > 0) {
        const file = data.coverImage[0];
        const storageRef = ref(storage, `covers/${user.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        coverImageUrl = await getDownloadURL(snapshot.ref);
      }

      // Destructure data to exclude FileList and form's coverUrl, as we use a processed coverImageUrl
      // and FileList (coverImage) should not be stored in Firestore.
      const { coverImage: discardedFile, coverUrl: discardedFormUrl, ...bookDetailsToSave } = data;

      await addDoc(collection(db, `users/${user.uid}/books`), {
        ...bookDetailsToSave, // This contains title, author, category, status, totalPages, isbn, description
        coverUrl: coverImageUrl || `https://picsum.photos/seed/${encodeURIComponent(data.title)}/300/450`, // Fallback placeholder
        // The 'coverImage' (FileList) field is now excluded from bookDetailsToSave and not explicitly set to undefined
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        pagesRead: 0, // Initialize pagesRead
      });

      toast({ title: "Book Added", description: `${data.title} has been added to your library.` });
      queryClient.invalidateQueries({ queryKey: ['books', user.uid] });
      reset();
      setCoverPreview(null);
      setOpen(false);
    } catch (err) {
      console.error("Failed to add book:", err);
      toast({ title: "Error", description: "Failed to add book. Please try again.", variant: "destructive" });
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
            <Label>Cover Image (Optional)</Label>
            <div className="flex items-center space-x-2">
              <Label htmlFor="coverImage-upload" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-center w-full h-20 border-2 border-dashed rounded-md hover:border-primary transition-colors">
                  <ImageUp className="h-8 w-8 text-muted-foreground" />
                </div>
                <Input id="coverImage-upload" type="file" accept="image/*" {...register("coverImage")} className="sr-only" />
              </Label>
              {coverPreview && (
                 // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="Cover preview" className="h-20 w-auto rounded-md object-cover" data-ai-hint="book cover preview" />
              )}
            </div>
            {errors.coverImage && <p className="text-sm text-destructive">{errors.coverImage.message}</p>}
             <p className="text-xs text-muted-foreground text-center">OR</p>
            <Input id="coverUrl" {...register("coverUrl")} placeholder="Enter image URL (e.g., https://...)" />
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

