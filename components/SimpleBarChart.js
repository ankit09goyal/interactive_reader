import ProgressBar from "@/components/ProgressBar";
/**
 * SimpleBarChart - Simple horizontal bar chart
 */
function SimpleBarChart({
  data,
  labelKey,
  valueKey,
  colorClass = "bg-primary",
  maxItems = 10,
}) {
  if (!data || data.length === 0) {
    return <p className="text-base-content/50 text-sm">No data available</p>;
  }

  const items = data.slice(0, maxItems);
  const maxValue = Math.max(...items.map((item) => item[valueKey]), 1);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <ProgressBar
          key={index}
          value={item[valueKey]}
          max={maxValue}
          colorClass={colorClass}
          label={item[labelKey]}
          showValue={false}
        />
      ))}
    </div>
  );
}

export default SimpleBarChart;
