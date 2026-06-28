export default function StatCard({ variant, label, value, icon, subtitle, raw }) {
  return (
    <div className={`dash-stat-card dash-stat-card--${variant}`}>
      <div className="dash-stat-top">
        <span className="dash-stat-label">{label}</span>
        <div className="dash-stat-icon">{icon}</div>
      </div>
      <div className={`dash-stat-value${raw ? ' dash-stat-value--raw' : ''}`}>{value}</div>
      {subtitle && <div className="dash-stat-total">{subtitle}</div>}
    </div>
  );
}
