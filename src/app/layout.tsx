
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

// Removed the incorrect call to GeistSans as a function.
// const geistSans = GeistSans({ 
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// });
// GeistSans from 'geist/font/sans' is an object, not a function.
// Its .variable property should be used directly.

export const metadata: Metadata = {
  title: 'BookBound - Your Personal Reading Tracker',
  description: 'Track your books, reading progress, and insights with BookBound.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} font-sans`}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}

