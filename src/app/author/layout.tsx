import type { Metadata } from "next";
import { requireAuthor } from "@/lib/auth/authorization";

export const metadata: Metadata = {
  title: "লেখক ড্যাশবোর্ড | Pustoka",
  description: "আপনার বই পরিচালনা করুন",
};

/**
 * Author layout — enforces AUTHOR/ADMIN role at the layout level.
 * requireAuthor() redirects to /forbidden for unauthorized users.
 * Individual pages and actions also call requireAuthor() independently.
 */
export default async function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This provides a layout-level guard. Server Actions have their own guards.
  await requireAuthor();

  return (
    <div className="flex flex-1 flex-col bg-muted/5">
      {children}
    </div>
  );
}
