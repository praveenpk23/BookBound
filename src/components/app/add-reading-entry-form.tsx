
"use client";

import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Loader2, Save } from "lucide-react";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { ReadingEntryFormData } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

interface AddReadingEntryFormProps {
  bookId: string;
  currentPagesRead: number;
  totalPages?: number | null;
}

const createReadingEntrySchema = (totalPages?: number | null) => z.object({
  startPage: z.coerce.number().int().min(1, "Start page must be at least 1")
    .max(totalPages || Number.MAX_SAFE_INTEGER, `Start page cannot exceed total pages (${totalPages})`),
  endPage: z.coerce.number().int().min(1, "End page must be at least 1")
    .max(totalPages || Number.MAX_SAFE_INTEGER, `End page cannot exceed total pages (${totalPages})`),
  takeaway: z.string().optional(),
  date: z.date().optional(),
}).refine(data => data.endPage >= data.startPage, {
  message: "End page must be greater than or equal to start page.",
  path: ["endPage"],
});


export default function AddReadingEntryForm({ bookId, currentPagesRead, totalPages }: AddReadingEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const readingEntrySchema = createReadingEntrySchema(totalPages);

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting }, setValue } = useForm<ReadingEntryFormData>({
    resolver: zodResolver(readingEntrySchema),
    defaultValues: {
      startPage: (currentPagesRead || 0) < (totalPages || Infinity) ? (currentPagesRead || 0) + 1 : (totalPages || 1),
      endPage: (currentPagesRead || 0) < (totalPages || Infinity) ? (currentPagesRead || 0) + 1 : (totalPages || 1),
      takeaway: '',
      date: new Date(),
    }
  });

  useEffect(() => {
    const newStartPage = (currentPagesRead || 0) < (totalPages || Infinity) ? (currentPagesRead || 0) + 1 : (totalPages || 1);
    setValue("startPage", newStartPage);
    setValue("endPage", newStartPage);
  }, [currentPagesRead, totalPages, setValue]);


  const onSubmit: SubmitHandler<ReadingEntryFormData> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    const pagesReadThisSession = data.endPage - data.startPage + 1;
    if (pagesReadThisSession <= 0) {
      toast({ title: "Error", description: "End page must be greater than or equal to start page resulting in at least 1 page read.", variant: "destructive" });
      return;
    }
    
    const newTotalPagesReadForBook = currentPagesRead + pagesReadThisSession;

    if (totalPages && newTotalPagesReadForBook > totalPages && currentPagesRead < totalPages) {
       const maxPossiblePagesThisSession = totalPages - currentPagesRead;
        toast({ 
            title: "Error", 
            description: `You can log at most ${maxPossiblePagesThisSession} more page(s) for this book. This session's entry would exceed the total pages.`, 
            variant: "destructive" 
        });
        return;
    }
     // If already finished, allow logging more pages but don't increase beyond totalPages for status.
    const finalPagesReadForBook = totalPages ? Math.min(newTotalPagesReadForBook, totalPages) : newTotalPagesReadForBook;


    const batch = writeBatch(db);

    // Add reading entry
    const entryRef = doc(collection(db, `users/${user.uid}/books/${bookId}/readingEntries`));
    batch.set(entryRef, {
      bookId,
      userId: user.uid,
      startPage: data.startPage,
      endPage: data.endPage,
      pagesReadThisSession: pagesReadThisSession,
      newTotalPagesRead: finalPagesReadForBook, // This represents the book's state *after* this entry
      takeaway: data.takeaway || "",
      date: data.date ? Timestamp.fromDate(data.date) : serverTimestamp(),
    });

    // Update book's pagesRead and status if necessary
    const bookRef = doc(db, `users/${user.uid}/books/${bookId}`);
    const bookUpdateData: { pagesRead: number; status?: 'Finished' | 'Reading'; updatedAt: any } = {
      pagesRead: finalPagesReadForBook,
      updatedAt: serverTimestamp(),
    };
    
    if (totalPages && finalPagesReadForBook >= totalPages) {
      bookUpdateData.status = 'Finished';
    } else if (finalPagesReadForBook > 0 ) { 
        bookUpdateData.status = 'Reading';
    }


    batch.update(bookRef, bookUpdateData);

    try {
      await batch.commit();
      toast({ title: "Entry Added", description: "Your reading progress has been saved." });
      queryClient.invalidateQueries({ queryKey: ['books', user.uid] }); 
      queryClient.invalidateQueries({ queryKey: ['book', bookId, user.uid] }); 
      queryClient.invalidateQueries({ queryKey: ['readingEntries', bookId, user.uid] }); 
      
      const nextStartPage = (finalPagesReadForBook || 0) < (totalPages || Infinity) ? (finalPagesReadForBook || 0) + 1 : (totalPages || 1);
      reset({ 
        startPage: nextStartPage, 
        endPage: nextStartPage, 
        takeaway: '', 
        date: new Date() 
      });

    } catch (err) {
      console.error("Failed to add reading entry:", err);
      toast({ title: "Error", description: "Failed to save progress. Please try again.", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="startPage">Start Page</Label>
          <Input id="startPage" type="number" {...register("startPage")} />
          {errors.startPage && <p className="text-sm text-destructive">{errors.startPage.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="endPage">End Page</Label>
          <Input id="endPage" type="number" {...register("endPage")} />
          {errors.endPage && <p className="text-sm text-destructive">{errors.endPage.message}</p>}
        </div>
      </div>
       <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  />
                </PopoverContent>
              </Popover>
            )}
          />
          {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
        </div>

      <div className="space-y-1">
        <Label htmlFor="takeaway">Takeaway / Notes (Optional)</Label>
        <Textarea id="takeaway" {...register("takeaway")} placeholder="What stood out to you in this session?" rows={4} />
        {errors.takeaway && <p className="text-sm text-destructive">{errors.takeaway.message}</p>}
      </div>
      {errors.root && <p className="text-sm text-destructive">{errors.root.message}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Progress
          </>
        )}
      </Button>
    </form>
  );
}

