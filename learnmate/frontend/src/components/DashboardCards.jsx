export function StatCard({ icon: Icon, value, label, tone }) {
  return (
    <div className={`card stat ${tone ? `stat--${tone}` : ""}`}>
      <span className="stat__icon"><Icon size={22} aria-hidden="true" /></span>
      <div>
        <div className="stat__value">{value}</div>
        <div className="stat__label">{label}</div>
      </div>
    </div>
  );
}
