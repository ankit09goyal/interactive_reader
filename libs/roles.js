import { redirect } from "next/navigation";
import connectMongo from "./mongoose";
import User from "@/models/User";

// Role constants
export const ROLES = {
  USER: "user",
  ADMIN: "admin",
};

/**
 * Check if the user session has admin role
 * @param {Object} session - NextAuth session object
 * @returns {boolean} - True if user is admin
 */
export function isAdmin(session) {
  return session?.user?.role === ROLES.ADMIN;
}

/**
 * Check if the user session has a specific role
 * @param {Object} session - NextAuth session object
 * @param {string} role - Role to check
 * @returns {boolean} - True if user has the specified role
 */
export function hasRole(session, role) {
  return session?.user?.role === role;
}

/**
 * Require admin role - redirects to dashboard if not admin
 * Use this in server components/pages
 * @param {Object} session - NextAuth session object
 * @param {string} redirectTo - Path to redirect to if not admin (default: /dashboard)
 */
export function requireAdmin(session, redirectTo = "/dashboard") {
  if (!isAdmin(session)) {
    redirect(redirectTo);
  }
}

/**
 * Require authentication - redirects to login if not authenticated
 * @param {Object} session - NextAuth session object
 * @param {string} redirectTo - Path to redirect to if not authenticated
 */
export function requireAuth(session, redirectTo = "/api/auth/signin") {
  if (!session) {
    redirect(redirectTo);
  }
}

/**
 * Get user role from database by user ID
 * @param {string} userId - User's MongoDB ID
 * @returns {Promise<string|null>} - User's role or null if not found
 */
export async function getUserRole(userId) {
  if (!userId) return null;

  try {
    await connectMongo();
    const user = await User.findById(userId).select("role").lean();
    return user?.role || ROLES.USER;
  } catch (error) {
    console.error("Error fetching user role:", error);
    return null;
  }
}

/**
 * Check if a user is admin by their ID (database lookup)
 * @param {string} userId - User's MongoDB ID
 * @returns {Promise<boolean>} - True if user is admin
 */
export async function isAdminById(userId) {
  const role = await getUserRole(userId);
  return role === ROLES.ADMIN;
}

/**
 * Verify admin role for API routes
 * Returns an error response object if not admin, null if authorized
 * @param {Object} session - NextAuth session object
 * @returns {Object|null} - Error response object or null
 */
export function verifyAdminForApi(session) {
  if (!session) {
    return { error: "Unauthorized", status: 401 };
  }
  if (!isAdmin(session)) {
    return { error: "Forbidden - Admin access required", status: 403 };
  }
  return null;
}

