import NextAuth, { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import { verifyPassword } from "@/lib/auth/password";

// Augment NextAuth types to include our Mongoose User fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "AUTHOR" | "ADMIN";
      status: "ACTIVE" | "SUSPENDED" | "DELETED";
    } & DefaultSession["user"];
  }

  interface User {
    role?: "USER" | "AUTHOR" | "ADMIN";
    status?: "ACTIVE" | "SUSPENDED" | "DELETED";
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        await dbConnect();

        const user = await User.findOne({ email }).lean();

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await verifyPassword(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        if (user.status !== "ACTIVE") {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  session: {
    // JWT strategy is required for NextAuth when using a custom database like Mongoose.
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "USER" | "AUTHOR" | "ADMIN";
        session.user.status = token.status as "ACTIVE" | "SUSPENDED" | "DELETED";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
