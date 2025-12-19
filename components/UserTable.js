"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import apiClient from "@/libs/api";
import ButtonRoleToggle from "./ButtonRoleToggle";

export default function UserTable({ users: initialUsers }) {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [filterAccess, setFilterAccess] = useState("all"); // "all", "with-access", "no-access"

  const filteredUsers = users.filter((user) => {
    // Filter by search query
    const matchesSearch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by book access status
    let matchesAccess = true;
    if (filterAccess === "with-access") {
      matchesAccess = user.hasBookAccess === true;
    } else if (filterAccess === "no-access") {
      matchesAccess = user.hasBookAccess === false;
    }

    return matchesSearch && matchesAccess;
  });

  const handleRoleChange = (userId, newRole) => {
    setUsers((prev) =>
      prev.map((user) =>
        user._id === userId ? { ...user, role: newRole } : user
      )
    );
  };

  const handleDeleteUser = async (userId, userName) => {
    if (
      !confirm(`Are you sure you want to delete ${userName || "this user"}?`)
    ) {
      return;
    }

    setDeletingId(userId);
    try {
      const response = await apiClient.delete(`/admin/users/${userId}`);
      if (response.softDeleted) {
        // User was only removed from admin's list, not fully deleted
        toast.success("User removed from your list");
      } else {
        toast.success("User deleted successfully");
      }
      setUsers((prev) => prev.filter((user) => user._id !== userId));
    } catch (error) {
      toast.error(error.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input input-bordered w-full pl-10"
          />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Book Access Filter */}
        <select
          value={filterAccess}
          onChange={(e) => setFilterAccess(e.target.value)}
          className="select select-bordered"
        >
          <option value="all">All Users</option>
          <option value="with-access">With Book Access</option>
          <option value="no-access">No Book Access</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-base-200 rounded-xl border border-base-300 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr className="bg-base-300">
                <th>User</th>
                <th>Role</th>
                <th>Book Access</th>
                <th>Books</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-8 text-base-content/70"
                  >
                    {searchQuery || filterAccess !== "all"
                      ? "No users found matching your filters"
                      : "No users found"}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user._id}
                    className={`hover ${
                      user.hasBookAccess === false
                        ? "bg-warning/10 border-l-4 border-l-warning"
                        : ""
                    }`}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="avatar">
                          <div className="w-10 h-10 rounded-full bg-base-300">
                            {user.image ? (
                              <Image
                                src={user.image}
                                alt={user.name || "User"}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-base-content/50">
                                {(user.name || user.email || "U")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold">
                            {user.name || "No name"}
                          </div>
                          <div className="text-sm text-base-content/70">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <ButtonRoleToggle
                        userId={user._id}
                        currentRole={user.role || "user"}
                        onRoleChange={handleRoleChange}
                      />
                    </td>
                    <td>
                      {user.hasBookAccess ? (
                        <span className="badge badge-success gap-1">
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
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                          {user.bookAccessCount}{" "}
                          {user.bookAccessCount === 1 ? "book" : "books"}
                        </span>
                      ) : (
                        <span className="badge badge-warning gap-1">
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
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          No access
                        </span>
                      )}
                    </td>
                    <td className="align-top">
                      {user.bookTitles && user.bookTitles.length > 0 ? (
                        <div className="flex flex-col gap-1 py-1">
                          {user.bookTitles.map((bookTitle, index) => (
                            <span
                              key={index}
                              className="badge badge-outline badge-sm text-xs whitespace-normal break-words"
                            >
                              {bookTitle}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-base-content/50">
                          No books
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-base-content/70">
                      {formatDate(user.createdAt)}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteUser(user._id, user.name)}
                        disabled={deletingId === user._id}
                        className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                      >
                        {deletingId === user._id ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
