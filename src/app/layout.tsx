import type { Metadata } from "next";
import { Inter, Hind_Siliguri } from "next/font/google";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MessengerChatButton } from "@/components/layout/MessengerChatButton";
import { CartProvider } from "@/context/CartContext";
import { Analytics } from "@vercel/analytics/next";

const GTM_ID = "GTM-5QV3R6G3";

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
      <head>
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      </head>
      <body
        className="min-h-screen min-h-dvh flex flex-col bg-background text-foreground overflow-x-hidden"
        suppressHydrationWarning
      >
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
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
