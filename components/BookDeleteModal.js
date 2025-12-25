"use client";

import DeleteModal from "./DeleteModal";

export default function BookDeleteModal({
  book,
  onClose,
  onConfirm,
  isDeleting,
}) {
  const itemPreview = (
    <>
      <h4 className="font-semibold">{book.title}</h4>
      <p className="text-sm text-base-content/70">by {book.author}</p>
      <div className="flex gap-2 mt-2">
        <span className="badge badge-sm">
          {book.fileType ||
            (book.mimeType === "application/pdf" ? "PDF" : "EPUB")}
        </span>
        <span className="badge badge-sm ">{book.fileSizeFormatted}</span>
      </div>
    </>
  );

  return (
    <DeleteModal
      title="Delete Book"
      itemPreview={itemPreview}
      warningMessage="Are you sure you want to delete this book? This will permanently remove the book and its file from the system."
      confirmButtonText="Delete Book"
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
    />
  );
}
