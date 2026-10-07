import NextAuth, { DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

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
      async authorize(_credentials) {
        // Architecture placeholder:
        // DB validation and bcrypt password hashing logic will go here in a future phase.
        // For now, always return null (authentication fails) as per Phase 2A instructions.
        return null;
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
