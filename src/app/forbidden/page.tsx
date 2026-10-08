import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Access Denied
        </h1>
        <p className="mb-8 text-gray-500 dark:text-gray-400">
          You do not have permission to view this page.
        </p>
        <Link href="/">
          <Button className="w-full h-10">Return to Home</Button>
        </Link>
      </div>
    </div>
  );
}
