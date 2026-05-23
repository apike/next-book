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

const title = "Next Book – Book club ranked voting";
const description = "Polling for book clubs, with ranked voting.";

export const metadata: Metadata = {
  metadataBase: new URL("https://nextbook.club"),
  title,
  description,
  icons: {
    icon: "/next-book.png",
    apple: "/next-book.png",
  },
  openGraph: {
    title,
    description,
    images: ["/next-book.png"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/next-book.png"],
  },
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
      <body className="antialiased font-sans pt-safe">
        {children}
        <footer className="pb-4 text-center text-xs text-muted">
          <a 
            href="/"
            className="text-primary hover:underline"
          >
            Next Book
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
