import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/authorization";

export const metadata: Metadata = {
  title: "অ্যাডমিন প্যানেল | Pustoka",
  description: "Pustoka প্রশাসনিক নিয়ন্ত্রণ কেন্দ্র",
};

/**
 * Admin layout — enforces ADMIN role at the Next.js layout level.
 * requireAdmin() redirects to /forbidden for non-ADMIN users, and /login for unauthenticated users.
 * Individual admin pages and server actions also call requireAdmin() independently.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return <>{children}</>;
}
