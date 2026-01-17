/**
 * HourlyChart - Display reading activity by hour
 */
function HourlyChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-base-content/50 text-sm">No data available</p>;
  }

  const maxTime = Math.max(...data.map((h) => h.totalTime), 1);

  return (
    <div className="grid grid-cols-12 gap-1 h-32">
      {data.map((hour) => {
        const height = maxTime > 0 ? (hour.totalTime / maxTime) * 100 : 0;
        return (
          <div
            key={hour.hour}
            className="flex flex-col items-center justify-end"
            title={`${hour.hourFormatted}: ${hour.totalTime}s (${hour.sessionCount} sessions)`}
          >
            <div
              className="w-full bg-primary rounded-t transition-all"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            {hour.hour % 4 === 0 && (
              <span className="text-xs text-base-content/50 mt-1">
                {hour.hour}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default HourlyChart;
