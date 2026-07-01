import { CUSTOM_PROJECT_ID } from '../../hooks/useBrandProjects.js';

export default function ProjectPicker({
  brands,
  loading,
  brandId,
  customProject,
  onSelectBrand,
  onCustomProjectChange,
}) {
  if (loading) {
    return <p className="generator-muted">Caricamento progetti…</p>;
  }

  if (!brands?.length) {
    return (
      <div className="generator-empty-projects">
        <p>Nessun progetto nel brand store.</p>
        <button
          type="button"
          className={`modal-chip${brandId === CUSTOM_PROJECT_ID ? ' selected' : ''}`}
          onClick={() => onSelectBrand(CUSTOM_PROJECT_ID)}
        >
          Altro progetto
        </button>
        {brandId === CUSTOM_PROJECT_ID && (
          <input
            className="generator-custom-project"
            value={customProject}
            onChange={(e) => onCustomProjectChange(e.target.value)}
            placeholder="Nome progetto personalizzato"
            autoFocus
          />
        )}
      </div>
    );
  }

  return (
    <div className="project-picker">
      <div className="modal-grid">
        {brands.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`modal-chip${brandId === b.brandId ? ' selected' : ''}`}
            style={{ '--chip-color': b.color }}
            onClick={() => onSelectBrand(b.brandId, b.name)}
          >
            <span className="modal-chip-dot" />
            {b.name}
          </button>
        ))}
        <button
          type="button"
          className={`modal-chip${brandId === CUSTOM_PROJECT_ID ? ' selected' : ''}`}
          onClick={() => onSelectBrand(CUSTOM_PROJECT_ID)}
        >
          Altro progetto
        </button>
      </div>
      {brandId === CUSTOM_PROJECT_ID && (
        <input
          className="generator-custom-project"
          value={customProject}
          onChange={(e) => onCustomProjectChange(e.target.value)}
          placeholder="Es. Nuovo prodotto, campagna estate…"
          autoFocus
        />
      )}
    </div>
  );
}
