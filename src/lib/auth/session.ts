import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import dbConnect from "@/lib/db/mongoose";
import User, { type UserRole, type UserStatus } from "@/models/User";
import { Types } from "mongoose";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  status: UserStatus;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const sessionUser = session.user;
  const rawId = sessionUser.id;
  const rawEmail = sessionUser.email?.toLowerCase().trim();

  if (!rawId && !rawEmail) {
    return null;
  }

  await dbConnect();

  let dbUser = null;
  if (rawId && Types.ObjectId.isValid(rawId)) {
    dbUser = await User.findById(rawId).lean();
  }
  if (!dbUser && rawEmail) {
    dbUser = await User.findOne({ email: rawEmail }).lean();
  }

  if (!dbUser || dbUser.status !== "ACTIVE") {
    return null;
  }

  return {
    id: dbUser._id.toString(),
    name: dbUser.name,
    email: dbUser.email,
    image: dbUser.image ?? sessionUser.image ?? null,
    role: dbUser.role,
    status: dbUser.status,
  };
}

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

