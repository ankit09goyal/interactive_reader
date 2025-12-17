"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import apiClient from "@/libs/api";

export default function ButtonRoleToggle({ userId, currentRole, onRoleChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState(currentRole);

  const handleToggle = async () => {
    const newRole = role === "admin" ? "user" : "admin";
    const confirmMessage =
      newRole === "admin"
        ? "Are you sure you want to make this user an admin? They will have full access to the admin panel."
        : "Are you sure you want to remove admin privileges from this user?";

    if (!confirm(confirmMessage)) {
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.put(`/admin/users/${userId}`, { role: newRole });
      setRole(newRole);
      onRoleChange?.(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error(error.message || "Failed to update user role");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`badge gap-1 cursor-pointer transition-colors ${
        role === "admin"
          ? "badge-primary hover:badge-primary/80"
          : "badge-ghost hover:bg-base-300"
      }`}
    >
      {isLoading ? (
        <span className="loading loading-spinner loading-xs"></span>
      ) : (
        <>
          {role === "admin" ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
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
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          )}
          {role === "admin" ? "Admin" : "User"}
        </>
      )}
    </button>
  );
}

