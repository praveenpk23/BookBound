
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, User, Activity, ExternalLink } from 'lucide-react';
import type { BookDocument, BookStatus } from '@/types';
import { Progress } from '@/components/ui/progress';


interface BookCardProps {
  book: BookDocument;
}

export default function BookCard({ book }: BookCardProps) {
  const { id, title, author, category, status, coverUrl, pagesRead, totalPages } = book;

  const getStatusBadgeVariant = (status: BookStatus) => {
    switch (status) {
      case 'Finished':
        return 'default'; 
      case 'Reading':
        return 'secondary'; 
      case 'Want to Read':
        return 'outline';
      default:
        return 'outline';
    }
  };
  
  const displayCoverUrl = coverUrl || `https://picsum.photos/seed/${encodeURIComponent(title)}/300/450`;
  const progress = totalPages && pagesRead ? Math.round((pagesRead / totalPages) * 100) : 0;

  return (
    <Card className="flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 h-full group">
      <Link href={`/book/${id}`} className="flex flex-col h-full">
        <CardHeader className="p-0 relative">
          <div className="aspect-[2/3] w-full relative">
            <Image
              src={displayCoverUrl}
              alt={`Cover of ${title}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="rounded-t-lg object-cover"
              data-ai-hint="book cover"
              priority={false} // Can set to true for LCP elements if applicable
            />
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/70 p-1.5 rounded-full">
               <ExternalLink className="h-5 w-5 text-foreground" />
            </div>
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
          {status === 'Reading' && totalPages && typeof pagesRead === 'number' && (
             <div className="mt-auto">
                <Progress value={progress} className="h-2 w-full mb-1" />
                <p className="text-xs text-muted-foreground text-right">{`${pagesRead} / ${totalPages} pages (${progress}%)`}</p>
              </div>
          )}
        </CardContent>
        <CardFooter className="p-4 pt-0 mt-auto">
           <Badge variant={getStatusBadgeVariant(status)} className="text-xs">
              <Activity className="inline-block h-3 w-3 mr-1.5" />
              {status}
            </Badge>
        </CardFooter>
      </Link>
    </Card>
  );
}
