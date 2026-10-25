import type { Metadata } from "next";
import { Inter, Hind_Siliguri } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MessengerChatButton } from "@/components/layout/MessengerChatButton";
import { CartProvider } from "@/context/CartContext";
import { Analytics } from "@vercel/analytics/next";

// Clean Latin sans font for numbers, English text, and modern UI
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Highly legible Bengali sans font for all Bengali reading text, titles, and labels
const hindSiliguri = Hind_Siliguri({
  variable: "--font-bengali",
  subsets: ["bengali", "latin"],
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
      className={`${inter.variable} ${hindSiliguri.variable} antialiased overflow-x-hidden`}
      suppressHydrationWarning
    >
      <body
        className="min-h-screen min-h-dvh flex flex-col bg-background text-foreground overflow-x-hidden"
        suppressHydrationWarning
      >
        <CartProvider>
          <Navbar />
          <main id="main-content" className="flex flex-1 flex-col">
            {children}
          </main>
          <Footer />
          <MessengerChatButton />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
