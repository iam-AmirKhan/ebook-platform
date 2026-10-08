import { requireAuthor } from "@/lib/auth/authorization";

export default async function AuthorTestPage() {
  const user = await requireAuthor();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Author Test Page
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Welcome, <strong>{user.name}</strong>. You have AUTHOR or ADMIN privileges.
        </p>
      </div>
    </div>
  );
}
