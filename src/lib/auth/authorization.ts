import { requireUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { UserRole } from "@/models/User";

export async function requireRole(...roles: UserRole[]) {
  const user = await requireUser();
  
  if (!roles.includes(user.role as UserRole)) {
    redirect("/forbidden");
  }
  
  return user;
}

export async function requireAdmin() {
  return requireRole("ADMIN");
}

export async function requireAuthor() {
  return requireRole("AUTHOR", "ADMIN");
}
