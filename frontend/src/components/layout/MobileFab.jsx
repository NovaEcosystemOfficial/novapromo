export default function MobileFab({ onClick, label = 'Nuovo contenuto' }) {
  return (
    <button
      type="button"
      className="mobile-fab"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span aria-hidden>+</span>
    </button>
  );
}
