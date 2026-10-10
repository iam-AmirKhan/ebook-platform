import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Serif_Bengali } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Bengali serif font — used for Bengali book content and titles.
// next/font self-hosts at build time; no runtime request to Google.
const notoSerifBengali = Noto_Serif_Bengali({
  variable: "--font-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pustoka — Bangladesh's Digital Book Marketplace",
    template: "%s | Pustoka",
  },
  description:
    "Discover, read, and purchase ebooks from Bangladesh's growing digital book marketplace. Support local authors and publishers.",
  keywords: ["ebook", "book", "Bangladesh", "digital library", "reading", "pustoka"],
  authors: [{ name: "Pustoka" }],
  openGraph: {
    siteName: "Pustoka",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerifBengali.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Navbar />
        <main id="main-content" className="flex flex-1 flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
