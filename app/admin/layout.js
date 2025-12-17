import { redirect } from "next/navigation";
import { auth } from "@/libs/auth";
import { requireAdmin } from "@/libs/roles";
import config from "@/config";
import AdminNavbar from "@/components/AdminNavbar";

export const dynamic = "force-dynamic";

// Admin layout - protects all /admin/* routes
// Only users with role "admin" can access these pages
export default async function AdminLayout({ children }) {
  const session = await auth();

  // First check if user is authenticated
  if (!session) {
    redirect(config.auth.loginUrl);
  }

  // Then check if user has admin role
  requireAdmin(session, "/dashboard");

  return (
    <div className="min-h-screen bg-base-100">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

