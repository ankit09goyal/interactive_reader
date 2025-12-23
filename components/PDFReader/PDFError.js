"use client";

/**
 * PDFError - Error display component for PDF loading failures
 */
export default function PDFError({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-base-200 rounded-xl border border-base-300">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16 text-error mb-4"
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
      <p className="text-error font-semibold">{error}</p>
      <button onClick={onRetry} className="btn btn-primary mt-4">
        Try Again
      </button>
    </div>
  );
}

