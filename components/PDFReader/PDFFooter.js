"use client";

/**
 * PDFFooter - Footer component showing keyboard shortcuts
 */
export default function PDFFooter({ viewMode }) {
  return (
    <div className="p-2 bg-base-200 border-t border-base-300 text-center text-xs text-base-content/50">
      {viewMode === "one-page"
        ? "Arrow keys to navigate • +/- zoom • V to switch view • Q to toggle Q&A"
        : "Scroll to read • +/- zoom • V to switch view • Q to toggle Q&A"}
      {" • Select text to ask questions"}
    </div>
  );
}

