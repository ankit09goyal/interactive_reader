/**
 * ProgressBar - Simple progress bar component
 */
function ProgressBar({
  value,
  max,
  colorClass = "bg-primary",
  label,
  showValue = true,
}) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span
          className="w-24 text-sm text-base-content/70 truncate"
          title={label}
        >
          {label}
        </span>
      )}
      <div className="flex-1 bg-base-300 rounded-full h-4">
        <div
          className={`${colorClass} h-4 rounded-full flex items-center justify-end pr-2`}
          style={{
            width: `${Math.max(percentage, showValue && value > 0 ? 10 : 0)}%`,
          }}
        >
          {showValue && value > 0 && (
            <span className="text-xs font-semibold text-white">{value}</span>
          )}
        </div>
      </div>
      {!showValue && (
        <span className="text-xs text-base-content/50 w-12 text-right">
          {value}
        </span>
      )}
    </div>
  );
}

export default ProgressBar;
