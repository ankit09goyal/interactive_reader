"use client";

import DeleteModal from "./DeleteModal";

export default function SuggestionDeleteModal({
  suggestion,
  onClose,
  onConfirm,
  isDeleting,
}) {
  const itemPreview = (
    <>
      <h4 className="font-semibold mb-2">Suggestion:</h4>
      <p className="text-sm text-base-content/80 mb-3 line-clamp-3">
        {suggestion.suggestion}
      </p>

      {suggestion.selectedText && (
        <div className="mt-2 pt-2 border-t border-base-300">
          <p className="text-xs text-base-content/60 mb-1">Selected Text:</p>
          <p className="text-xs text-base-content/70 italic line-clamp-2">
            &ldquo;{suggestion.selectedText}&rdquo;
          </p>
        </div>
      )}

      {suggestion.epubChapter && (
        <div className="mt-2">
          <span className="text-xs text-base-content/60">
            Chapter: {suggestion.epubChapter}
          </span>
        </div>
      )}
    </>
  );

  return (
    <DeleteModal
      title="Delete Suggestion"
      itemPreview={itemPreview}
      warningMessage="Are you sure you want to delete this suggestion? This action cannot be undone and will permanently remove the suggestion and its highlight."
      confirmButtonText="Delete Suggestion"
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
    />
  );
}
