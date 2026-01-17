/**
 * StatCard - Reusable stat card component
 */
function StatCard({ title, value, subtitle, colorClass = "text-primary" }) {
  return (
    <div className="bg-base-200 rounded-xl p-6 border border-base-300">
      <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-sm text-base-content/70 mt-1">{title}</div>
      {subtitle && (
        <div className="text-xs text-base-content/50 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

export default StatCard;
