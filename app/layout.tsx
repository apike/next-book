import type { Metadata, Viewport } from "next";
import Script from "next/script";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${libreBaskerville.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen antialiased font-sans flex flex-col pt-safe">
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <footer className="py-3 pb-safe text-center text-xs text-muted">
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
        <Script
          src="https://cdn.usefathom.com/script.js"
          data-site="MJGVSEYT"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
