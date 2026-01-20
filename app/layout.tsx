import type { Metadata } from "next";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const libreBaskerville = Libre_Baskerville({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Book Club Poll",
  description: "A simple voting app for your book club",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${libreBaskerville.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen antialiased font-sans flex flex-col">
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <footer className="py-3 text-center text-xs text-muted">
          <a 
            href="/"
            className="text-primary hover:underline"
          >
            Book Club Voter
          </a>
          {' '}is a tiny experiment by{' '}
          <a 
            href="https://allenpike.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Allen Pike
          </a>
          .
        </footer>
      </body>
    </html>
  );
}
