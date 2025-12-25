"use client";

import DeleteModal from "./DeleteModal";

export default function QuestionDeleteModal({
  question,
  onClose,
  onConfirm,
  isDeleting,
}) {
  const itemPreview = (
    <>
      <h4 className="font-semibold mb-2">Question:</h4>
      <p className="text-sm text-base-content/80 mb-3">{question.question}</p>
      
      {question.selectedText && (
        <div className="mt-2 pt-2 border-t border-base-300">
          <p className="text-xs text-base-content/60 mb-1">Selected Text:</p>
          <p className="text-xs text-base-content/70 italic line-clamp-2">
            &ldquo;{question.selectedText}&rdquo;
          </p>
        </div>
      )}
      
      {question.pageNumber && (
        <div className="mt-2">
          <span className="text-xs text-base-content/60">
            Page {question.pageNumber}
          </span>
        </div>
      )}
    </>
  );

  return (
    <DeleteModal
      title="Delete Question"
      itemPreview={itemPreview}
      warningMessage="Are you sure you want to delete this question? This action cannot be undone and will permanently remove the question and any associated answers."
      confirmButtonText="Delete Question"
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
    />
  );
}

