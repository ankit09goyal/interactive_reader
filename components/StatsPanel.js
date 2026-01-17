/**
 * StatsPanel - Reusable panel component for displaying multiple statistics in a list
 *
 * @param {string} title - The title of the panel
 * @param {Array} stats - Array of stat objects with { label, value, valueColorClass }
 * @param {React.ReactNode} footer - Optional footer content (e.g., progress bar)
 * @param {string} bgClass - Optional background class (defaults to "bg-base-300")
 */
function StatsPanel({ title, stats = [], footer, bgClass = "bg-base-300" }) {
  return (
    <div className={`${bgClass} rounded-xl p-6`}>
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <div className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-base-content/70">{stat.label}</span>
            <span
              className={`font-semibold text-lg ${stat.valueColorClass || ""}`}
            >
              {stat.value}
            </span>
          </div>
        ))}
        {footer && <div className="pt-4">{footer}</div>}
      </div>
    </div>
  );
}

export default StatsPanel;
