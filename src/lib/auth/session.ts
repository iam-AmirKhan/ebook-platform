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

declare global {
  // eslint-disable-next-line no-var
  var __TEST_SESSION_USER__: AuthenticatedUser | null | undefined;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  if (process.env.NODE_ENV === "test" && globalThis.__TEST_SESSION_USER__ !== undefined) {
    return globalThis.__TEST_SESSION_USER__;
  }
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  const sessionUser = session.user;
  const rawId = typeof sessionUser.id === "string" ? sessionUser.id.trim() : undefined;
  const rawEmail =
    typeof sessionUser.email === "string"
      ? sessionUser.email.toLowerCase().trim()
      : undefined;

  // Reject missing / empty identity
  if (!rawId && !rawEmail) {
    return null;
  }

  await dbConnect();

  let dbUser = null;

  // Identity consistency check (SEC-05):
  // When both session user ID and email are present, they must resolve to the exact same MongoDB user document.
  // Ambiguous, conflicting, or non-matching identities are rejected immediately.
  if (rawId && rawEmail) {
    if (!Types.ObjectId.isValid(rawId)) {
      return null;
    }
    dbUser = await User.findOne({
      _id: new Types.ObjectId(rawId),
      email: rawEmail,
    }).lean();
  } else if (rawId) {
    if (!Types.ObjectId.isValid(rawId)) {
      return null;
    }
    dbUser = await User.findById(rawId).lean();
  } else if (rawEmail) {
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

