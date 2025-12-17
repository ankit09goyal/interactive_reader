import Link from "next/link";
import ButtonAccount from "@/components/ButtonAccount";
import { auth } from "@/libs/auth";
import { isAdmin } from "@/libs/roles";

export const dynamic = "force-dynamic";

// This is a private page: It's protected by the layout.js component which ensures the user is authenticated.
// It's a server compoment which means you can fetch data (like the user profile) before the page is rendered.
// See https://shipfa.st/docs/tutorials/private-page
export default async function Dashboard() {
  const session = await auth();
  const userIsAdmin = isAdmin(session);

  return (
    <main className="min-h-screen p-8 pb-24">
      <section className="max-w-xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <ButtonAccount />
          {userIsAdmin && (
            <Link
              href="/admin"
              className="btn btn-primary btn-sm gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Admin Panel
            </Link>
          )}
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold">Dashboard</h1>
          <p className="text-base-content/70 mt-2">
            Welcome back, {session?.user?.name || "User"}!
          </p>
        </div>

        {/* Role Badge */}
        <div className="bg-base-200 rounded-xl p-6 border border-base-300">
          <h2 className="font-semibold mb-2">Your Account</h2>
          <div className="flex items-center gap-3">
            <span className="text-base-content/70">Role:</span>
            <span
              className={`badge ${
                userIsAdmin ? "badge-primary" : "badge-ghost"
              }`}
            >
              {userIsAdmin ? "Admin" : "User"}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
