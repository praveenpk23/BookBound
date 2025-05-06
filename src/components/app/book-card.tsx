
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Book, Tag, User, Activity } from 'lucide-react';

export interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  status: 'Want to Read' | 'Reading' | 'Finished';
  coverUrl?: string;
  pagesRead?: number;
  totalPages?: number; // Optional, for progress calculation
}

interface BookCardProps {
  book: Book;
}

export default function BookCard({ book }: BookCardProps) {
  const { title, author, category, status, coverUrl } = book;

  const getStatusBadgeVariant = (status: Book['status']) => {
    switch (status) {
      case 'Finished':
        return 'default'; // Primary color for finished
      case 'Reading':
        return 'secondary'; // Secondary color for reading
      case 'Want to Read':
        return 'outline'; // Outline for want to read
      default:
        return 'outline';
    }
  };
  
  // Placeholder image if coverUrl is not available
  const displayCoverUrl = coverUrl || `https://picsum.photos/seed/${title.replace(/\s+/g, '-')}/300/450`;

  return (
    <Card className="flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 h-full">
      <CardHeader className="p-0 relative">
        <div className="aspect-[2/3] w-full relative">
          <Image
            src={displayCoverUrl}
            alt={`Cover of ${title}`}
            layout="fill"
            objectFit="cover"
            className="rounded-t-lg"
            data-ai-hint="book cover"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-lg font-semibold mb-1 leading-tight truncate" title={title}>
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground mb-2 truncate" title={author}>
          <User className="inline-block h-3 w-3 mr-1.5" />
          {author}
        </p>
        <div className="flex items-center text-xs text-muted-foreground mb-3">
          <Tag className="inline-block h-3 w-3 mr-1.5" />
          <span>{category}</span>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
         <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
            <Activity className="inline-block h-3 w-3 mr-1.5" />
            {status}
          </Badge>
      </CardFooter>
    </Card>
  );
}
