"use client";

import { useEffect, useRef, useState } from "react";

/**
 * usePDFLoader - Custom hook for loading PDF.js library and PDF document
 */
export function usePDFLoader(filePath) {
  const pdfjsLibRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  const renderTasksRef = useRef(new Map());

  // Load PDF.js library dynamically
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadPDFJS = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLibRef.current = pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        setPdfjsLoaded(true);
      } catch (err) {
        console.error("Error loading PDF.js:", err);
        setError("Failed to load PDF viewer library");
      }
    };

    loadPDFJS();
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!pdfjsLoaded || !pdfjsLibRef.current || !filePath) return;

    // Cancel existing render tasks
    renderTasksRef.current.forEach((task) => {
      try {
        task.cancel();
      } catch (e) {
        // Ignore cancel errors
      }
    });
    renderTasksRef.current.clear();

    const loadPDF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const loadingTask = pdfjsLibRef.current.getDocument(filePath);
        const pdf = await loadingTask.promise;

        setPdfDoc(pdf);
        setTotalPages(pdf.numPages);
      } catch (err) {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();

    return () => {
      renderTasksRef.current.forEach((task) => {
        try {
          task.cancel();
        } catch (e) {
          // Ignore cancel errors
        }
      });
      renderTasksRef.current.clear();
    };
  }, [filePath, pdfjsLoaded]);

  return {
    pdfjsLibRef,
    pdfDoc,
    totalPages,
    isLoading,
    error,
    renderTasksRef,
  };
}

