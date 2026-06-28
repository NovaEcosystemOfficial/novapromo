const LABELS = {
  draft: 'Bozza',
  scheduled: 'Programmato',
  published: 'Pubblicato',
  error: 'Errore',
};

export default function StatusBadge({ status, size }) {
  return (
    <span className={`status-badge status-${status}${size === 'sm' ? ' status-badge--sm' : ''}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {LABELS[status] || status}
    </span>
  );
}
