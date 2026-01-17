export default function NoData({ label, description }) {
  return (
    <div className="bg-base-300 rounded-xl p-6">
      <p className="text-base-content/70">{label}</p>
      <p className="text-sm text-base-content/50 mt-2">{description}</p>
    </div>
  );
}
