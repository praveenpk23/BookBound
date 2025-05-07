
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Providers } from '@/components/app/providers'; // Import the new Providers component

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
    <html lang="en" className={GeistSans.variable}>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
