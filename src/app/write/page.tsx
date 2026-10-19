import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getWriteNavHref } from "@/lib/auth/navigation";

export const metadata = {
  title: "বই লিখুন | Pustoka",
};

/**
 * Direct route handler for /write that resolves the role-based destination:
 * - Guest -> /publishing-policy
 * - USER -> /publishing-policy
 * - AUTHOR -> /author/books/new
 * - ADMIN -> /admin/books
 */
export default async function WriteRedirectPage() {
  const user = await getCurrentUser();
  const destination = getWriteNavHref(user?.role);
  redirect(destination);
}
