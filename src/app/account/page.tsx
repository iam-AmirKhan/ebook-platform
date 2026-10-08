import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/auth";
import { Button } from "@/components/ui/button";

export default async function AccountPage() {
  // 1. Require an authenticated user (redirects to /login if unauthenticated)
  const user = await requireUser();

  // 2. Server Action for signing out
  const handleSignOut = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          Account Details
        </h1>
        
        <div className="mb-8 space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{user.role}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{user.status}</p>
          </div>
        </div>

        <form action={handleSignOut}>
          <Button type="submit" variant="outline" className="w-full h-10">
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  );
}
