export default function ErrorStat({ error, onRetry }) {
  return (
    <div className="bg-error/10 border border-error rounded-xl p-6">
      <p className="text-error">{error}</p>
      <button onClick={onRetry} className="btn btn-error btn-sm mt-4">
        Try Again
      </button>
    </div>
  );
}
