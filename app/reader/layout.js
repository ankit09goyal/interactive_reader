import { redirect } from "next/navigation";
import { auth } from "@/libs/auth";
import config from "@/config";

// This layout ensures the user is logged in before accessing the reader.
// If not authenticated, it will redirect to the login page.
export default async function ReaderLayout({ children }) {
  const session = await auth();

  if (!session) {
    redirect(config.auth.loginUrl);
  }

  return <>{children}</>;
}

