
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
import { collection, addDoc, serverTimestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { ReadingEntryFormData } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

interface AddReadingEntryFormProps {
  bookId: string;
  currentPagesRead: number;
  totalPages?: number | null;
}

const readingEntrySchema = z.object({
  pagesReadThisSession: z.coerce.number().int().min(0, "Pages read cannot be negative"),
  takeaway: z.string().optional(),
  date: z.date().optional(),
});

export default function AddReadingEntryForm({ bookId, currentPagesRead, totalPages }: AddReadingEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<ReadingEntryFormData>({
    resolver: zodResolver(readingEntrySchema),
    defaultValues: {
      pagesReadThisSession: 0,
      takeaway: '',
      date: new Date(),
    }
  });

  const onSubmit: SubmitHandler<ReadingEntryFormData> = async (data) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }

    const newTotalPagesRead = currentPagesRead + data.pagesReadThisSession;

    if (totalPages && newTotalPagesRead > totalPages) {
        toast({ title: "Error", description: `Total pages read (${newTotalPagesRead}) cannot exceed total pages of the book (${totalPages}).`, variant: "destructive" });
        return;
    }
    
    const batch = writeBatch(db);

    // Add reading entry
    const entryRef = doc(collection(db, `users/${user.uid}/books/${bookId}/readingEntries`));
    batch.set(entryRef, {
      bookId,
      userId: user.uid,
      pagesReadThisSession: data.pagesReadThisSession,
      newTotalPagesRead: newTotalPagesRead,
      takeaway: data.takeaway || "",
      date: data.date || serverTimestamp(), // Use selected date or server timestamp
    });

    // Update book's pagesRead and status if necessary
    const bookRef = doc(db, `users/${user.uid}/books/${bookId}`);
    const bookUpdateData: { pagesRead: number; status?: 'Finished' | 'Reading'; updatedAt: any } = {
      pagesRead: newTotalPagesRead,
      updatedAt: serverTimestamp(),
    };

    if (totalPages && newTotalPagesRead >= totalPages) {
      bookUpdateData.status = 'Finished';
    } else if (newTotalPagesRead > 0 && totalPages) { // If pagesRead > 0 and not finished, it's 'Reading'
        bookUpdateData.status = 'Reading';
    }


    batch.update(bookRef, bookUpdateData);

    try {
      await batch.commit();
      toast({ title: "Entry Added", description: "Your reading progress has been saved." });
      queryClient.invalidateQueries({ queryKey: ['books', user.uid] }); // To refresh book grid if status/progress changes
      queryClient.invalidateQueries({ queryKey: ['book', bookId, user.uid] }); // To refresh book detail page
      queryClient.invalidateQueries({ queryKey: ['readingEntries', bookId, user.uid] }); // To refresh entries list
      reset({ pagesReadThisSession: 0, takeaway: '', date: new Date() });
    } catch (err) {
      console.error("Failed to add reading entry:", err);
      toast({ title: "Error", description: "Failed to save progress. Please try again.", variant: "destructive" });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="pagesReadThisSession">Pages Read This Session</Label>
          <Input id="pagesReadThisSession" type="number" {...register("pagesReadThisSession")} />
          {errors.pagesReadThisSession && <p className="text-sm text-destructive">{errors.pagesReadThisSession.message}</p>}
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
      </div>

      <div className="space-y-1">
        <Label htmlFor="takeaway">Takeaway / Notes (Optional)</Label>
        <Textarea id="takeaway" {...register("takeaway")} placeholder="What stood out to you in this session?" rows={4} />
        {errors.takeaway && <p className="text-sm text-destructive">{errors.takeaway.message}</p>}
      </div>

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
