"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import apiClient from "@/libs/api";

/**
 * usePDFHighlights - Custom hook for managing question highlights on PDF pages
 * Fetches user's questions and provides highlight data for rendering
 */
export function usePDFHighlights({ bookId, refreshTrigger = 0 }) {
  const [highlights, setHighlights] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // Fetch user's questions for highlighting
  useEffect(() => {
    if (!bookId || !currentUserId) {
      setHighlights([]);
      return;
    }

    const fetchHighlights = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get(`/user/questions?bookId=${bookId}`);
        
        // Filter to only include questions with selectedText and pageNumber
        // Only include questions from the current user (not public questions from others)
        const userQuestions = (response.myQuestions || []).filter(
          (q) => q.selectedText && q.pageNumber && q.userId?.toString() === currentUserId
        );

        // Map questions to highlight format
        const highlightData = userQuestions.map((question) => ({
          id: question._id || question.id,
          text: question.selectedText,
          pageNumber: question.pageNumber,
          questionId: question._id || question.id,
        }));

        setHighlights(highlightData);
      } catch (err) {
        console.error("Error fetching highlights:", err);
        setHighlights([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHighlights();
  }, [bookId, currentUserId, refreshTrigger]);

  return { highlights, isLoading };
}

