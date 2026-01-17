/**
 * ProgressBar - Simple progress bar component
 */
function ProgressBar({ value, colorClass = "bg-neutral", label, description }) {
  return (
    <div>
      <div className="pt-4">
        {/* Label and Value */}
        <div className="flex justify-between text-sm mb-2">
          {label && (
            <span className="text-base-content/70" title={label}>
              {label}
            </span>
          )}
          <span className="font-medium">{value || 0}%</span>
        </div>
        {/* Progress Bar */}
        <div className="w-full bg-neutral/7 rounded-full h-4">
          <div
            className={`${colorClass} h-4 rounded-full transition-all`}
            style={{ width: `${value || 0}%` }}
          />
        </div>
        {description && (
          <p className="text-xs text-base-content/50 mt-2 text-center">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default ProgressBar;
