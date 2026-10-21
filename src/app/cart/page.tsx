import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "শপিং কার্ট | Pustoka",
  description: "আপনার নির্বাচিত বইসমূহ ও সহজ এককালীন চেকআউট",
};

export default async function CartPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col bg-muted/10 min-h-[calc(100vh-4rem)]">
      <CartView
        user={
          user
            ? {
                id: user.id,
                name: user.name,
                email: user.email,
              }
            : null
        }
      />
    </div>
  );
}
